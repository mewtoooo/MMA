// Smooth scroll to features
document.getElementById('learn-more')?.addEventListener('click', () => {
  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
});

// Get Started buttons focus quick preview
function focusQuickPreview() {
  document.getElementById('salary')?.focus({ preventScroll: false });
}
document.getElementById('get-started-hero')?.addEventListener('click', focusQuickPreview);
document.getElementById('get-started-top')?.addEventListener('click', focusQuickPreview);

// Location dropdown with all Indian states - no JavaScript array needed

// Quick preview calculation with visual dashboard output
document.addEventListener('DOMContentLoaded', function() {
  const previewForm = document.getElementById('quick-preview-form');
  const previewResult = document.getElementById('preview-result');
  
  // Wants slider live hint
  const wantsLevelElInit = document.getElementById('wants-level');
  const wantsHintEl = document.getElementById('wants-hint');
  function updateWantsHint(level) {
    if (!wantsHintEl) return;
    if (level === 0) wantsHintEl.textContent = 'More saving month: Wants ≈ 22%, Savings ≈ 22%';
    else if (level === 2) wantsHintEl.textContent = 'More wants month: Wants ≈ 38%, Savings ≈ 8%';
    else wantsHintEl.textContent = 'Balanced month: Wants ≈ 30%, Savings ≈ 14%';
  }
  if (wantsLevelElInit) {
    updateWantsHint(Number(wantsLevelElInit.value));
    wantsLevelElInit.addEventListener('input', (e) => updateWantsHint(Number(e.target.value)));
    wantsLevelElInit.addEventListener('change', (e) => updateWantsHint(Number(e.target.value)));
  }

  // Location dropdown functionality - no special handling needed as it's a standard select
  
  console.log('DOM loaded, previewForm:', previewForm);
  console.log('DOM loaded, previewResult:', previewResult);
  
  if (previewForm) {
    previewForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log('Form submitted');
      
      const salaryEl = document.getElementById('salary');
      const goalEl = document.getElementById('goal');
      const fixedEl = document.getElementById('fixed-expenses');
      const wantsLevelEl = document.getElementById('wants-level');
      const ageStageEl = document.getElementById('age-stage');
      const riskEl = document.getElementById('risk');
      const locationEl = document.getElementById('location');
      const salary = Number(salaryEl && salaryEl.value.replace(/[^\d]/g, '')) || 0;
      const goal = goalEl && goalEl.value;
      const fixed = Number(fixedEl && fixedEl.value.replace(/[^\d]/g, '')) || 0;
      const wantsLevel = Number(wantsLevelEl && wantsLevelEl.value);
      const ageStage = ageStageEl && ageStageEl.value;
      const risk = riskEl && riskEl.value;
      
      // Get selected state from dropdown
      const location = locationEl && locationEl.value ? locationEl.value : null;
      
      console.log('Salary:', salary, 'Goal:', goal, 'Fixed:', fixed, 'WantsLevel:', wantsLevel, 'AgeStage:', ageStage, 'Risk:', risk, 'Location:', location);
      
      if (!salary || !goal) {
        console.log('Missing salary or goal');
        return;
      }
      
      // Hide the input form
      const formElement = document.getElementById('quick-preview-form');
      if (formElement) {
        formElement.style.display = 'none';
      }
      
      // Map frontend values to API parameters
      const lifestyleMap = { 0: 'low', 1: 'medium', 2: 'high' };
      const lifestyle = lifestyleMap[wantsLevel] || 'medium';
      
      // Call Python API for budget calculation
      try {
        const response = await fetch('/api/budget/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            salary: salary,
            goal: goal,
            fixed_expenses: fixed || null,
            lifestyle: lifestyle,
            age_group: ageStage || null,
            risk_appetite: risk || null,
            location: location || null
          })
        });
        
        if (!response.ok) {
          throw new Error('API call failed');
        }
        
        const budgetData = await response.json();
        console.log('API Response:', budgetData);
        
        // Extract values from API response
        const needs = budgetData.distribution.needs.amount;
        const wants = budgetData.distribution.wants.amount;
        const savings = budgetData.distribution.savings.amount;
        const entertainment = 0; // API doesn't return entertainment, it's included in wants
        const savingsAllocation = budgetData.distribution.savings.allocation;
        const justification = budgetData.justification;
        
        // Show the dashboard with API data
        showBudgetDashboard(salary, needs, wants, savings, entertainment, savingsAllocation, budgetData, justification);
        
      } catch (error) {
        console.error('Error calling API:', error);
        // Fallback to client-side calculation if API fails
        const wantsPct = wantsLevel === 0 ? 0.22 : wantsLevel === 1 ? 0.30 : 0.38;
        const savingsPct = wantsLevel === 0 ? 0.22 : wantsLevel === 1 ? 0.14 : 0.08;
        const needsPct = 0.50;
        const entertainmentPct = Math.max(0, 1 - (needsPct + wantsPct + savingsPct));

        let plannedNeeds = Math.round(salary * needsPct);
        let plannedWants = Math.round(salary * wantsPct);
        let plannedSavings = Math.round(salary * savingsPct);
        let plannedEntertainment = Math.round(salary * entertainmentPct);

        if (fixed > plannedNeeds) {
          const shortfall = fixed - plannedNeeds;
          let reduce = Math.min(shortfall, plannedWants);
          plannedWants -= reduce;
          let remaining = shortfall - reduce;
          if (remaining > 0) {
            reduce = Math.min(remaining, plannedEntertainment);
            plannedEntertainment -= reduce;
            remaining -= reduce;
          }
          if (remaining > 0) {
            plannedSavings = Math.max(0, plannedSavings - remaining);
          }
          plannedNeeds = fixed;
        }

        const needs = plannedNeeds;
        const wants = plannedWants;
        const savings = plannedSavings;
        const entertainment = plannedEntertainment;
        
        showBudgetDashboard(salary, needs, wants, savings, entertainment, null, null, null);
      }
    });
  } else {
    console.error('preview-form element not found');
  }
});

// Function to show budget dashboard with API data
function showBudgetDashboard(salary, needs, wants, savings, entertainment, savingsAllocation, budgetData, justification) {
  const previewResult = document.getElementById('preview-result');
  if (!previewResult) return;
  
  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  
  // Create dashboard HTML with API data
  const dashboardHTML = `
         <div class="budget-dashboard">
           <div class="income-card">
             <div class="income-amount">${fmt(salary)}</div>
             <div class="income-label">Your Monthly Income Flow</div>
             ${budgetData ? `<div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 8px;">
               COLI: ${budgetData.inputs.coli.toUpperCase()} | Location: ${budgetData.inputs.location || 'Not specified'}
             </div>` : ''}
           </div>
           
           <div class="flow-lines">
             <div class="flow-line needs-line"></div>
             <div class="flow-line wants-line"></div>
             <div class="flow-line savings-line"></div>
           </div>
           
          <!-- Box 1: Overall Budget Allocation -->
          <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 14px; padding: 16px; margin-top: 12px;">
            <h3 style="margin: 0 0 12px 0; color: #e5e7eb; font-size: 16px;">Overall Budget Allocation</h3>
            <div class="budget-cards">
              <div class="budget-card needs-card">
                <div class="card-icon">🏠</div>
                <div class="card-amount">${fmt(needs)}</div>
                <div class="card-category">Needs</div>
                <div class="progress-circle needs-progress">
                  <div class="progress-fill" style="--progress: ${Math.round((needs / salary) * 100)}%"></div>
                  <span class="progress-text">${Math.round((needs / salary) * 100)}%</span>
                </div>
              </div>
              
              <div class="budget-card wants-card">
                <div class="card-icon">🍔</div>
                <div class="card-amount">${fmt(wants)}</div>
                <div class="card-category">Wants</div>
                <div class="progress-circle wants-progress">
                  <div class="progress-fill" style="--progress: ${Math.round((wants / salary) * 100)}%"></div>
                  <span class="progress-text">${Math.round((wants / salary) * 100)}%</span>
                </div>
              </div>
              
              <div class="budget-card savings-card">
                <div class="card-icon">💰</div>
                <div class="card-amount">${fmt(savings)}</div>
                <div class="card-category">Savings</div>
                <div class="progress-circle savings-progress">
                  <div class="progress-fill" style="--progress: ${Math.round((savings / salary) * 100)}%"></div>
                  <span class="progress-text">${Math.round((savings / salary) * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
           
          ${justification ? `
          <!-- Separate Box: Budget Justification (outside overall budget box) -->
          <div class="budget-justification-box" style="background: rgba(17,24,39,0.6); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 18px; margin-top: 16px;">
            <h3 style="color: #e5e7eb; margin: 0 0 10px 0; font-size: 16px;">
              Budget Justification
            </h3>
            <p style="color: rgba(255,255,255,0.9); font-size: 15px; line-height: 1.6; margin: 0;">
              ${justification}
            </p>
          </div>
          ` : ''}

           
           <div class="view-options">
             <span class="view-option active" data-view="flow">Flow View</span>
             <span class="view-option" data-view="pie">Pie View</span>
             <span class="view-option" data-view="list">List</span>
           </div>
           
           <!-- Pie Chart Container -->
           <div class="pie-chart-container" style="display: none;">
             <canvas id="budgetPieChart" width="400" height="400"></canvas>
             <div class="pie-legend">
               <div class="legend-item">
                 <div class="legend-color needs-color"></div>
                 <span class="legend-text">Needs (${Math.round((needs / salary) * 100)}%)</span>
               </div>
               <div class="legend-item">
                 <div class="legend-color wants-color"></div>
                 <span class="legend-text">Wants (${Math.round((wants / salary) * 100)}%)</span>
               </div>
               <div class="legend-item">
                 <div class="legend-color savings-color"></div>
                 <span class="legend-text">Savings (${Math.round((savings / salary) * 100)}%)</span>
               </div>
             </div>
           </div>
         </div>
       `;
  
  previewResult.innerHTML = dashboardHTML;
  console.log('Dashboard created with API data');
  
  // Add view switching functionality
  setTimeout(() => {
    const viewOptions = document.querySelectorAll('.view-option');
    const budgetCards = document.querySelector('.budget-cards');
    const flowLines = document.querySelector('.flow-lines');
    const pieChartContainer = document.querySelector('.pie-chart-container');
    
    viewOptions.forEach(option => {
      option.addEventListener('click', function() {
        const view = this.getAttribute('data-view');
        
        // Remove active class from all options
        viewOptions.forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        
        if (view === 'flow') {
          budgetCards.style.display = 'grid';
          flowLines.style.display = 'block';
          pieChartContainer.style.display = 'none';
          // Hide any existing list view
          const existingList = document.querySelector('.list-view');
          if (existingList) {
            existingList.style.display = 'none';
          }
        } else if (view === 'pie') {
          budgetCards.style.display = 'none';
          flowLines.style.display = 'none';
          pieChartContainer.style.display = 'flex';
          // Hide any existing list view
          const existingList = document.querySelector('.list-view');
          if (existingList) {
            existingList.style.display = 'none';
          }
          drawPieChart(salary, needs, wants, savings, 0);
        } else if (view === 'list') {
          budgetCards.style.display = 'none';
          flowLines.style.display = 'none';
          pieChartContainer.style.display = 'none';
          showListView(salary, needs, wants, savings, 0);
        }
      });
    });
  }, 100);
}

// Function to draw pie chart
function drawPieChart(salary, needs, wants, savings, entertainment) {
  const canvas = document.getElementById('budgetPieChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 140;
  
  const data = [
    { value: needs, color: '#10b981', label: 'Needs', percentage: Math.round((needs / salary) * 100) + '%' },
    { value: wants, color: '#8b5cf6', label: 'Wants', percentage: Math.round((wants / salary) * 100) + '%' },
    { value: savings, color: '#3b82f6', label: 'Savings', percentage: Math.round((savings / salary) * 100) + '%' }
  ];
  
  let currentAngle = -Math.PI / 2; // Start from top
  const slices = [];
  
  // Draw slices with modern styling
  data.forEach((item, index) => {
    const sliceAngle = (item.value / salary) * 2 * Math.PI;
    const gap = 0.03; // Gap between slices
    
    // Store slice data for hover detection
    slices.push({
      startAngle: currentAngle + gap/2,
      endAngle: currentAngle + sliceAngle - gap/2,
      color: item.color,
      label: item.label,
      value: item.value,
      percentage: item.percentage,
      index: index
    });
    
    // Draw slice
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle + gap/2, currentAngle + sliceAngle - gap/2);
    ctx.closePath();
    
    // Modern gradient fill
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, item.color);
    gradient.addColorStop(1, adjustBrightness(item.color, -20));
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Modern border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    currentAngle += sliceAngle;
  });
  
  // Add center circle with modern styling
  ctx.beginPath();
  ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fill();
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Center text
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 20px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('₹' + salary.toLocaleString('en-IN'), centerX, centerY + 6);
  
  // Store slices globally for hover detection
  window.pieSlices = slices;
  window.pieCenterX = centerX;
  window.pieCenterY = centerY;
  window.pieRadius = radius;
  
  // Add smooth hover functionality
  let hoveredSlice = null;
  let animationFrame = null;
  
  canvas.addEventListener('mousemove', (e) => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    
    animationFrame = requestAnimationFrame(() => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Check if mouse is within pie chart circle
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      
      if (distance <= radius) {
        // Calculate angle from center
        let angle = Math.atan2(y - centerY, x - centerX);
        if (angle < 0) angle += 2 * Math.PI;
        
        // Find which slice the mouse is over
        const newHoveredSlice = slices.find(slice => {
          let start = slice.startAngle;
          let end = slice.endAngle;
          
          // Handle angle wrapping
          if (start < 0) start += 2 * Math.PI;
          if (end < 0) end += 2 * Math.PI;
          
          if (start > end) {
            return (angle >= start || angle <= end);
          } else {
            return (angle >= start && angle <= end);
          }
        });
        
        if (newHoveredSlice !== hoveredSlice) {
          hoveredSlice = newHoveredSlice;
          redrawPieChart(salary, needs, wants, savings, entertainment, hoveredSlice);
        }
      } else if (hoveredSlice) {
        hoveredSlice = null;
        redrawPieChart(salary, needs, wants, savings, entertainment, null);
      }
    });
  });
  
  // Remove mouse leave event to prevent lag
  canvas.addEventListener('mouseleave', () => {
    if (hoveredSlice) {
      hoveredSlice = null;
      redrawPieChart(salary, needs, wants, savings, entertainment, null);
    }
  });
}

// Helper function to adjust color brightness
function adjustBrightness(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

// Function to redraw pie chart with hover effects
function redrawPieChart(salary, needs, wants, savings, entertainment, hoveredSlice) {
  const canvas = document.getElementById('budgetPieChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const centerX = window.pieCenterX;
  const centerY = window.pieCenterY;
  const radius = window.pieRadius;
  const slices = window.pieSlices;
  
  if (!slices) return;
  
  // Draw slices with hover effects
  slices.forEach(slice => {
    ctx.beginPath();
    
    if (slice === hoveredSlice) {
      // Hovered slice: move up and add shadow
      const offsetY = -12;
      ctx.moveTo(centerX, centerY + offsetY);
      ctx.arc(centerX, centerY + offsetY, radius, slice.startAngle, slice.endAngle);
      
      // Enhanced shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 8;
    } else {
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, slice.startAngle, slice.endAngle);
      
      // No shadow for non-hovered slices
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
    
    ctx.closePath();
    
    // Modern gradient fill
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    if (slice === hoveredSlice) {
      // Brighter colors for hovered slice
      gradient.addColorStop(0, adjustBrightness(slice.color, 10));
      gradient.addColorStop(1, slice.color);
    } else {
      gradient.addColorStop(0, slice.color);
      gradient.addColorStop(1, adjustBrightness(slice.color, -20));
    }
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Border
    ctx.strokeStyle = slice === hoveredSlice ? '#ffffff' : '#ffffff';
    ctx.lineWidth = slice === hoveredSlice ? 4 : 3;
    ctx.stroke();
  });
  
  // Redraw center circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fill();
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Center text
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 20px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('₹' + salary.toLocaleString('en-IN'), centerX, centerY + 6);
  
  // Add tooltip for hovered slice
  if (hoveredSlice) {
    const tooltipX = centerX + Math.cos((hoveredSlice.startAngle + hoveredSlice.endAngle) / 2) * (radius + 20);
    const tooltipY = centerY + Math.sin((hoveredSlice.startAngle + hoveredSlice.endAngle) / 2) * (radius + 20);
    
    // Modern tooltip
    ctx.fillStyle = 'rgba(17, 24, 39, 0.95)';
    ctx.fillRect(tooltipX - 60, tooltipY - 40, 120, 80);
    
    // Tooltip border
    ctx.strokeStyle = hoveredSlice.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(tooltipX - 60, tooltipY - 40, 120, 80);
    
    // Tooltip text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(hoveredSlice.label, tooltipX, tooltipY - 20);
    ctx.fillText('₹' + hoveredSlice.value.toLocaleString('en-IN'), tooltipX, tooltipY);
    ctx.fillText(hoveredSlice.percentage, tooltipX, tooltipY + 20);
  }
}

// Function to show list view
function showListView(salary, needs, wants, savings, entertainment) {
  const dashboard = document.querySelector('.budget-dashboard');
  if (!dashboard) return;
  
  const existingList = dashboard.querySelector('.list-view');
  if (existingList) {
    existingList.remove();
  }
  
  const listHTML = `
    <div class="list-view">
      <h3>Budget Breakdown</h3>
      <div class="list-items">
        <div class="list-item">
          <span class="item-label">Needs</span>
          <span class="item-amount">₹${needs.toLocaleString('en-IN')}</span>
          <span class="item-percentage">${Math.round((needs / salary) * 100)}%</span>
        </div>
        <div class="list-item">
          <span class="item-label">Wants</span>
          <span class="item-amount">₹${wants.toLocaleString('en-IN')}</span>
          <span class="item-percentage">${Math.round((wants / salary) * 100)}%</span>
        </div>
        <div class="list-item">
          <span class="item-label">Savings</span>
          <span class="item-amount">₹${savings.toLocaleString('en-IN')}</span>
          <span class="item-percentage">${Math.round((savings / salary) * 100)}%</span>
        </div>
      </div>
    </div>
  `;
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = listHTML;
  dashboard.appendChild(tempDiv.firstElementChild);
}

// Testimonials slider
const slides = Array.from(document.querySelectorAll('.slide'));
let current = 0;
function showSlide(index) {
  slides.forEach((s, i) => s.classList.toggle('active', i === index));
}
function next() { current = (current + 1) % slides.length; showSlide(current); }
function prev() { current = (current - 1 + slides.length) % slides.length; showSlide(current); }
document.querySelector('.slider .next')?.addEventListener('click', next);
document.querySelector('.slider .prev')?.addEventListener('click', prev);
setInterval(next, 6000);

// Footer year
const y = document.getElementById('year');
if (y) y.textContent = String(new Date().getFullYear());

// Auth modal wiring
const modal = document.getElementById('auth-modal');
const openBtn = document.getElementById('login-open');
const closeBtn = document.getElementById('auth-x');
const closeBackdrop = document.getElementById('auth-close');
function showModal() { modal?.classList.add('show'); }
function hideModal() { modal?.classList.remove('show'); }
openBtn?.addEventListener('click', showModal);
closeBtn?.addEventListener('click', hideModal);
closeBackdrop?.addEventListener('click', hideModal);

// Tabs
document.querySelectorAll('.tab').forEach((t) => {
  t.addEventListener('click', () => {
    const tab = t.getAttribute('data-tab');
    document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    const panel = document.getElementById(`${tab}-form`);
    panel?.classList.add('active');
    document.getElementById('auth-title').textContent = tab === 'login' ? 'Login' : 'Sign Up';
  });
});

// Helpers
async function api(path, opts) {
  const res = await fetch(path, Object.assign({
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  }, opts));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Login
const loginForm = document.getElementById('login-form');
const loginMsg = document.getElementById('login-msg');
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginMsg.textContent = '';
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  try {
    await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    hideModal();
    window.location.href = '/dashboard';
  } catch (err) {
    loginMsg.textContent = err.message;
  }
});

// Signup
const signupForm = document.getElementById('signup-form');
const signupMsg = document.getElementById('signup-msg');
signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  signupMsg.textContent = '';
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  try {
    await api('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    hideModal();
    window.location.href = '/dashboard';
  } catch (err) {
    signupMsg.textContent = err.message;
  }
});


