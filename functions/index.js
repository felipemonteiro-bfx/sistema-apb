require('dotenv').config();

const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { GoogleGenerativeAI } = require('@google/generative-ai');

setGlobalOptions({ region: 'us-central1' });

/** Assistente IA - Gemini. Configure GEMINI_API_KEY no Firebase. */
exports.aiAssist = onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).send('');
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY não configurada' });
  }

  try {
    const { prompt, context } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Campo prompt obrigatório' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemContext = `Você é um assistente do Sistema APB, de gestão de serviços (chapas, transportadoras, clientes).
Responda de forma objetiva em português.${context ? `\nContexto: ${JSON.stringify(context)}` : ''}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: systemContext + '\n\nPergunta: ' + prompt }] }],
    });
    const text = result.response.text();
    res.json({ reply: text });
  } catch (err) {
    console.error('aiAssist error:', err);
    res.status(500).json({ error: err.message || 'Erro ao processar' });
  }
});

/** Gerar boleto Cora. Configure CORA_CLIENT_ID, CORA_CLIENT_SECRET. */
exports.gerarBoletoCora = onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).send('');
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const clientId = process.env.CORA_CLIENT_ID;
  const clientSecret = process.env.CORA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Credenciais Cora não configuradas' });
  }

  try {
    const crypto = require('crypto');
    const idempotencyKey = crypto.randomUUID();
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const { valor, vencimento, clienteNome, clienteCnpj } = req.body || {};
    const coraApiUrl =
      process.env.CORA_API_URL || 'https://api.stage.cora.com.br';
    const invoiceUrl = `${coraApiUrl.replace(/\/$/, '')}/v2/invoices`;

    const response = await fetch(invoiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        amount: parseFloat(valor) || 0,
        dueDate: vencimento || new Date().toISOString().split('T')[0],
        customer: { name: clienteNome || 'Cliente', document: (clienteCnpj || '').replace(/\D/g, '') },
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      const msg = data?.message || data?.error || data?.errors?.[0]?.message || 'Erro ao gerar boleto';
      return res.status(response.status >= 400 ? response.status : 500).json({ error: msg });
    }
    res.json(data);
  } catch (err) {
    console.error('gerarBoletoCora error:', err);
    res.status(500).json({ error: err.message || 'Erro ao gerar boleto' });
  }
});

/** Enviar recibo de serviço por email via Gmail SMTP. Configure GMAIL_USER e GMAIL_APP_PASSWORD. */
exports.enviarReciboEmail = onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).send('');
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) {
    return res.status(500).json({
      error: 'GMAIL_USER e GMAIL_APP_PASSWORD devem ser configurados nas variáveis de ambiente do Firebase.',
    });
  }

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: gmailUser, pass: gmailPass },
    });

    const { to, subject, mensagem, servico, from, html } = req.body || {};
    if (!to || typeof to !== 'string') {
      return res.status(400).json({ error: 'Email do destinatário obrigatório' });
    }

    const s = servico || {};
    let htmlFinal;

    if (html && typeof html === 'string') {
      const mensagemHtml = (mensagem || '')
        .replace(/\n/g, '<br>')
        .replace(/{{cliente}}/gi, s.clientes?.nome || '')
        .replace(/{{valor}}/gi, `R$ ${(s.valor_total || 0).toFixed(2).replace('.', ',')}`)
        .replace(/{{data}}/gi, s.data_servico || '')
        .replace(/{{carreta}}/gi, s.carreta || '')
        .replace(/{{conteiner}}/gi, s.conteiner || '');
      htmlFinal = mensagemHtml ? `<div style="font-family:sans-serif;margin-bottom:20px;">${mensagemHtml}</div>${html}` : html;
    } else {
      const reciboHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#1e3a5f;">Recibo de Serviço - Sistema APB</h2>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Cliente</strong></td><td style="padding:8px;border:1px solid #ddd;">${s.clientes?.nome || 'N/A'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Data</strong></td><td style="padding:8px;border:1px solid #ddd;">${s.data_servico || ''}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Carreta</strong></td><td style="padding:8px;border:1px solid #ddd;">${s.carreta || '—'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Contêiner</strong></td><td style="padding:8px;border:1px solid #ddd;">${s.conteiner || '—'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Transportadora</strong></td><td style="padding:8px;border:1px solid #ddd;">${s.transportadora || '—'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Local</strong></td><td style="padding:8px;border:1px solid #ddd;">${s.local_servico || '—'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Chapas</strong></td><td style="padding:8px;border:1px solid #ddd;">${s.quantidade_chapas ?? '—'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;"><strong>Valor Total</strong></td><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">R$ ${(s.valor_total || 0).toFixed(2).replace('.', ',')}</td></tr>
        </table>
        ${s.observacoes ? `<p><strong>Observações:</strong> ${s.observacoes}</p>` : ''}
      </div>`;
      const mensagemHtml = (mensagem || '')
        .replace(/\n/g, '<br>')
        .replace(/{{cliente}}/gi, s.clientes?.nome || '')
        .replace(/{{valor}}/gi, `R$ ${(s.valor_total || 0).toFixed(2).replace('.', ',')}`)
        .replace(/{{data}}/gi, s.data_servico || '')
        .replace(/{{carreta}}/gi, s.carreta || '')
        .replace(/{{conteiner}}/gi, s.conteiner || '');
      htmlFinal = mensagemHtml
        ? `<div style="font-family:sans-serif;margin-bottom:20px;">${mensagemHtml}</div>${reciboHtml}`
        : reciboHtml;
    }

    const fromEmail = from || `Sistema APB <${gmailUser}>`;

    const info = await transporter.sendMail({
      from: fromEmail,
      to: to.trim(),
      subject: subject || `Recibo - ${s.clientes?.nome || 'Serviço'} - ${s.data_servico || ''}`,
      html: htmlFinal,
    });

    res.json({ success: true, id: info.messageId });
  } catch (err) {
    console.error('enviarReciboEmail error:', err);
    res.status(500).json({ error: err.message || 'Erro ao enviar email' });
  }
});

/** Emitir NFS-e Manaus via NFE.io. Configure NFE_IO_API_KEY e NFE_IO_COMPANY_ID. */
exports.emitirNFSe = onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).send('');
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.NFE_IO_API_KEY;
  const companyId = process.env.NFE_IO_COMPANY_ID;
  if (!apiKey || !companyId) {
    return res.status(500).json({
      error: 'NFE_IO_API_KEY e NFE_IO_COMPANY_ID devem ser configurados nas variáveis de ambiente do Firebase.',
    });
  }

  try {
    const {
      servico,
      config_nfse = {},
    } = req.body || {};

    if (!servico) return res.status(400).json({ error: 'Dados do serviço obrigatórios' });

    const s = servico;
    const c = s.clientes || {};
    const cfg = config_nfse || {};

    const descricao =
      cfg.descricao_padrao ||
      `Serviço - ${s.carreta || ''} ${s.conteiner || ''}`.trim() ||
      'Prestação de serviço';
    const valor = parseFloat(s.valor_total) || 0;
    const issRate = parseFloat(cfg.iss_rate) || 2;
    const cityServiceCode = (cfg.city_service_code || '14.01').toString().replace(',', '.');

    const docBorrower = (c.cnpj || '').replace(/\D/g, '');
    if (!docBorrower || docBorrower.length < 11) {
      return res.status(400).json({ error: 'CNPJ/CPF do tomador (cliente) obrigatório' });
    }

    const cityCode = cfg.municipio_ibge || '1302603';
    const cityName = cfg.municipio_nome || 'Manaus';
    const state = (cfg.estado || c.estado || 'AM').substring(0, 2).toUpperCase();

    const borrowerType = docBorrower.length === 14 ? 'LegalEntity' : 'NaturalPerson';
    const payload = {
      description: descricao,
      cityServiceCode,
      issRate,
      servicesAmount: valor,
      issuedOn: s.data_servico || new Date().toISOString().split('T')[0],
      borrower: {
        type: borrowerType,
        federalTaxNumber: docBorrower,
        name: (c.nome || 'Cliente').substring(0, 115),
        email: c.email || undefined,
        address: {
          street: (c.endereco || 'Não informado').substring(0, 125),
          number: 'S/N',
          district: 'Centro',
          city: { code: cityCode, name: c.cidade || cityName },
          state,
          postalCode: (c.cep || '69000000').replace(/\D/g, '').substring(0, 8) || '69000000',
          country: 'BRA',
        },
      },
    };

    const apiUrl =
      process.env.NFE_IO_SANDBOX === 'true'
        ? 'https://api.sandbox.nfe.io'
        : 'https://api.nfe.io';

    const resp = await fetch(
      `${apiUrl}/v2/companies/${companyId}/serviceinvoices`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      const msg = data?.message || data?.error || data?.errors?.[0]?.message || resp.statusText;
      console.error('NFE.io error:', resp.status, data);
      return res.status(resp.status >= 400 ? resp.status : 500).json({ error: msg });
    }

    const id = data?.id || data?.serviceInvoice?.id;
    const numero = data?.number || data?.serviceInvoice?.number;
    const status = data?.status || data?.serviceInvoice?.status || 'Autorizada';

    res.json({
      success: true,
      id,
      numero_nf: numero || id,
      status,
      pdf_url: data?.pdfUrl || data?.serviceInvoice?.pdfUrl,
      xml_url: data?.xmlUrl || data?.serviceInvoice?.xmlUrl,
    });
  } catch (err) {
    console.error('emitirNFSe error:', err);
    res.status(500).json({ error: err.message || 'Erro ao emitir NFS-e' });
  }
});

/** Health check */
exports.health = onRequest((req, res) => {
  res.json({ status: 'ok', message: 'Sistema APB Cloud Functions' });
});
