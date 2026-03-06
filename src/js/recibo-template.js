/** Gera HTML do recibo a partir do template e dados do serviço. */
export function getValorChave(chave, servico) {
  const s = servico || {};
  const map = {
    cliente: s.clientes?.nome || '—',
    data: s.data_servico || '—',
    carreta: s.carreta || '—',
    conteiner: s.conteiner || '—',
    transportadora: s.transportadora || '—',
    local: s.local_servico || '—',
    chapas: s.quantidade_chapas ?? '—',
    valor_total:
      s.valor_total != null ? `R$ ${Number(s.valor_total).toFixed(2).replace('.', ',')}` : '—',
    observacoes: s.observacoes || '—',
    fornecedor: s.fornecedor || '—',
    nfe: s.nfe || '—',
    cte: s.cte || '—',
  };
  return map[chave] ?? '—';
}

function escapeHtml(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

export function gerarHtmlRecibo(template, servico) {
  const t = template || {};
  const s = servico || {};
  const campos = t.campos_tabela || [];
  const linhas = campos
    .map(
      (c) =>
        `<tr><td style="padding:8px;border:1px solid #ddd;"><strong>${escapeHtml(
          c.label || ''
        )}</strong></td><td style="padding:8px;border:1px solid #ddd;">${escapeHtml(
          String(getValorChave(c.chave, s))
        )}</td></tr>`
    )
    .join('');

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#1e3a5f;">${escapeHtml(t.titulo || 'Recibo de Serviço')} - ${escapeHtml(
    t.nome_empresa || 'Sistema APB'
  )}</h2>
      ${t.cabecalho ? `<p style="margin:10px 0;">${escapeHtml(t.cabecalho).replace(/\n/g, '<br>')}</p>` : ''}
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        ${linhas}
      </table>
      ${t.rodape ? `<p style="margin-top:20px;">${escapeHtml(t.rodape)}</p>` : ''}
    </div>`;
}

/** Aplica placeholders. Se html=true, converte \n em <br>. */
export function aplicarPlaceholders(texto, servico, html = false) {
  const s = servico || {};
  let t = (texto || '')
    .replace(/{{cliente}}/gi, s.clientes?.nome || '')
    .replace(/{{valor}}/gi, `R$ ${((s.valor_total || 0)).toFixed(2).replace('.', ',')}`)
    .replace(/{{data}}/gi, s.data_servico || '')
    .replace(/{{carreta}}/gi, s.carreta || '')
    .replace(/{{conteiner}}/gi, s.conteiner || '')
    .replace(/{{transportadora}}/gi, s.transportadora || '')
    .replace(/{{local}}/gi, s.local_servico || '');
  if (html) t = t.replace(/\n/g, '<br>');
  return t;
}
