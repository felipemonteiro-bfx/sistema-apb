import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  onSnapshot,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
  throw new Error('Configure o .env.local com as credenciais do Firebase. Veja FIREBASE_SETUP.md');
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Persistência offline
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') console.warn('Firestore offline: múltiplas abas abertas');
  else if (err.code === 'unimplemented') console.warn('Firestore offline não suportado');
});

/** Estado de sincronização. Callback quando muda. */
let _syncCallbacks = [];
export const onSyncStatusChange = (callback) => {
  _syncCallbacks.push(callback);
  callback(navigator.onLine ? 'sincronizado' : 'offline');
  return () => { _syncCallbacks = _syncCallbacks.filter((c) => c !== callback); };
};
export const getSyncStatus = () => (navigator.onLine ? 'sincronizado' : 'offline');

if (typeof window !== 'undefined') {
  ['online', 'offline'].forEach((ev) => {
    window.addEventListener(ev, () => {
      const status = navigator.onLine ? 'sincronizado' : 'offline';
      _syncCallbacks.forEach((cb) => cb(status));
    });
  });
}

// === Firebase Auth ===
export const signInWithEmail = (email, senha) =>
  signInWithEmailAndPassword(auth, email, senha);

export const createUser = (email, senha) =>
  createUserWithEmailAndPassword(auth, email, senha);

export const signInWithGoogle = () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const logout = () => signOut(auth);

export const onAuthReady = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/** Acesso direto (sem login). Retorna Promise que resolve com user simulado. */
export const requireAuth = () => {
  return Promise.resolve({ email: 'Acesso direto' });
};

// Clientes
export const getClientes = async () => {
  const q = query(
    collection(db, 'clientes'),
    where('ativo', '==', true),
    orderBy('nome')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/** Inscreve para atualizações em tempo real de clientes. Retorna função para cancelar. */
export const subscribeClientes = (callback) => {
  const q = query(
    collection(db, 'clientes'),
    where('ativo', '==', true),
    orderBy('nome')
  );
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(data);
  });
};

export const insertCliente = async (cliente) => {
  const docRef = await addDoc(collection(db, 'clientes'), {
    ...cliente,
    created_at: new Date(),
  });
  return { id: docRef.id, ...cliente };
};

export const updateCliente = async (id, updates) => {
  await updateDoc(doc(db, 'clientes', id), updates);
  return { id, ...updates };
};

// Chapas
export const getChapas = async () => {
  const q = query(
    collection(db, 'chapas'),
    where('ativo', '==', true),
    orderBy('nome')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/** Inscreve para atualizações em tempo real de chapas. Retorna função para cancelar. */
export const subscribeChapas = (callback) => {
  const q = query(
    collection(db, 'chapas'),
    where('ativo', '==', true),
    orderBy('nome')
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const insertChapa = async (chapa) => {
  const docRef = await addDoc(collection(db, 'chapas'), {
    ...chapa,
    created_at: new Date(),
  });
  return { id: docRef.id, ...chapa };
};

export const updateChapa = async (id, updates) => {
  await updateDoc(doc(db, 'chapas', id), updates);
  return { id, ...updates };
};

const CHUNK_SIZE = 30;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Busca clientes por IDs em batch (max 30 por query). */
async function getClientesByIds(ids) {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return {};
  const map = {};
  const chunks = chunk(unique, CHUNK_SIZE);
  const promises = chunks.map(async (idsChunk) => {
    const refs = idsChunk.map((id) => doc(db, 'clientes', id));
    const snaps = await Promise.all(refs.map((ref) => getDoc(ref)));
    snaps.forEach((snap, i) => {
      if (snap.exists()) map[idsChunk[i]] = { id: snap.id, ...snap.data() };
    });
  });
  await Promise.all(promises);
  return map;
}

/** Busca custos e pagamentos por servico_ids em batch. */
async function getCustosEPagamentosByServicoIds(servicoIds) {
  const ids = [...new Set(servicoIds)];
  if (ids.length === 0) return { custos: {}, pagamentos: {} };
  const custosByServico = {};
  const pagamentosByServico = {};
  ids.forEach((id) => {
    custosByServico[id] = [];
    pagamentosByServico[id] = [];
  });
  const chunks = chunk(ids, CHUNK_SIZE);
  const custosPromises = chunks.map(async (idsChunk) => {
    const q = query(
      collection(db, 'custos_servico'),
      where('servico_id', 'in', idsChunk)
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      const data = { id: d.id, ...d.data() };
      if (data.servico_id && custosByServico[data.servico_id])
        custosByServico[data.servico_id].push(data);
    });
  });
  const pagamentosPromises = chunks.map(async (idsChunk) => {
    const q = query(
      collection(db, 'pagamentos'),
      where('servico_id', 'in', idsChunk)
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      const data = { id: d.id, ...d.data() };
      if (data.servico_id && pagamentosByServico[data.servico_id])
        pagamentosByServico[data.servico_id].push(data);
    });
  });
  await Promise.all([...custosPromises, ...pagamentosPromises]);
  return { custos: custosByServico, pagamentos: pagamentosByServico };
}

async function enrichServicos(servicos) {
  if (servicos.length === 0) return servicos;
  const clienteIds = servicos.map((s) => s.cliente_id).filter(Boolean);
  const servicoIds = servicos.map((s) => s.id);
  const [clientesMap, { custos: custosByServico, pagamentos: pagamentosByServico }] = await Promise.all([
    getClientesByIds(clienteIds),
    getCustosEPagamentosByServicoIds(servicoIds),
  ]);
  servicos.forEach((s) => {
    if (s.cliente_id && clientesMap[s.cliente_id]) s.clientes = clientesMap[s.cliente_id];
    s.custos_servico = custosByServico[s.id] || [];
    s.pagamentos = pagamentosByServico[s.id] || [];
  });
  return servicos;
}

/** Serviços leves para busca global (id, cliente, carreta, conteiner, transportadora). */
export const getServicosParaBusca = async () => {
  const q = query(
    collection(db, 'servicos'),
    orderBy('data_servico', 'desc')
  );
  const snapshot = await getDocs(q);
  const servicos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  const clienteIds = [...new Set(servicos.map((s) => s.cliente_id).filter(Boolean))];
  const clientesMap = await getClientesByIds(clienteIds);
  servicos.forEach((s) => {
    if (s.cliente_id && clientesMap[s.cliente_id]) s.clientes = clientesMap[s.cliente_id];
  });
  return servicos;
};

// Serviços
export const getServicos = async () => {
  const q = query(
    collection(db, 'servicos'),
    orderBy('data_servico', 'desc')
  );
  const snapshot = await getDocs(q);
  const servicos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  return enrichServicos(servicos);
};

/** Inscreve para atualizações em tempo real de serviços. Retorna função para cancelar. */
export const subscribeServicos = (callback) => {
  const q = query(collection(db, 'servicos'), orderBy('data_servico', 'desc'));
  return onSnapshot(q, async (snapshot) => {
    const servicos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    const enriched = await enrichServicos(servicos);
    callback(enriched);
  });
};

export const insertServico = async (servico) => {
  const docRef = await addDoc(collection(db, 'servicos'), {
    ...servico,
    created_at: new Date(),
  });
  return { id: docRef.id, ...servico };
};

export const updateServico = async (id, updates) => {
  await updateDoc(doc(db, 'servicos', id), updates);
  return { id, ...updates };
};

// Custos
export const insertCusto = async (custo) => {
  const docRef = await addDoc(collection(db, 'custos_servico'), {
    ...custo,
    created_at: new Date(),
  });
  return { id: docRef.id, ...custo };
};

export const deleteCusto = async (id) => {
  await deleteDoc(doc(db, 'custos_servico', id));
};

export const deleteCustosByServico = async (servicoId) => {
  const snapshot = await getDocs(
    query(collection(db, 'custos_servico'), where('servico_id', '==', servicoId))
  );
  for (const d of snapshot.docs) {
    await deleteDoc(doc(db, 'custos_servico', d.id));
  }
};

// Pagamentos
export const insertPagamento = async (pagamento) => {
  const docRef = await addDoc(collection(db, 'pagamentos'), {
    ...pagamento,
    created_at: new Date(),
  });
  return { id: docRef.id, ...pagamento };
};

export const updatePagamento = async (id, updates) => {
  await updateDoc(doc(db, 'pagamentos', id), updates);
  return { id, ...updates };
};

// Dashboard
export const getDashboardData = async () => {
  const currentMonth = new Date();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const servicosSnapshot = await getDocs(
    query(
      collection(db, 'servicos'),
      where('data_servico', '>=', firstDay),
      where('data_servico', '<=', lastDay)
    )
  );

  const pagamentosSnapshot = await getDocs(
    query(
      collection(db, 'pagamentos'),
      where('created_at', '>=', firstDay),
      where('created_at', '<=', lastDay)
    )
  );

  const clientesSnapshot = await getDocs(
    query(collection(db, 'clientes'), where('ativo', '==', true))
  );

  return {
    servicos: servicosSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    pagamentos: pagamentosSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    clientes: clientesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  };
};

// Notas Fiscais
export const getNotasFiscaisByServico = async (servicoId) => {
  const q = query(
    collection(db, 'notas_fiscais'),
    where('servico_id', '==', servicoId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const insertNotaFiscal = async (nf) => {
  const docRef = await addDoc(collection(db, 'notas_fiscais'), {
    ...nf,
    created_at: new Date(),
  });
  return { id: docRef.id, ...nf };
};

export const updateNotaFiscal = async (id, updates) => {
  await updateDoc(doc(db, 'notas_fiscais', id), updates);
  return { id, ...updates };
};

/** Enriquecimento leve: apenas cliente + pagamentos (para contas a receber). */
async function enrichContasReceber(servicos) {
  if (servicos.length === 0) return servicos;
  const clienteIds = servicos.map((s) => s.cliente_id).filter(Boolean);
  const servicoIds = servicos.map((s) => s.id);
  const [clientesMap, { pagamentos: pagamentosByServico }] = await Promise.all([
    getClientesByIds(clienteIds),
    getCustosEPagamentosByServicoIds(servicoIds),
  ]);
  servicos.forEach((s) => {
    if (s.cliente_id && clientesMap[s.cliente_id]) s.clientes = clientesMap[s.cliente_id];
    s.pagamentos = pagamentosByServico[s.id] || [];
  });
  return servicos;
}

// Contas a receber
export const getContasReceber = async () => {
  const q = query(
    collection(db, 'servicos'),
    where('status', '!=', 'recebido'),
    orderBy('status'),
    orderBy('data_servico')
  );
  const snapshot = await getDocs(q);
  const servicos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  return enrichContasReceber(servicos);
};

/** Inscreve para contas a receber em tempo real. Retorna função para cancelar. */
export const subscribeContasReceber = (callback) => {
  const q = query(
    collection(db, 'servicos'),
    where('status', '!=', 'recebido'),
    orderBy('status'),
    orderBy('data_servico')
  );
  return onSnapshot(q, async (snapshot) => {
    const servicos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    const enriched = await enrichContasReceber(servicos);
    callback(enriched);
  });
};

// Config Recibo (template de recibo)
const CONFIG_RECIBO_ID = 'recibo';
export const getConfigRecibo = async () => {
  const snap = await getDoc(doc(db, 'config', CONFIG_RECIBO_ID));
  if (!snap.exists()) return getConfigReciboDefaults();
  return { id: snap.id, ...snap.data() };
};

export const saveConfigRecibo = async (data) => {
  await setDoc(doc(db, 'config', CONFIG_RECIBO_ID), { ...data, updated_at: new Date() }, { merge: true });
};

// Config Empresa (dados gerais, padrões, impostos)
const CONFIG_EMPRESA_ID = 'empresa';
export const getConfigEmpresa = async () => {
  const snap = await getDoc(doc(db, 'config', CONFIG_EMPRESA_ID));
  if (!snap.exists()) return getConfigEmpresaDefaults();
  return { id: snap.id, ...snap.data() };
};

export const saveConfigEmpresa = async (data) => {
  await setDoc(doc(db, 'config', CONFIG_EMPRESA_ID), { ...data, updated_at: new Date() }, { merge: true });
};

function getConfigEmpresaDefaults() {
  return {
    nome_empresa: 'APB Carga e Descarga',
    cnpj: '',
    endereco: '',
    cep: '',
    cidade: '',
    estado: '',
    telefone: '',
    email: 'apbcargaedescarga@gmail.com',
    status_padrao_servico: 'agendado',
    prazo_pagamento_default: 30,
    taxa_imposto: 0.0785, // 7.85%
  };
}

// Config NFS-e (Manaus-AM)
const CONFIG_NFSE_ID = 'nfse';
export const getConfigNFSe = async () => {
  const snap = await getDoc(doc(db, 'config', CONFIG_NFSE_ID));
  if (!snap.exists()) return getConfigNFSeDefaults();
  return { id: snap.id, ...snap.data() };
};

export const saveConfigNFSe = async (data) => {
  await setDoc(doc(db, 'config', CONFIG_NFSE_ID), { ...data, updated_at: new Date() }, { merge: true });
};

function getConfigNFSeDefaults() {
  return {
    habilitado: false,
    city_service_code: '14.01', // Manaus - Código Lei 714 (ex: serviços de carga/descarga)
    descricao_padrao: 'Serviço de carregamento e descarregamento de chapas',
    iss_rate: 2,
    municipio_ibge: '1302603',
    municipio_nome: 'Manaus',
    estado: 'AM',
  };
}

function getConfigReciboDefaults() {
  return {
    titulo: 'Recibo de Serviço',
    nome_empresa: 'APB Carga e Descarga',
    email_remetente: 'apbcargaedescarga@gmail.com',
    nome_remetente: 'APB Carga e Descarga',
    cabecalho: '',
    rodape: 'Obrigado pela preferência.',
    campos_tabela: [
      { label: 'Cliente', chave: 'cliente' },
      { label: 'Data', chave: 'data' },
      { label: 'Carreta', chave: 'carreta' },
      { label: 'Contêiner', chave: 'conteiner' },
      { label: 'Transportadora', chave: 'transportadora' },
      { label: 'Local', chave: 'local' },
      { label: 'Chapas', chave: 'chapas' },
      { label: 'Valor Total', chave: 'valor_total' },
    ],
    mensagem_email: 'Prezado(a) {{cliente}},\n\nSegue o recibo do serviço realizado em {{data}}.\n\nValor total: {{valor}}\n\nAtenciosamente.',
    assunto_email: 'Recibo - {{cliente}} - {{data}}',
  };
}
