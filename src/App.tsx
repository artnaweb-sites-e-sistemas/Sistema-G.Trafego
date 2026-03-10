import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import LoginScreen from './pages/LoginScreen';
import Dashboard from './pages/Dashboard';
import PublicReportView from './pages/PublicReportView';
import MigrationStatus from './components/MigrationStatus';
import { authService, User } from './services/authService';
import { shareService } from './services/shareService';
import { firestoreShareService } from './services/firestoreShareService';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar autenticação inicial
    const checkAuth = () => {
      if (authService.isAuthenticated()) {
        const user = authService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    try {
      setLoginError(null);
      const result = await authService.login(email, password);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        toast.success('Login realizado com sucesso!');
      } else {
        throw new Error(result.error || 'Erro ao fazer login');
      }
    } catch (error: any) {
      setLoginError(error.message);
      toast.error(error.message);
    }
  };

  const handleSignUp = async (email: string, password: string, name: string) => {
    try {
      setLoginError(null);
      const result = await authService.signUp(email, password, name);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        toast.success('Conta criada com sucesso!');
      } else {
        throw new Error(result.error || 'Erro ao criar conta');
      }
    } catch (error: any) {
      setLoginError(error.message);
      toast.error(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoginError(null);
      const result = await authService.loginWithGoogle();
      if (result.success && result.user) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        toast.success('Login com Google realizado com sucesso!');
      } else {
        throw new Error(result.error || 'Erro ao fazer login com Google');
      }
    } catch (error: any) {
      setLoginError(error.message);
      toast.error(error.message);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
    toast.success('Logout realizado com sucesso!');
  };

  // Componente para rota protegida
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Carregando...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
  };

  // Componente para rota de link curto — suporta acesso público (sem login)
  const ShortLinkRoute = () => {
    const { shortCode } = useParams<{ shortCode: string }>();
    const [status, setStatus] = useState<'loading' | 'notfound' | 'auth_error'>('loading');
    const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);

    useEffect(() => {
      if (!shortCode) { setStatus('notfound'); return; }

      const normalizeUrl = (url: string): string => {
        try {
          const parsed = new URL(url, window.location.origin);
          return parsed.pathname + parsed.search;
        } catch {
          if (url.startsWith('/')) return url;
          return '/' + url;
        }
      };

      const resolve = async () => {
        // 1) Tentar cache local primeiro (usuário já logado)
        const local = shareService.getShareLink(shortCode);
        if (local?.originalUrl) {
          window.location.href = normalizeUrl(local.originalUrl);
          return;
        }

        // 2) Garantir auth (anônima se necessário) para ler do Firestore
        let authFailedWithDomain = false;
        await new Promise<void>((res) => {
          const unsub = onAuthStateChanged(auth, async (user) => {
            unsub();
            if (!user) {
              try {
                await signInAnonymously(auth);
              } catch (err: any) {
                const code = err?.code || '';
                setAuthErrorCode(code);
                if (code === 'auth/unauthorized-domain') {
                  authFailedWithDomain = true;
                  setStatus('auth_error');
                }
              }
            }
            res();
          });
        });

        if (authFailedWithDomain) return;

        // 3) Buscar no Firestore (agora com auth válido)
        try {
          const remote = await firestoreShareService.getShareLink(shortCode);
          if (remote?.originalUrl) {
            window.location.href = normalizeUrl(remote.originalUrl);
            return;
          }
        } catch { /* link não encontrado */ }

        setStatus('notfound');
      };

      resolve();
    }, [shortCode]);

    if (status === 'loading') {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Carregando relatório...</p>
          </div>
        </div>
      );
    }

    if (status === 'auth_error' && authErrorCode === 'auth/unauthorized-domain') {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="text-white text-center max-w-md">
            <div className="text-amber-400 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2">Domínio não autorizado</h2>
            <p className="text-slate-300 mb-4">
              Para que clientes acessem relatórios públicos neste domínio, adicione-o em:
            </p>
            <p className="text-amber-300 font-mono text-sm bg-gray-800 p-3 rounded mb-4">
              Firebase Console → Authentication → Settings → Authorized domains
            </p>
            <p className="text-slate-400 text-sm">
              Domínio atual: <strong>{typeof window !== 'undefined' ? window.location.hostname : ''}</strong>
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-white text-center max-w-md">
          <div className="text-slate-400 text-5xl mb-4">🔗</div>
          <h2 className="text-xl font-semibold mb-2">Link não encontrado</h2>
          <p className="text-slate-300 mb-4">
            Este link pode ter expirado ou não existe. Verifique o endereço ou peça um novo link ao responsável.
          </p>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {/* Migration Status Banner */}
      {isAuthenticated && <MigrationStatus />}

      <Routes>
        {/* Rota pública para visualização de relatórios compartilhados */}
        <Route
          path="/shared-report"
          element={<PublicReportView />}
        />

        {/* Rota para links curtos */}
        <Route
          path="/r/:shortCode"
          element={<ShortLinkRoute />}
        />

        {/* Rota de login */}
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <div className="min-h-screen bg-gray-900">
                <LoginScreen
                  onLogin={handleLogin}
                  onSignUp={handleSignUp}
                  onGoogleLogin={handleGoogleLogin}
                />
                <Toaster position="top-right" />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Rota principal do dashboard (protegida) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard
                currentUser={currentUser!}
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />

        {/* Redirecionar qualquer outra rota para o dashboard */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>

      {/* Toast container global */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#f1f5f9'
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f1f5f9'
            }
          }
        }}
      />
    </Router>
  );
}

export default App;