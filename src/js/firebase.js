import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
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

if (!firebaseConfig.projectId) {
  throw new Error('Missing Firebase configuration. Check .env.local');
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

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

/** Redireciona para login se não autenticado. Retorna Promise que resolve com o user. */
export const requireAuth = () => {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (user) {
        resolve(user);
      } else {
        window.location.href = '/src/pages/login.html';
      }
    });
  });
};

// Clientes
export const getClientes = async () => {
  const q = query(
    collection(db, 'clientes'),
    where('ativo', '==', true),
    orderBy('nome')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
  const servicos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  // Enriquecer com cliente e pagamentos
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
    servico.pagamentos = pagamentosSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  return servicos;
};
