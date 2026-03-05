import {
  auth,
  signInWithEmail,
  createUser,
  signInWithGoogle,
  onAuthReady,
} from './firebase.js';

// Redirecionar se já logado
onAuthReady((user) => {
  if (user) {
    window.location.href = '/src/pages/index.html';
  }
});

function showMessage(text, isError = false) {
  const el = document.getElementById('login-message');
  el.textContent = text;
  el.className = `mb-4 p-3 rounded-lg text-sm ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
  el.classList.remove('hidden');
}

let modoCriarConta = false;

document.getElementById('toggle-criar-conta')?.addEventListener('click', () => {
  modoCriarConta = !modoCriarConta;
  const confirmWrap = document.getElementById('confirm-senha-wrap');
  const btn = document.getElementById('btn-login');
  const toggle = document.getElementById('toggle-criar-conta');
  if (modoCriarConta) {
    confirmWrap.classList.remove('hidden');
    btn.textContent = 'Criar conta';
    toggle.textContent = 'Já tenho conta';
  } else {
    confirmWrap.classList.add('hidden');
    document.getElementById('login-confirm-senha').value = '';
    btn.textContent = 'Entrar';
    toggle.textContent = 'Criar conta';
  }
});

document.getElementById('form-login')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  const confirmSenha = document.getElementById('login-confirm-senha').value;
  const btn = document.getElementById('btn-login');

  if (modoCriarConta) {
    if (senha.length < 6) {
      showMessage('A senha deve ter pelo menos 6 caracteres.', true);
      return;
    }
    if (senha !== confirmSenha) {
      showMessage('As senhas não coincidem.', true);
      return;
    }
  }

  btn.disabled = true;
  btn.textContent = modoCriarConta ? 'Criando...' : 'Entrando...';

  try {
    if (modoCriarConta) {
      await createUser(email, senha);
    } else {
      await signInWithEmail(email, senha);
    }
    window.location.href = '/src/pages/index.html';
  } catch (err) {
    const msg =
      err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
        ? 'E-mail ou senha incorretos.'
        : err.code === 'auth/user-not-found'
          ? 'Usuário não encontrado.'
          : err.code === 'auth/email-already-in-use'
            ? 'Este e-mail já está em uso.'
            : err.code === 'auth/weak-password'
              ? 'Senha muito fraca. Use pelo menos 6 caracteres.'
              : err.message;
    showMessage(msg, true);
    btn.disabled = false;
    btn.textContent = modoCriarConta ? 'Criar conta' : 'Entrar';
  }
});

document.getElementById('btn-google')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-google');
  btn.disabled = true;
  btn.innerHTML = '<span class="animate-pulse">Entrando...</span>';

  try {
    await signInWithGoogle();
    window.location.href = '/src/pages/index.html';
  } catch (err) {
    const msg = err.code === 'auth/popup-closed-by-user' ? 'Login cancelado.' : err.message;
    showMessage(msg, true);
    btn.disabled = false;
    btn.innerHTML = `
      <svg class="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Entrar com Google
    `;
  }
});
