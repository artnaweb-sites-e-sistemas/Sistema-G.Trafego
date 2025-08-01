import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => void;
  onSignUp: (email: string, password: string, name: string) => void;
  onGoogleLogin: () => void;
  isLoading?: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLogin, 
  onSignUp, 
  onGoogleLogin, 
  isLoading = false 
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberUser, setRememberUser] = useState(false);

  // Carregar dados salvos ao inicializar
  useEffect(() => {
    const savedEmail = localStorage.getItem('gtrafego_remembered_email');
    const savedRemember = localStorage.getItem('gtrafego_remember_user');
    
    if (savedEmail && savedRemember === 'true') {
      setEmail(savedEmail);
      setRememberUser(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isSignUp) {
      if (!name.trim()) {
        setError('Nome é obrigatório');
        return;
      }
      if (email && password && name) {
        onSignUp(email, password, name);
      }
    } else {
      if (email && password) {
        // Salvar email se "lembrar" estiver marcado
        if (rememberUser) {
          localStorage.setItem('gtrafego_remembered_email', email);
          localStorage.setItem('gtrafego_remember_user', 'true');
        } else {
          localStorage.removeItem('gtrafego_remembered_email');
          localStorage.removeItem('gtrafego_remember_user');
        }
        
        onLogin(email, password);
      }
    }
  };

  const handleGoogleLogin = () => {
    setError(null);
    onGoogleLogin();
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setEmail('');
    setPassword('');
    setName('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo e Título */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg mb-4">
            <div className="w-8 h-8 bg-white rounded-md shadow-sm"></div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            G.Trafego
          </h2>
          <p className="text-gray-300 text-sm">
            Dashboard de Marketing Digital
          </p>
        </div>

        {/* Card de Login/Cadastro */}
        <div className="bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-semibold text-white">
              {isSignUp ? 'Criar conta' : 'Acesse sua conta'}
            </h3>
            <p className="text-gray-400 mt-2">
              {isSignUp 
                ? 'Preencha os dados para criar sua conta' 
                : 'Entre com suas credenciais para acessar o dashboard'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Nome (apenas no cadastro) */}
            {isSignUp && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Nome completo
                </label>
                <div className="relative">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required={isSignUp}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 pl-12 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400"
                    placeholder="Seu nome completo"
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            )}

            {/* Campo Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 pl-12 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400"
                  placeholder="seu@email.com"
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pl-12 pr-12 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400"
                  placeholder="••••••••"
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Checkbox Lembrar do Usuário (apenas no login) */}
            {!isSignUp && (
              <div className="flex items-center">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  checked={rememberUser}
                  onChange={(e) => setRememberUser(e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700"
                />
                <label htmlFor="remember" className="ml-2 block text-sm text-gray-300">
                  Lembrar do usuário
                </label>
              </div>
            )}

            {/* Botão de Login/Cadastro */}
            <button
              type="submit"
              disabled={isLoading || !email || !password || (isSignUp && !name)}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isSignUp ? 'Criando conta...' : 'Entrando...'}
                </div>
              ) : (
                isSignUp ? 'Criar conta' : 'Entrar no Dashboard'
              )}
            </button>
          </form>

          {/* Divisor */}
          <div className="my-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">ou</span>
              </div>
            </div>
          </div>

          {/* Botão Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex justify-center items-center py-3 px-4 border border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar com Google
          </button>

          {/* Erro */}
          {error && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Alternar entre Login e Cadastro */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              {isSignUp ? 'Já tem uma conta?' : 'Não tem uma conta?'}{' '}
              <button
                onClick={toggleMode}
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                {isSignUp ? 'Faça login' : 'Criar conta'}
              </button>
            </p>
          </div>

          {/* Informações Adicionais */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Ao continuar, você concorda com nossos{' '}
              <a href="/politicas-de-privacidade.html" className="text-purple-400 hover:text-purple-300">
                Termos de Uso
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            © 2025 G.Trafego. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen; 