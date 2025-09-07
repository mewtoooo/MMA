from flask import Flask, request, jsonify, session, redirect, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import os
import json
from datetime import datetime
import openai

# Configuration
APP_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(APP_DIR, 'users.db')


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """
    )
    conn.commit()
    conn.close()


app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-change-me')


# Initialize OpenAI
openai.api_key = "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"

# Initialize DB once at startup for Flask 3
with app.app_context():
    init_db()


def current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    conn = get_db_connection()
    user = conn.execute('SELECT id, email, name, created_at FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    return user


@app.route('/')
def index():
    if not session.get('user_id'):
        return redirect('/login')
    return send_from_directory(APP_DIR, 'index.html')


@app.route('/login')
def login_page():
    return send_from_directory(APP_DIR, 'login.html')


@app.route('/signup')
def signup_page():
    return send_from_directory(APP_DIR, 'signup.html')


@app.route('/profile')
def profile_page():
    return send_from_directory(APP_DIR, 'profile.html')


@app.route('/dashboard')
def dashboard():
    if not session.get('user_id'):
        return redirect('/login')
    return send_from_directory(APP_DIR, 'dashboard.html')


# Auth API
@app.post('/api/auth/signup')
def signup():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    name = (data.get('name') or '').strip()
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    password_hash = generate_password_hash(password)
    created_at = datetime.utcnow().isoformat()
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)',
                    (email, name, password_hash, created_at))
        conn.commit()
        user_id = cur.lastrowid
        conn.close()
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Email already registered'}), 409
    session['user_id'] = user_id
    return jsonify({'ok': True})


@app.post('/api/auth/login')
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    conn = get_db_connection()
    user = conn.execute('SELECT id, password_hash FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid credentials'}), 401
    session['user_id'] = user['id']
    return jsonify({'ok': True})


@app.post('/api/auth/logout')
def logout():
    session.clear()
    return jsonify({'ok': True})


@app.get('/api/auth/me')
def me():
    user = current_user()
    if not user:
        return jsonify({'authenticated': False})
    return jsonify({
        'authenticated': True,
        'user': {
            'id': user['id'],
            'email': user['email'],
            'name': user['name'],
            'created_at': user['created_at']
        }
    })


# Budget Calculation API - AI-Powered Only


# All savings allocation is now handled by the main AI budget function


def generate_smart_budget_allocation(salary: float,
                                   fixed_expenses: float | None,
                                   lifestyle: str | None,
                                   age_group: str | None,
                                   risk_appetite: str | None,
                                   location: str | None,
                                   goal: str | None):
    """Smart budget allocation with intelligent rules and AI fallback."""
    
    # First, try AI allocation
    try:
        return generate_ai_budget_allocation(salary, fixed_expenses, lifestyle, age_group, risk_appetite, location, goal)
    except Exception as e:
        print(f"AI allocation failed: {e}")
        # Fallback to smart rule-based allocation
        return generate_rule_based_allocation(salary, fixed_expenses, lifestyle, age_group, risk_appetite, location, goal)


def generate_ai_budget_allocation(salary: float,
                                fixed_expenses: float | None,
                                lifestyle: str | None,
                                age_group: str | None,
                                risk_appetite: str | None,
                                location: str | None,
                                goal: str | None):
    """AI-powered budget allocation."""
    prompt = f"""
    Create a monthly budget for an Indian user. Return ONLY valid JSON.

    Profile: Salary ₹{salary:,}, Fixed Expenses ₹{fixed_expenses or 0:,}, Location: {location or 'Not specified'}, Lifestyle: {lifestyle or 'medium'}, Age: {age_group or 'Not specified'}, Risk: {risk_appetite or 'medium'}, Goal: {goal or 'General savings'}

    JSON format:
    {{
        "needs": amount,
        "wants": amount,
        "savings": amount,
        "reasoning": "Brief explanation",
        "savings_breakdown": {{
            "emergency_fund": amount,
            "mutual_funds": amount,
            "high_risk_investments": amount,
            "safe_assets": amount,
            "growth_assets": amount
        }},
        "monthly_tips": ["Tip 1", "Tip 2", "Tip 3"]
    }}

    Rules:
    - Sum must equal ₹{int(round(salary))}
    - For salary < ₹50,000: needs 50-60%, wants 25-35%, savings 15-25%
    - For salary ≥ ₹50,000: needs 40-55%, wants 20-30%, savings 25-40%
    - Consider location cost of living
    - Age-appropriate risk levels
    """

    try:
        resp = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a financial advisor. Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=400,
            temperature=0.3,
        )
        content = resp.choices[0].message.content.strip()
        data = json.loads(content)

        # Validate and fix amounts
        needs = int(round(float(data.get("needs", 0))))
        wants = int(round(float(data.get("wants", 0))))
        savings = int(round(float(data.get("savings", 0))))

        # Ensure sum equals salary exactly
        total = needs + wants + savings
        if total != salary:
            # Adjust proportionally first
            if total > 0:
                needs = int(round((needs / total) * salary))
                wants = int(round((wants / total) * salary))
                savings = int(salary - needs - wants)
            else:
                needs = int(round(salary * 0.5))
                wants = int(round(salary * 0.3))
                savings = int(salary - needs - wants)
            
            # Final exact adjustment
            total = needs + wants + savings
            if total != salary:
                # Adjust savings to make total exact
                savings = int(salary - needs - wants)
                total = needs + wants + savings
                
                # If still not exact, adjust wants
                if total != salary:
                    wants = int(salary - needs - savings)
                    total = needs + wants + savings
                    
                # Final check - if still not exact, adjust needs
                if total != salary:
                    needs = int(salary - wants - savings)

        # Process savings breakdown
        savings_breakdown = data.get("savings_breakdown", {})
        if savings > 0 and savings_breakdown:
            total_breakdown = sum(savings_breakdown.values())
            if total_breakdown > 0:
                for key, value in savings_breakdown.items():
                    savings_breakdown[key] = int(round((value / total_breakdown) * savings))

        return {
            "needs": needs,
            "wants": wants,
            "savings": savings,
            "reasoning": data.get("reasoning", "AI-optimized budget allocation"),
            "savings_breakdown": savings_breakdown,
            "monthly_tips": data.get("monthly_tips", [])
        }
    except Exception as e:
        raise RuntimeError(f"AI allocation failed: {e}")


def generate_rule_based_allocation(salary: float,
                                 fixed_expenses: float | None,
                                 lifestyle: str | None,
                                 age_group: str | None,
                                 risk_appetite: str | None,
                                 location: str | None,
                                 goal: str | None):
    """Intelligent rule-based budget allocation."""
    
    # Determine cost of living level
    high_col_states = ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Haryana', 'Telangana']
    low_col_states = ['Bihar', 'Jharkhand', 'Odisha', 'Assam', 'Chhattisgarh', 'Madhya Pradesh']
    
    coli_level = 'medium'
    if location in high_col_states:
        coli_level = 'high'
    elif location in low_col_states:
        coli_level = 'low'
    
    # Base allocation based on salary
    if salary < 30000:
        # Very low salary - focus on needs
        needs_pct = 0.70
        wants_pct = 0.20
        savings_pct = 0.10
    elif salary < 50000:
        # Low salary - balanced
        needs_pct = 0.60
        wants_pct = 0.25
        savings_pct = 0.15
    elif salary < 100000:
        # Medium salary - more flexibility
        needs_pct = 0.50
        wants_pct = 0.25
        savings_pct = 0.25
    else:
        # High salary - more savings
        needs_pct = 0.45
        wants_pct = 0.25
        savings_pct = 0.30
    
    # Adjust for cost of living
    if coli_level == 'high':
        needs_pct += 0.05
        wants_pct -= 0.03
        savings_pct -= 0.02
    elif coli_level == 'low':
        needs_pct -= 0.05
        wants_pct += 0.03
        savings_pct += 0.02
    
    # Adjust for lifestyle
    if lifestyle == 'low':
        wants_pct -= 0.05
        savings_pct += 0.05
    elif lifestyle == 'high':
        wants_pct += 0.05
        savings_pct -= 0.05
    
    # Adjust for fixed expenses
    if fixed_expenses and fixed_expenses > 0:
        fixed_pct = fixed_expenses / salary
        if fixed_pct > needs_pct:
            # Fixed expenses exceed normal needs allocation
            needs_pct = min(fixed_pct + 0.05, 0.70)  # Cap at 70%
            # Reduce wants and savings proportionally
            remaining = 1 - needs_pct
            wants_pct = remaining * 0.6
            savings_pct = remaining * 0.4
    
    # Calculate amounts with exact total
    needs = int(round(salary * needs_pct))
    wants = int(round(salary * wants_pct))
    savings = int(salary - needs - wants)  # Ensure exact total
    
    # Fix any rounding discrepancies
    total = needs + wants + savings
    if total != salary:
        # Adjust savings to make total exact
        savings = int(salary - needs - wants)
        total = needs + wants + savings
        
        # If still not exact, adjust wants
        if total != salary:
            wants = int(salary - needs - savings)
            total = needs + wants + savings
            
        # Final check - if still not exact, adjust needs
        if total != salary:
            needs = int(salary - wants - savings)
    
    # Generate savings breakdown based on age and risk
    savings_breakdown = generate_savings_breakdown(savings, age_group, risk_appetite)
    
    # Generate reasoning
    reasoning = generate_reasoning(salary, needs, wants, savings, location, coli_level, lifestyle, age_group)
    
    # Generate tips
    monthly_tips = generate_monthly_tips(salary, location, age_group, goal)
    
    return {
        "needs": needs,
        "wants": wants,
        "savings": savings,
        "reasoning": reasoning,
        "savings_breakdown": savings_breakdown,
        "monthly_tips": monthly_tips
    }


def generate_savings_breakdown(savings: int, age_group: str | None, risk_appetite: str | None):
    """Generate savings allocation based on age and risk profile."""
    if savings <= 0:
        return {}
    
    # Age-based allocation
    if age_group in ['student', 'early']:
        # Young: more risk, less emergency fund
        emergency = 0.10
        mutual_funds = 0.40
        high_risk = 0.30
        safe_assets = 0.20
    elif age_group in ['family', 'mid']:
        # Family: balanced approach
        emergency = 0.20
        mutual_funds = 0.35
        high_risk = 0.20
        safe_assets = 0.25
    elif age_group in ['pre-retire', 'retired']:
        # Older: more safe assets
        emergency = 0.15
        mutual_funds = 0.30
        high_risk = 0.10
        safe_assets = 0.45
    else:
        # Default balanced
        emergency = 0.15
        mutual_funds = 0.35
        high_risk = 0.25
        safe_assets = 0.25
    
    # Risk adjustment
    if risk_appetite == 'low':
        high_risk -= 0.10
        safe_assets += 0.10
    elif risk_appetite == 'high':
        high_risk += 0.10
        safe_assets -= 0.10
    
    # Calculate amounts
    return {
        "emergency_fund": int(round(savings * emergency)),
        "mutual_funds": int(round(savings * mutual_funds)),
        "high_risk_investments": int(round(savings * high_risk)),
        "safe_assets": int(round(savings * safe_assets)),
        "growth_assets": int(round(savings * (1 - emergency - mutual_funds - high_risk - safe_assets)))
    }


def generate_reasoning(salary: int, needs: int, wants: int, savings: int, location: str | None, coli_level: str, lifestyle: str | None, age_group: str | None):
    """Generate personalized reasoning for budget allocation."""
    needs_pct = round((needs / salary) * 100)
    wants_pct = round((wants / salary) * 100)
    savings_pct = round((savings / salary) * 100)
    
    reasoning_parts = []
    
    # Location reasoning
    if coli_level == 'high':
        reasoning_parts.append(f"Given your location in {location or 'a metro city'}, we've allocated {needs_pct}% for needs to account for higher living costs.")
    elif coli_level == 'low':
        reasoning_parts.append(f"Since you're in {location or 'a smaller city'}, we've optimized your budget with {needs_pct}% for needs, allowing more for wants and savings.")
    else:
        reasoning_parts.append(f"Your {needs_pct}% needs allocation is balanced for your location's cost of living.")
    
    # Lifestyle reasoning
    if lifestyle == 'low':
        reasoning_parts.append(f"With a conservative lifestyle preference, you're saving {savings_pct}% monthly for future goals.")
    elif lifestyle == 'high':
        reasoning_parts.append(f"Your lifestyle preference allows for {wants_pct}% wants while maintaining {savings_pct}% savings.")
    else:
        reasoning_parts.append(f"Your balanced approach allocates {wants_pct}% for wants and {savings_pct}% for savings.")
    
    # Age reasoning
    if age_group in ['student', 'early']:
        reasoning_parts.append("As someone starting their career, this allocation builds good financial habits while allowing some lifestyle flexibility.")
    elif age_group in ['family']:
        reasoning_parts.append("With family responsibilities, this allocation ensures stability while building long-term wealth.")
    elif age_group in ['pre-retire']:
        reasoning_parts.append("This allocation focuses on wealth preservation and steady growth as you approach retirement.")
    
    return " ".join(reasoning_parts)


def generate_monthly_tips(salary: int, location: str | None, age_group: str | None, goal: str | None):
    """Generate personalized monthly tips."""
    tips = []
    
    if salary < 50000:
        tips.append("Track every expense to identify savings opportunities")
        tips.append("Consider part-time work or skill development to increase income")
    else:
        tips.append("Automate your savings to ensure consistent wealth building")
        tips.append("Review and optimize your investments quarterly")
    
    if location in ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi']:
        tips.append("Look for cost-saving opportunities in metro living (shared transport, home cooking)")
    
    if age_group in ['student', 'early']:
        tips.append("Start investing early - even small amounts compound significantly over time")
    elif age_group in ['family']:
        tips.append("Build an emergency fund covering 6 months of expenses")
    
    if goal and 'house' in goal.lower():
        tips.append("Consider ELSS mutual funds for tax benefits while saving for your home")
    elif goal and 'car' in goal.lower():
        tips.append("Set up a separate savings account specifically for your car purchase")
    
    return tips[:3]  # Return max 3 tips

# This function is now handled by the main AI budget function



@app.get('/api/openai/test')
def openai_key_test():
    """Quick check to verify OpenAI API key works from this server."""
    try:
        resp = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=1,
            temperature=0.0,
        )
        return jsonify({
            'ok': True,
            'model': getattr(resp, 'model', 'gpt-3.5-turbo'),
            'usage': getattr(resp, 'usage', None)
        })
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.post('/api/budget/calculate')
def calculate_budget():
    data = request.get_json(silent=True) or {}
    salary = data.get('salary', 0)
    goal = data.get('goal', '')
    fixed_expenses = data.get('fixed_expenses')
    lifestyle = data.get('lifestyle')  # low/medium/high
    age_group = data.get('age_group')  # student/professional/family/retired
    risk_appetite = data.get('risk_appetite')  # low/medium/high
    location = data.get('location')
    
    # Use smart budget allocation (AI + intelligent fallback)
    try:
        salary = float(salary)
        if salary <= 0:
            return jsonify({'error': 'Salary must be a positive number'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid salary value'}), 400
    
    try:
        ai_result = generate_smart_budget_allocation(
            salary=salary,
            fixed_expenses=(float(fixed_expenses) if fixed_expenses is not None else None),
            lifestyle=lifestyle,
            age_group=age_group,
            risk_appetite=risk_appetite,
            location=location,
            goal=goal,
        )
        
        needs = ai_result["needs"]
        wants = ai_result["wants"]
        savings = ai_result["savings"]
        
        # Helper function for percentages
        def get_percentage(amount):
            return int(round((amount / salary) * 100)) if salary else 0

        budget_data = {
            'salary': salary,
            'goal': goal,
            'inputs': {
        'location': location,
        'fixed_expenses': float(fixed_expenses) if fixed_expenses is not None else None,
        'lifestyle': lifestyle,
        'age_group': age_group,
        'risk_appetite': risk_appetite,
            },
        'distribution': {
            'needs': {
                'amount': needs,
                'percentage': get_percentage(needs)
            },
            'wants': {
                'amount': wants,
                'percentage': get_percentage(wants)
            },
            'savings': {
                'amount': savings,
                'percentage': get_percentage(savings),
                    'breakdown': ai_result.get('savings_breakdown', {})
            }
        },
        'reasoning': ai_result.get('reasoning', 'AI-optimized budget allocation'),
        'monthly_tips': ai_result.get('monthly_tips', [])
    }
        
        return jsonify(budget_data)
        
    except Exception as e:
        return jsonify({'error': f'Budget calculation failed: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=True)

