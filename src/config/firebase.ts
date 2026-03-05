// Import the functions you need from the SDKs you need
import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase - Force new configuration and prevent old project usage
let app;

try {
  // Verificação de segurança: se as variáveis de ambiente estão presentes
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('❌ ERRO CRÍTICO: Variáveis de ambiente do Firebase não configuradas!');
    console.warn('Verifique se você adicionou VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, etc, no Vercel/Ambiente.');
  }

  const existingApps = getApps();

  if (existingApps.length > 0) {
    // Tentar encontrar o app correto ou limpar apps antigos
    for (const existingApp of existingApps) {
      const existingProjectId = existingApp.options.projectId;

      // Se for o projeto antigo ou um projeto diferente do atual, deletar a instância (limpeza)
      if (existingProjectId === 'dashboard---g-trafego' || existingProjectId !== firebaseConfig.projectId) {
        console.log(`🧹 Firebase: Limpando instância antiga (${existingProjectId})`);
        // deleteApp retorna uma Promise, mas aqui estamos em um fluxo síncrono de inicialização
        // Geralmente é melhor apenas não reutilizar, mas se houver muitos apps pode dar erro
        deleteApp(existingApp).catch(e => console.warn('Erro ao deletar app:', e));
      } else if (existingProjectId === firebaseConfig.projectId) {
        app = existingApp;
      }
    }
  }

  // Se não temos app ou ele foi deletado, criar novo
  if (!app) {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase: Inicializado com sucesso');
  }

} catch (error) {
  console.error('❌ Firebase: Erro crítico na inicialização:', error);

  // Em caso de erro, construir um nome único para tentar novamente
  try {
    app = initializeApp(firebaseConfig, `gtrafego-app-${Date.now()}`);
  } catch (recoveryError) {
    console.error('❌ Firebase: Falha na recuperação:', recoveryError);
  }
}

// Initialize Firebase services
// Se o app falhou completamente, os serviços vão falhar aqui
// mas ao menos teremos os logs no console para o usuário ver
export const db = getFirestore(app!);
export const auth = getAuth(app!);

export default app;