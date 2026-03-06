import { getConfigNFSe, saveConfigNFSe, requireAuth } from './firebase.js';
import {
  setActiveMenuItem,
  showError,
  showSuccess,
  setupNavbarAuth,
} from './utils.js';
import { initApp } from './app-init.js';

async function salvar() {
  const dados = {
    city_service_code: document.getElementById('nfse-codigo')?.value?.trim() || '14.01',
    iss_rate: parseFloat(document.getElementById('nfse-iss')?.value) || 2,
    descricao_padrao:
      document.getElementById('nfse-descricao')?.value?.trim() ||
      'Serviço de carregamento e descarregamento de chapas',
    municipio_ibge: '1302603',
    municipio_nome: 'Manaus',
    estado: 'AM',
  };
  try {
    await saveConfigNFSe(dados);
    showSuccess('Configuração NFS-e salva!');
  } catch (err) {
    showError('Erro ao salvar: ' + err.message);
  }
}

document.getElementById('btn-salvar-nfse')?.addEventListener('click', salvar);

requireAuth().then(async (user) => {
  await initApp('nfse');
  await setupNavbarAuth(user);
  const cfg = await getConfigNFSe();
  document.getElementById('nfse-codigo').value = cfg.city_service_code || '14.01';
  document.getElementById('nfse-iss').value = cfg.iss_rate ?? 2;
  document.getElementById('nfse-descricao').value = cfg.descricao_padrao || '';
});
