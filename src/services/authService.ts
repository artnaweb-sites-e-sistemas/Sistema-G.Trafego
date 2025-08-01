import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
  UserCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  photoURL?: string;
  createdAt: Date;
}

class AuthService {
  private currentUser: User | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    // Escutar mudanças de autenticação
    this.unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await this.loadUserData(firebaseUser);
      } else {
        this.currentUser = null;
        localStorage.removeItem('gtrafego_user');
      }
    });
  }

  // Carregar dados do usuário do Firestore
  private async loadUserData(firebaseUser: FirebaseUser): Promise<void> {
    try {
      console.log('Carregando dados do usuário:', firebaseUser.uid);
      
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        this.currentUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: userData.name || firebaseUser.displayName || 'Usuário',
          role: userData.role || 'user',
          photoURL: firebaseUser.photoURL || undefined,
          createdAt: userData.createdAt?.toDate() || new Date()
        };
        console.log('Usuário carregado do Firestore:', this.currentUser.name);
      } else {
        // Criar novo usuário no Firestore
        const newUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'Usuário',
          role: 'user',
          photoURL: firebaseUser.photoURL || undefined,
          createdAt: new Date()
        };
        
        console.log('Criando novo usuário no Firestore:', newUser.name);
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          photoURL: newUser.photoURL,
          createdAt: newUser.createdAt
        });
        
        this.currentUser = newUser;
        console.log('Novo usuário criado com sucesso');
      }
      
      localStorage.setItem('gtrafego_user', JSON.stringify(this.currentUser));
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      
      // Se houver erro no Firestore, criar usuário básico
      if (firebaseUser) {
        this.currentUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'Usuário',
          role: 'user',
          photoURL: firebaseUser.photoURL || undefined,
          createdAt: new Date()
        };
        localStorage.setItem('gtrafego_user', JSON.stringify(this.currentUser));
        console.log('Usuário criado localmente devido a erro no Firestore');
      }
    }
  }

  // Verificar se usuário está logado
  isAuthenticated(): boolean {
    return auth.currentUser !== null;
  }

  // Fazer login com email e senha
  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('Tentando login com:', email);
      const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
      await this.loadUserData(userCredential.user);
      
      return { 
        success: true, 
        user: this.currentUser || undefined
      };
    } catch (error: any) {
      console.error('Erro no login:', error);
      let errorMessage = 'Erro ao fazer login';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuário não encontrado';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Senha incorreta';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Erro de conexão. Verifique sua internet';
          break;
        default:
          errorMessage = error.message || 'Erro inesperado';
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  // Criar conta com email e senha
  async signUp(email: string, password: string, name: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('Tentando criar conta para:', email);
      const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Criar perfil do usuário no Firestore
      const newUser: User = {
        uid: userCredential.user.uid,
        email: email,
        name: name,
        role: 'user',
        createdAt: new Date()
      };
      
      console.log('Criando perfil no Firestore:', newUser.name);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
      });
      
      this.currentUser = newUser;
      localStorage.setItem('gtrafego_user', JSON.stringify(this.currentUser));
      
      console.log('Conta criada com sucesso');
      return { 
        success: true, 
        user: this.currentUser 
      };
    } catch (error: any) {
      console.error('Erro ao criar conta:', error);
      let errorMessage = 'Erro ao criar conta';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este email já está em uso';
          break;
        case 'auth/weak-password':
          errorMessage = 'A senha deve ter pelo menos 6 caracteres';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Erro de conexão. Verifique sua internet';
          break;
        default:
          errorMessage = error.message || 'Erro inesperado';
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  // Login com Google
  async loginWithGoogle(): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      console.log('Iniciando login com Google...');
      const userCredential: UserCredential = await signInWithPopup(auth, provider);
      console.log('Login com Google bem-sucedido:', userCredential.user.email);
      
      await this.loadUserData(userCredential.user);
      
      return { 
        success: true, 
        user: this.currentUser || undefined
      };
    } catch (error: any) {
      console.error('Erro no login com Google:', error);
      let errorMessage = 'Erro ao fazer login com Google';
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Login cancelado pelo usuário';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Popup bloqueado. Permita popups para este site';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Login cancelado';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Erro de conexão. Verifique sua internet';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Login com Google não está habilitado';
          break;
        default:
          errorMessage = error.message || 'Erro inesperado no login com Google';
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  // Fazer logout
  async logout(): Promise<void> {
    try {
      await signOut(auth);
      this.currentUser = null;
      localStorage.removeItem('gtrafego_user');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }

  // Obter usuário atual
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Verificar se é admin
  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  // Limpar listener quando necessário
  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

export const authService = new AuthService();
export default authService; 