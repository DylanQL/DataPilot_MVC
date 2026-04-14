const state = {
  email: String(window.__REGISTER_CODE_DATA__?.email || '').trim().toLowerCase(),
  cooldownSeconds: 0,
  timerId: null,
  canSendCode: true,
  isSending: false
};

const sendCodeBtn = document.getElementById('sendCodeBtn');
const cooldownInfo = document.getElementById('cooldownInfo');
const verifyCodeForm = document.getElementById('verifyCodeForm');
const verificationCode = document.getElementById('verificationCode');
const registerMessage = document.getElementById('registerMessage');

function showMessage(message, type = 'success') {
  registerMessage.innerHTML = `<div class="alert ${type === 'error' ? 'error' : 'success'}">${message}</div>`;
}

async function request(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'No se pudo completar la solicitud.');
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
}

function updateSendButtonState() {
  sendCodeBtn.disabled = state.isSending || !state.canSendCode || state.cooldownSeconds > 0;

  if (state.isSending) {
    sendCodeBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Enviando...';
    cooldownInfo.textContent = 'Enviando codigo al correo...';
    return;
  }

  if (state.cooldownSeconds > 0) {
    sendCodeBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> Reenviar en ${state.cooldownSeconds}s`;
    cooldownInfo.textContent = `Podras volver a enviar codigo en ${state.cooldownSeconds} segundos.`;
  } else {
    sendCodeBtn.innerHTML = '<i class="bi bi-send"></i> Enviar codigo';
    cooldownInfo.textContent = '';
  }
}

function startCooldown(seconds) {
  if (state.timerId) clearInterval(state.timerId);

  state.cooldownSeconds = Math.max(0, Number(seconds) || 0);
  updateSendButtonState();

  if (state.cooldownSeconds === 0) return;

  state.timerId = setInterval(() => {
    state.cooldownSeconds -= 1;
    if (state.cooldownSeconds <= 0) {
      clearInterval(state.timerId);
      state.timerId = null;
      state.cooldownSeconds = 0;
    }
    updateSendButtonState();
  }, 1000);
}

async function loadStatus() {
  const data = await request('/register/status', { email: state.email });
  state.canSendCode = data.canSendCode;
  startCooldown(data.cooldownRemainingSeconds || 0);
}

sendCodeBtn.addEventListener('click', async () => {
  if (state.isSending || state.cooldownSeconds > 0) return;

  try {
    state.isSending = true;
    updateSendButtonState();

    const data = await request('/register/send-code', { email: state.email });
    showMessage(`${data.message} Expira en 5 minutos.`);
    verificationCode.focus();
    state.isSending = false;
    startCooldown(data.cooldownRemainingSeconds || 60);
  } catch (error) {
    state.isSending = false;
    if (error?.payload?.cooldownRemainingSeconds) {
      startCooldown(error.payload.cooldownRemainingSeconds);
    }
    showMessage(error.message, 'error');
  }
});

verifyCodeForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const data = await request('/register/verify-code', {
      email: state.email,
      code: verificationCode.value.trim()
    });

    showMessage(data.message);
    verificationCode.value = '';
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

loadStatus().catch((error) => showMessage(error.message, 'error'));
