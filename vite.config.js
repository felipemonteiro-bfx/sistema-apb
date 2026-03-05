import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3111,
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: 'index.html',
        login: 'src/pages/login.html',
        dashboard: 'src/pages/index.html',
        clientes: 'src/pages/clientes.html',
        chapas: 'src/pages/chapas.html',
        servicos: 'src/pages/servicos.html',
        financeiro: 'src/pages/financeiro.html',
      },
    },
  },
});
