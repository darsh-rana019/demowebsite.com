const WEBHOOK_URL = "https://darshrana1409.app.n8n.cloud/webhook/newlead";

const leadForm = document.getElementById('leadForm');
const submitButton = document.getElementById('submitButton');
const toast = document.getElementById('toast');

// Show a temporary success message popup
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// Validate that phone input only contains numeric characters
function sanitizePhoneValue(value) {
  return value.replace(/[^0-9]/g, '');
}

leadForm.phone.addEventListener('input', (event) => {
  event.target.value = sanitizePhoneValue(event.target.value);
});

leadForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(leadForm);
  const name = formData.get('name').trim();
  const phone = formData.get('phone').trim();
  const email = formData.get('email').trim();
  const city = formData.get('city').trim();
  const loanType = formData.get('loanType');
  const amount = formData.get('amount').trim();
  const message = formData.get('message').trim();

  // Required field validation
  if (!name || !phone || !email || !city || !loanType || !amount) {
    showToast('Please complete all required fields.');
    return;
  }

  const payload = {
    name,
    phone,
    email,
    city,
    loanType,
    amount,
    message,
    submittedAt: new Date().toISOString(),
  };

  submitButton.disabled = true;
  submitButton.textContent = 'Submitting...';

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    showToast('Lead submitted successfully!');
    leadForm.reset();
  } catch (error) {
    showToast('Unable to submit lead. Please try again later.');
    console.error('Lead submission error:', error);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Submit Lead';
  }
});
