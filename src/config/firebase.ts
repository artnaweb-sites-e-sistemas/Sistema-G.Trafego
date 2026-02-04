// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
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
  // 🚨 CORREÇÃO CRÍTICA: Deletar qualquer instância existente que possa ter configuração antiga
  const existingApps = getApps();

  if (existingApps.length > 0) {
    for (const existingApp of existingApps) {
      const existingProjectId = existingApp.options.projectId;

      // Se for o projeto antigo, deletar a instância
      if (existingProjectId === 'dashboard---g-trafego') {
        try {
          const { deleteApp } = require("firebase/app");
          deleteApp(existingApp).then(() => {
            // Instância antiga deletada
          }).catch((error: any) => {
            console.warn('⚠️ Firebase: Erro ao deletar instância antiga:', error);
          });
        } catch (importError) {
          console.warn('⚠️ Firebase: Não foi possível importar deleteApp:', importError);
        }
      } else if (existingProjectId === firebaseConfig.projectId) {
        app = existingApp;
      }
    }
  }

  // Se não temos app ou ele foi deletado, criar novo
  if (!app) {
    app = initializeApp(firebaseConfig);
  }

  // Verificação final da configuração
  const finalProjectId = app.options.projectId;

  if (finalProjectId !== firebaseConfig.projectId) {
    console.error('❌ Firebase: PROJETO INCORRETO AINDA ATIVO!', {
      expected: firebaseConfig.projectId,
      actual: finalProjectId
    });
    throw new Error(`Projeto Firebase incorreto: ${finalProjectId} (esperado: ${firebaseConfig.projectId})`);
  }

} catch (error) {
  console.error('❌ Firebase: Erro crítico na inicialização:', error);

  // Em caso de erro, tentar forçar nova inicialização
  try {
    app = initializeApp(firebaseConfig, `app-${Date.now()}`); // Nome único
  } catch (recoveryError) {
    console.error('❌ Firebase: Falha na recuperação:', recoveryError);
    throw new Error('Falha crítica na inicialização do Firebase - Limpe o cache do navegador');
  }
}

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;