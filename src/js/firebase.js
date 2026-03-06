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

// Serviços
export const getServicos = async () => {
  const q = query(
    collection(db, 'servicos'),
    orderBy('data_servico', 'desc')
  );
  const snapshot = await getDocs(q);
  const servicos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  // Enriquecer com dados de cliente e custos
  for (const servico of servicos) {
    if (servico.cliente_id) {
      const clienteSnap = await getDoc(doc(db, 'clientes', servico.cliente_id));
      if (clienteSnap.exists()) {
        servico.clientes = { id: clienteSnap.id, ...clienteSnap.data() };
      }
    }

    const custosSnapshot = await getDocs(
      query(collection(db, 'custos_servico'), where('servico_id', '==', servico.id))
    );
    servico.custos_servico = custosSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const pagamentosSnapshot = await getDocs(
      query(collection(db, 'pagamentos'), where('servico_id', '==', servico.id))
    );
    servico.pagamentos = pagamentosSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  return servicos;
};

async function enrichServicos(servicos) {
  for (const servico of servicos) {
    if (servico.cliente_id) {
      const clienteSnap = await getDoc(doc(db, 'clientes', servico.cliente_id));
      if (clienteSnap.exists()) servico.clientes = { id: clienteSnap.id, ...clienteSnap.data() };
    }
    const custosSnap = await getDocs(query(collection(db, 'custos_servico'), where('servico_id', '==', servico.id)));
    servico.custos_servico = custosSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const pagSnap = await getDocs(query(collection(db, 'pagamentos'), where('servico_id', '==', servico.id)));
    servico.pagamentos = pagSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  return servicos;
}

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

  for (const servico of servicos) {
    if (servico.cliente_id) {
      const clienteSnap = await getDoc(doc(db, 'clientes', servico.cliente_id));
      if (clienteSnap.exists()) {
        servico.clientes = { id: clienteSnap.id, ...clienteSnap.data() };
      }
    }

    const pagamentosSnapshot = await getDocs(
      query(collection(db, 'pagamentos'), where('servico_id', '==', servico.id))
    );
    servico.pagamentos = pagamentosSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  return servicos;
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
    for (const s of servicos) {
      if (s.cliente_id) {
        const cs = await getDoc(doc(db, 'clientes', s.cliente_id));
        if (cs.exists()) s.clientes = { id: cs.id, ...cs.data() };
      }
      const ps = await getDocs(query(collection(db, 'pagamentos'), where('servico_id', '==', s.id)));
      s.pagamentos = ps.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    callback(servicos);
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
    nome_empresa: 'Sistema APB',
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
