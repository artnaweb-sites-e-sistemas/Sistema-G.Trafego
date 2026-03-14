import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';


// Verificar se os certificados SSL existem
// const keyPath = path.resolve(__dirname, 'localhost-key.pem');
// const certPath = path.resolve(__dirname, 'localhost.pem');
// const hasSSLCerts = fs.existsSync(keyPath) && fs.existsSync(certPath);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    // ...(hasSSLCerts && {
    //   https: {
    //     key: fs.readFileSync(keyPath),
    //     cert: fs.readFileSync(certPath),
    //   },
    // }),
    port: 0, // Define porta 0 para usar uma porta livre aleatória
    host: true,
    // Permite popup do Facebook (FB.login) sem bloqueio por COOP
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none'
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    }
  }
});
