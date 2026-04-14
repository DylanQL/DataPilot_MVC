const emailInput = document.getElementById('registerEmail');
const allowedDomain = window.__REGISTER_DATA__?.allowedDomain || 'scania.com';

emailInput?.addEventListener('blur', () => {
  const value = String(emailInput.value || '').trim().toLowerCase();
  if (!value) return;
  if (!value.endsWith(`@${allowedDomain}`)) {
    emailInput.setCustomValidity(`Solo se permite el dominio @${allowedDomain}`);
  } else {
    emailInput.setCustomValidity('');
  }
});

emailInput?.addEventListener('input', () => {
  emailInput.setCustomValidity('');
});
