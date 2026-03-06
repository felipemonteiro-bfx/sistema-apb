import { FUNCTIONS_URL } from './config.js';

export function initAssistente(getContext) {
  const btn = document.getElementById('btn-assistente');
  const modal = document.getElementById('modal-assistente');
  const input = document.getElementById('assistente-input');
  const enviar = document.getElementById('assistente-enviar');
  const resposta = document.getElementById('assistente-resposta');
  const fechar = document.getElementById('btn-fechar-assistente');

  if (!btn || !modal) return;

  const openModal = () => {
    modal.classList.add('active');
    input.focus();
  };
  const closeModal = () => {
    modal.classList.remove('active');
  };

  btn.addEventListener('click', openModal);
  fechar?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  enviar?.addEventListener('click', async () => {
    const prompt = input?.value?.trim();
    if (!prompt) return;

    enviar.disabled = true;
    resposta.classList.remove('hidden');
    resposta.innerHTML = '<span class="animate-pulse">Pensando...</span>';

    try {
      const context = typeof getContext === 'function' ? getContext() : {};
      const res = await fetch(`${FUNCTIONS_URL}/aiAssist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na requisição');
      resposta.innerHTML = `<div class="whitespace-pre-wrap">${escapeHtml(data.reply || '')}</div>`;
    } catch (err) {
      resposta.innerHTML = `<span class="text-red-600">${escapeHtml(err.message)}</span>`;
    }
    enviar.disabled = false;
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar?.click();
    }
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
