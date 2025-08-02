import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import PublicReportView from './components/PublicReportView';
import { authService, User } from './services/authService';
import { shareService } from './services/shareService';

// Componente para rota de link curto
const ShortLinkRoute: React.FC = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  
  useEffect(() => {
    const processShortLink = async () => {
      try {
        console.log('🔗 Processando link curto:', shortCode);
        
        if (!shortCode) {
          console.error('❌ Código curto não fornecido');
          navigate('/login', { replace: true });
          return;
        }

        const shareLink = shareService.getShareLink(shortCode);
        console.log('🔍 Link encontrado:', shareLink);
        
        if (shareLink) {
          // Extrair parâmetros da URL original
          const url = new URL(shareLink.originalUrl);
          const params = url.searchParams;
          
          console.log('📋 Parâmetros extraídos:', {
            audience: params.get('audience'),
            product: params.get('product'),
            client: params.get('client'),
            month: params.get('month')
          });
          
          // Redirecionar para a página pública com os parâmetros
          const publicUrl = `/shared-report?${params.toString()}`;
          console.log('🔄 Redirecionando para:', publicUrl);
          
          navigate(publicUrl, { replace: true });
        } else {
          console.error('❌ Link não encontrado para o código:', shortCode);
          // Se o link não for encontrado, redirecionar para login
          navigate('/login', { replace: true });
        }
      } catch (error) {
        console.error('❌ Erro ao processar link curto:', error);
        navigate('/login', { replace: true });
      }
    };

    processShortLink();
  }, [shortCode, navigate]);

  // Mostrar loading enquanto processa o redirecionamento
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Carregando relatório...</p>
        <p className="text-sm text-gray-400 mt-2">Código: {shortCode}</p>
      </div>
    </div>
  );
};

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
    </Router>
  );
}

export default App;