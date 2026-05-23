const WEBHOOK_URL = "https://darshrana1409.app.n8n.cloud/webhook-test/pragati-leads";

/*
  Modular data structure for categories -> services
  Reusable and easy to extend
*/
const CATEGORIES = {
  'Loans': [
    'Home Loan','Personal Loan','Business Loan','Car Loan','Mortgage Loan','Loan Against Property','Education Loan','Working Capital Loan','Balance Transfer'
  ],
  'Insurance': ['Life Insurance','Health Insurance','Car Insurance','Bike Insurance','Travel Insurance'],
  'Information Technology': ['Website Development','Mobile App Development','SEO','Digital Marketing','AI Automation','CRM Development','WhatsApp Automation'],
  'Government Liaison': ['GST Registration','Shop Act License','Passport Assistance','PAN Card','Property Documentation','Income Tax Filing'],
  'Real Estate': ['Property Search','Property Documentation','Valuation','Brokerage Services'],
  'Investment Services': ['Portfolio Advisory','Mutual Funds','Stocks','Wealth Management'],
  'Documentation Services': ['Document Drafting','Verification','Notary Services'],
  'Tax & Compliance': ['Tax Filing','GST Compliance','Advisory']
};

// DOM references
const leadForm = document.getElementById('leadForm');
const submitButton = document.getElementById('submitButton');
const toast = document.getElementById('toast');
const categorySelect = document.getElementById('categorySelect');
const serviceSelect = document.getElementById('serviceSelect');
const loanExtra = document.getElementById('loanExtraFields');
const successModal = document.getElementById('successModal');
const successClose = document.getElementById('successClose');
const successAgain = document.getElementById('successAgain');
const confettiLayer = document.getElementById('confettiLayer');
const formProgress = document.getElementById('formProgress');
const pageLoader = document.getElementById('pageLoader');
const topProgress = document.getElementById('topProgress');
const backToTop = document.getElementById('backToTop');
const mobileApply = document.getElementById('mobileApply');
const testimonialSlider = document.getElementById('testimonialSlider');
const testimonialPrev = document.getElementById('testimonialPrev');
const testimonialNext = document.getElementById('testimonialNext');
const statsNumbers = document.querySelectorAll('.stat-number');
const nameField = leadForm.querySelector('input[name="name"]');

const pageState = {
  testimonialIndex: 0,
  testimonialTimer: null,
  statsAnimated: false
};

function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

function updateTopProgress() {
  if (!topProgress) return;
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  topProgress.style.width = `${docHeight > 0 ? (scrollTop / docHeight) * 100 : 0}%`;
}

function toggleBackToTop() {
  if (!backToTop) return;
  backToTop.classList.toggle('visible', window.scrollY > 400);
}

function fadeOutLoader() {
  if (!pageLoader) return;
  pageLoader.classList.add('loaded');
  setTimeout(() => {
    pageLoader.style.display = 'none';
  }, 500);
}

window.addEventListener('load', () => {
  fadeOutLoader();
  updateTopProgress();
});

window.addEventListener('scroll', () => {
  updateTopProgress();
  toggleBackToTop();
});

backToTop && backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

mobileApply && mobileApply.addEventListener('click', () => {
  applyCalc && applyCalc.click();
});

// Small helper: show toast messages
function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.classList.add('show', type);
  setTimeout(() => {
    toast.classList.remove('show', type);
  }, 3800);
}

// Spinner toggle inside the submit button
function setLoading(isLoading) {
  const spinner = submitButton.querySelector('.btn-spinner');
  const text = submitButton.querySelector('.btn-text');
  if (isLoading) {
    submitButton.classList.add('loading');
    submitButton.disabled = true;
    if (text) text.textContent = 'Submitting...';
  } else {
    submitButton.classList.remove('loading');
    submitButton.disabled = false;
    if (text) text.textContent = 'Submit Lead';
  }
}

// Success modal controls
function showSuccessModal() {
  if (!successModal) return;
  successModal.setAttribute('aria-hidden', 'false');
  successModal.classList.add('open');
  startConfetti();
}

function hideSuccessModal() {
  if (!successModal) return;
  successModal.setAttribute('aria-hidden', 'true');
  successModal.classList.remove('open');
  stopConfetti();
}

successClose && successClose.addEventListener('click', hideSuccessModal);
successAgain && successAgain.addEventListener('click', () => {
  hideSuccessModal();
  document.getElementById('affordabilityCalc').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Ensure phone input keeps only digits
function sanitizePhoneValue(value) {
  return value.replace(/[^0-9]/g, '');
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePhone(value) {
  const digits = sanitizePhoneValue(value);
  return digits.length >= 10 && digits.length <= 12;
}

// Populate services when category changes
function populateServices(category) {
  serviceSelect.innerHTML = '<option value="">Select service</option>';
  if (!category || !CATEGORIES[category]) return;
  CATEGORIES[category].forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    serviceSelect.appendChild(opt);
  });
}

// Show/hide loan extra fields
function toggleLoanFields(show) {
  if (show) {
    loanExtra.setAttribute('aria-hidden', 'false');
    loanExtra.style.maxHeight = loanExtra.scrollHeight + 'px';
  } else {
    loanExtra.setAttribute('aria-hidden', 'true');
    loanExtra.style.maxHeight = '0px';
  }
}

// Attach listeners
categorySelect.addEventListener('change', (e) => {
  const cat = e.target.value;
  populateServices(cat);
  toggleLoanFields(cat === 'Loans');
});

leadForm.phone && leadForm.phone.addEventListener('input', (event) => {
  event.target.value = formatPhone(event.target.value);
});

// Validation helpers
function showFieldError(name, message) {
  const small = leadForm.querySelector(`small[data-for="${name}"]`);
  if (small) {
    small.textContent = message;
    small.style.opacity = '1';
  }
}

function clearErrors() {
  leadForm.querySelectorAll('small.hint.error').forEach(s => { s.textContent = ''; s.style.opacity = '0'; });
}

// Generate a short reference id for modal
function makeRef() {
  return '#REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

leadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors();

  const formData = new FormData(leadForm);
  const data = Object.fromEntries(formData.entries());

  // Basic required fields
  const required = ['name','phone','email','city','category','service'];
  let ok = true;
  required.forEach(k => {
    if (!data[k] || data[k].trim() === '') {
      showFieldError(k, 'This field is required');
      ok = false;
    }
  });

  if (!ok) {
    showToast('Please fix validation errors and try again.', 'error');
    return;
  }

  if (!validateEmail(data.email || '')) {
    showFieldError('email', 'Enter a valid email address');
    showToast('Please provide a valid email.', 'error');
    return;
  }

  if (!validatePhone(data.phone || '')) {
    showFieldError('phone', 'Enter a valid phone number');
    showToast('Please provide a valid phone number.', 'error');
    return;
  }

  const cleanPhone = (data.phone || '').replace(/\D/g, '');
  const cleanMonthlyIncome = normalizeNumber(data.monthlyIncome || '');
  const cleanExistingEmi = normalizeNumber(data.existingEmi || '');
  const cleanRequiredLoan = normalizeNumber(data.requiredLoanAmount || '');

  const payload = {
    name: data.name.trim(),
    phone: cleanPhone,
    email: data.email.trim(),
    city: data.city.trim(),
    category: data.category,
    service: data.service,
    monthlyIncome: cleanMonthlyIncome ? Number(cleanMonthlyIncome) : null,
    existingEmi: cleanExistingEmi ? Number(cleanExistingEmi) : null,
    foir: data.calc_foir || null,
    interestRate: data.calc_interestRate || null,
    tenureYears: data.calc_tenure || null,
    downPayment: data.calc_downPayment ? Number(data.calc_downPayment) : null,
    estimatedLoanAmount: data.calculatedLoanAmount ? Number(data.calculatedLoanAmount) : null,
    estimatedPropertyCost: data.calculatedPropertyCost ? Number(data.calculatedPropertyCost) : null,
    employmentType: data.employmentType || null,
    requiredLoanAmount: cleanRequiredLoan ? Number(cleanRequiredLoan) : null,
    message: data.message || '',
    submittedAt: new Date().toISOString()
  };

  setLoading(true);

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Network response not ok');

    showSuccessModal();
    showToast('Application submitted successfully!', 'success');
    // keep form values on success so user can review if needed
  } catch (err) {
    console.error('Lead submission error:', err);
    showToast('Unable to submit lead. Please try again later.', 'error');
  } finally {
    setLoading(false);
  }
});

// Initialize UI state
populateServices(categorySelect.value);
toggleLoanFields(false);

// Form progress and floating label support
function setFloatingLabel(input) {
  const label = input.closest('.floating-group');
  if (!label) return;
  if (input.value && input.value.toString().trim() !== '') {
    label.classList.add('filled');
  } else {
    label.classList.remove('filled');
  }
}

function updateFormProgress() {
  if (!formProgress) return;
  const fields = [
    leadForm.querySelector('input[name="name"]'),
    leadForm.querySelector('input[name="phone"]'),
    leadForm.querySelector('input[name="email"]'),
    leadForm.querySelector('input[name="city"]'),
    categorySelect,
    serviceSelect,
    leadForm.querySelector('input[name="monthlyIncome"]'),
    leadForm.querySelector('input[name="existingEmi"]'),
    leadForm.querySelector('input[name="requiredLoanAmount"]')
  ].filter(Boolean);
  const filled = fields.filter(field => field.value && field.value.toString().trim() !== '').length;
  formProgress.style.width = `${Math.round((filled / fields.length) * 100)}%`;
}

function animateStats() {
  if (!statsNumbers.length || pageState.statsAnimated) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      pageState.statsAnimated = true;
      statsNumbers.forEach((el) => {
        const target = Number(el.dataset.target) || 0;
        let start = 0;
        const duration = 1400;
        const begin = performance.now();
        const step = (now) => {
          const progress = Math.min(1, (now - begin) / duration);
          el.textContent = Math.round(progress * target);
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      observer.disconnect();
    });
  }, { threshold: 0.4 });
  observer.observe(document.querySelector('#stats'));
}

function swapTestimonial(index) {
  if (!testimonialSlider) return;
  const cards = testimonialSlider.querySelectorAll('.testimonial-card');
  cards.forEach((card, idx) => {
    card.classList.toggle('active', idx === index);
  });
}

function advanceTestimonial(direction = 1) {
  if (!testimonialSlider) return;
  const cards = testimonialSlider.querySelectorAll('.testimonial-card');
  pageState.testimonialIndex = (pageState.testimonialIndex + direction + cards.length) % cards.length;
  swapTestimonial(pageState.testimonialIndex);
}

function startTestimonialLoop() {
  if (!testimonialSlider) return;
  pageState.testimonialTimer = window.setInterval(() => advanceTestimonial(1), 6000);
}

function stopTestimonialLoop() {
  if (pageState.testimonialTimer) {
    window.clearInterval(pageState.testimonialTimer);
  }
}

testimonialPrev && testimonialPrev.addEventListener('click', () => {
  advanceTestimonial(-1);
  stopTestimonialLoop();
  startTestimonialLoop();
});

testimonialNext && testimonialNext.addEventListener('click', () => {
  advanceTestimonial(1);
  stopTestimonialLoop();
  startTestimonialLoop();
});

startTestimonialLoop();

document.addEventListener('DOMContentLoaded', () => {
  animateStats();
  updateFormProgress();
});

function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0,5)} ${digits.slice(5)}`;
}

function normalizeNumber(value) {
  return value.toString().replace(/[^0-9]/g, '');
}

function formatCurrency(value) {
  const numberValue = Number(normalizeNumber(value));
  if (!numberValue) return '';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(numberValue);
}

function bindCurrencyInput(input) {
  if (!input) return;
  input.addEventListener('focus', () => {
    input.value = normalizeNumber(input.value);
  });
  input.addEventListener('input', () => {
    const raw = normalizeNumber(input.value);
    input.value = formatCurrency(raw);
    setFloatingLabel(input);
    updateFormProgress();
  });
  input.addEventListener('blur', () => {
    input.value = formatCurrency(input.value);
  });
}

['monthlyIncome', 'existingEmi', 'requiredLoanAmount'].forEach(name => {
  const input = leadForm.querySelector(`input[name="${name}"]`);
  bindCurrencyInput(input);
});

leadForm.querySelectorAll('input, select, textarea').forEach(input => {
  input.addEventListener('focus', (event) => {
    const label = event.target.closest('.floating-group');
    if (label) label.classList.add('focused');
  });
  input.addEventListener('input', (event) => {
    setFloatingLabel(event.target);
    updateFormProgress();
  });
  input.addEventListener('blur', (event) => {
    const label = event.target.closest('.floating-group');
    if (label) label.classList.remove('focused');
    setFloatingLabel(event.target);
  });
});

function startConfetti() {
  if (!confettiLayer) return;
  confettiLayer.innerHTML = '';
  for (let i = 0; i < 30; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    const size = Math.floor(Math.random() * 8) + 6;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 0.35}px`;
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = `hsl(${Math.random() * 60 + 150}, 90%, 65%)`;
    piece.style.animationDelay = `${Math.random() * 0.8}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    confettiLayer.appendChild(piece);
  }
}

function stopConfetti() {
  if (!confettiLayer) return;
  confettiLayer.innerHTML = '';
}

/* ---------------------- Affordability Calculator ---------------------- */
// Element refs
const incomeRange = document.getElementById('incomeRange');
const incomeInput = document.getElementById('incomeInput');
const emiRange = document.getElementById('emiRange');
const emiInput = document.getElementById('emiInput');
const rateRange = document.getElementById('rateRange');
const rateInput = document.getElementById('rateInput');
const tenureRange = document.getElementById('tenureRange');
const tenureInput = document.getElementById('tenureInput');
const downRange = document.getElementById('downRange');
const downInput = document.getElementById('downInput');
const foirCards = document.getElementById('foirCards');

const resEmi = document.getElementById('resEmi');
const resLoan = document.getElementById('resLoan');
const resProperty = document.getElementById('resProperty');
const eligText = document.getElementById('eligText');
const calcNow = document.getElementById('calcNow');
const applyCalc = document.getElementById('applyCalc');

// Hidden inputs in lead form
const hiddenFoir = document.getElementById('hiddenFoir');
const hiddenDown = document.getElementById('hiddenDown');
const hiddenRate = document.getElementById('hiddenRate');
const hiddenTenure = document.getElementById('hiddenTenure');
const hiddenLoanAmount = document.getElementById('hiddenLoanAmount');

// default sync values
if (incomeInput) incomeInput.value = incomeRange.value;
if (emiInput) emiInput.value = emiRange.value;
if (rateInput) rateInput.value = rateRange.value;
if (tenureInput) tenureInput.value = tenureRange.value;
if (downInput) downInput.value = downRange.value;

// Utilities

function formatINRCompact(val) {
  const n = Number(val) || 0;
  if (n >= 10000000) return '₹' + (n/10000000).toFixed(2) + ' Cr';
  if (n >= 100000) return '₹' + (n/100000).toFixed(2) + ' Lakh';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function formatINR(val) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);
}

function animateValue(el, start, end, duration = 600) {
  const startTime = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; // easeInOutQuad
    const value = Math.round(start + (end - start) * eased);
    el.textContent = formatINR(value);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Sync range and number inputs
function bindRangeAndInput(rangeEl, inputEl, opts = {}) {
  if (!rangeEl || !inputEl) return;
  inputEl.value = rangeEl.value;
  rangeEl.addEventListener('input', () => { inputEl.value = rangeEl.value; calculate(); });
  inputEl.addEventListener('input', () => {
    const v = clamp(Number(inputEl.value) || 0, Number(rangeEl.min), Number(rangeEl.max));
    rangeEl.value = v;
    inputEl.value = v;
    calculate();
  });
}

bindRangeAndInput(incomeRange, incomeInput);
bindRangeAndInput(emiRange, emiInput);
bindRangeAndInput(rateRange, rateInput);
bindRangeAndInput(tenureRange, tenureInput);
bindRangeAndInput(downRange, downInput);

// FOIR selection
let selectedFoir = 0.45;
foirCards && foirCards.addEventListener('click', (e) => {
  const btn = e.target.closest('.foir-card');
  if (!btn) return;
  foirCards.querySelectorAll('.foir-card').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedFoir = Number(btn.dataset.foir) || 0.45;
  calculate();
});

// Core calculation logic
function calculate() {
  const income = Number(incomeRange.value) || 0;
  const existingEmi = Number(emiRange.value) || 0;
  const annualRate = Number(rateRange.value) || 8.5;
  const tenureYears = Number(tenureRange.value) || 1;
  const downPayment = Number(downRange.value) || 0;
  const foir = selectedFoir || 0.45;

  // Step 1: Eligible EMI
  let eligibleEmi = Math.max(0, Math.round((income * foir) - existingEmi));

  // Step 2: Reverse EMI to get principal (loan amount)
  const r = annualRate / 12 / 100;
  const n = tenureYears * 12;
  let loanAmount = 0;
  if (r > 0) {
    const factor = (1 - Math.pow(1 + r, -n)) / r;
    loanAmount = Math.max(0, Math.floor(eligibleEmi * factor));
  } else {
    loanAmount = Math.max(0, eligibleEmi * n);
  }

  // Step 3: Property cost
  const propertyCost = Math.max(0, loanAmount + downPayment);

  // Update UI with animation
  animateValue(resEmi, Number(resEmi.dataset?.value || 0), eligibleEmi);
  animateValue(resLoan, Number(resLoan.dataset?.value || 0), loanAmount);
  animateValue(resProperty, Number(resProperty.dataset?.value || 0), propertyCost);

  // store previous values to dataset for next animation
  resEmi.dataset.value = eligibleEmi;
  resLoan.dataset.value = loanAmount;
  resProperty.dataset.value = propertyCost;

  // compact eligibility text
  eligText.textContent = `🎉 You may be eligible for a loan up to ${formatINRCompact(loanAmount)}`;
  if (applyCalc) {
    applyCalc.classList.add('glow');
    window.clearTimeout(applyCalc._glowTimeout);
    applyCalc._glowTimeout = window.setTimeout(() => applyCalc.classList.remove('glow'), 4200);
  }
  updateFormProgress();

  // update hidden inputs for lead form
  if (hiddenFoir) hiddenFoir.value = selectedFoir;
  if (hiddenDown) hiddenDown.value = downPayment;
  if (hiddenRate) hiddenRate.value = annualRate;
  if (hiddenTenure) hiddenTenure.value = tenureYears;
  if (hiddenLoanAmount) hiddenLoanAmount.value = Math.round(loanAmount);
  const hiddenPropertyCost = document.getElementById('hiddenPropertyCost');
  if (hiddenPropertyCost) hiddenPropertyCost.value = Math.round(propertyCost);
}

// initial calculation
calculate();
updateFormProgress();

// Calculate button
calcNow && calcNow.addEventListener('click', (e) => { e.preventDefault(); calculate(); showToast('Calculated updated', 'success'); });

// Apply Now: scroll to lead form and autofill values
applyCalc && applyCalc.addEventListener('click', (e) => {
  e.preventDefault();

  if (categorySelect) {
    categorySelect.value = 'Loans';
    categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // choose Home Loan by default
  if (serviceSelect) {
    serviceSelect.value = CATEGORIES['Loans'].includes('Home Loan') ? 'Home Loan' : CATEGORIES['Loans'][0];
  }

  const monthlyIncomeField = leadForm.querySelector('input[name="monthlyIncome"]');
  const existingEmiField = leadForm.querySelector('input[name="existingEmi"]');
  const requiredLoanField = leadForm.querySelector('input[name="requiredLoanAmount"]');

  if (monthlyIncomeField) {
    monthlyIncomeField.value = formatCurrency(incomeRange.value);
    setFloatingLabel(monthlyIncomeField);
  }
  if (existingEmiField) {
    existingEmiField.value = formatCurrency(emiRange.value);
    setFloatingLabel(existingEmiField);
  }
  if (requiredLoanField) {
    requiredLoanField.value = formatCurrency(Number(resLoan.dataset.value || 0));
    setFloatingLabel(requiredLoanField);
  }

  if (hiddenFoir) hiddenFoir.value = selectedFoir;
  if (hiddenDown) hiddenDown.value = Number(downRange.value || 0);
  if (hiddenRate) hiddenRate.value = Number(rateRange.value || 0);
  if (hiddenTenure) hiddenTenure.value = Number(tenureRange.value || 0);
  if (hiddenLoanAmount) hiddenLoanAmount.value = Number(resLoan.dataset.value || 0);
  if (document.getElementById('hiddenPropertyCost')) {
    document.getElementById('hiddenPropertyCost').value = Number(resProperty.dataset.value || 0);
  }

  const leadPanel = document.querySelector('.lead-panel');
  if (leadPanel) {
    leadPanel.classList.add('focused');
  }

  document.getElementById('lead-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  nameField && nameField.focus();
  showToast('Lead form auto-filled. Ready to submit.', 'success');
});

/* End Calculator */
