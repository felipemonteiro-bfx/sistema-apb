import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    port: 3111,
    open: true,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sistema APB',
        short_name: 'APB',
        description: 'Gestão de clientes, chapas, serviços e financeiro',
        theme_color: '#1e3a5f',
        background_color: '#0f2744',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.(tailwindcss|jsdelivr)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: 'index.html',
        landing: 'src/pages/landing.html',
        login: 'src/pages/login.html',
        'criar-admin': 'src/pages/criar-admin.html',
        dashboard: 'src/pages/index.html',
        clientes: 'src/pages/clientes.html',
        chapas: 'src/pages/chapas.html',
        servicos: 'src/pages/servicos.html',
        recibo: 'src/pages/recibo.html',
        nfse: 'src/pages/nfse.html',
        financeiro: 'src/pages/financeiro.html',
        configuracoes: 'src/pages/configuracoes.html',
      },
    },
  },
});
