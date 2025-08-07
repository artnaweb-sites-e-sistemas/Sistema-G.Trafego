import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle, XCircle, RefreshCw, User, LogOut, Building } from 'lucide-react';
import { metaAdsService, FacebookUser, AdAccount, BusinessManager } from '../services/metaAdsService';
import { createPortal } from 'react-dom';

interface MetaAdsConfigProps {
  onConfigSaved: () => void;
  onDataSourceChange?: (source: 'manual' | 'facebook' | null, connected: boolean) => void;
}

const MetaAdsConfig: React.FC<MetaAdsConfigProps> = ({ onConfigSaved, onDataSourceChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<FacebookUser | null>(null);
  const [businessManagers, setBusinessManagers] = useState<BusinessManager[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessManager | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AdAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelectingAccount, setIsSelectingAccount] = useState(false);
  const [step, setStep] = useState<'login' | 'selectBusiness' | 'selectAccount' | 'connected' | 'permissionsRequired' | 'tokenConfig'>('login');
  const [accessToken, setAccessToken] = useState('');
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [dataSource, setDataSource] = useState<'manual' | 'facebook' | null>(null);
  const [isFacebookConnected, setIsFacebookConnected] = useState(false);
  
  const [rateLimitStatus, setRateLimitStatus] = useState<{
    attempts: number;
    maxAttempts: number;
    canAttempt: boolean;
    nextAttemptDelay?: number;
    facebookRateLimit?: boolean;
    facebookRateLimitUntil?: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const updateRateLimitStatus = async () => {
      const status = await metaAdsService.getOAuthRateLimitStatus();
      setRateLimitStatus(status);
    };

    updateRateLimitStatus();
    const interval = setInterval(updateRateLimitStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const setFacebookData = () => {
    setDataSource('facebook');
    setIsFacebookConnected(true);
    onDataSourceChange?.('facebook', true);
  };

  const setManualData = () => {
    const savedUser = localStorage.getItem('facebookUser');
    if (savedUser) {
      console.log('Usuario salvo encontrado, nao mudando para manual');
      return;
    }
    
    setDataSource('manual');
    setIsFacebookConnected(false);
    onDataSourceChange?.('manual', false);
  };

  const clearFacebookData = () => {
    setUser(null);
    setSelectedAccount(null);
    setSelectedBusiness(null);
    setBusinessManagers([]);
    setAdAccounts([]);
    setIsFacebookConnected(false);
    setDataSource(null);
    
    localStorage.removeItem('facebookUser');
    localStorage.removeItem('selectedAdAccount');
    localStorage.removeItem('metaAdsLogoutTimestamp');
    
    metaAdsService.logout();
  };

  const checkLoginStatus = async () => {
    try {
      const status = await metaAdsService.getLoginStatus();

      if (status.status === 'connected') {
        await loadBusinessManagers();
      } else {
        setUser(null);
        setSelectedAccount(null);
        setSelectedBusiness(null);
        setBusinessManagers([]);
        setAdAccounts([]);
        setStep('login');
      }
    } catch (error) {
      console.error('Erro ao verificar status de login:', error);
    }
  };

  useEffect(() => {
    console.log('MetaAdsConfig useEffect inicial');
    
    const savedUser = localStorage.getItem('facebookUser');
    console.log('savedUser:', savedUser);
    
    if (savedUser) {
      console.log('Usuario salvo encontrado, configurando Facebook');
      try {
        const user = JSON.parse(savedUser);
        setUser(user);
        metaAdsService.setUser(user);
        
        setFacebookData();
        checkLoginStatus();
      } catch (error) {
        console.log('Erro ao processar usuario salvo:', error);
        localStorage.removeItem('facebookUser');
        setManualData();
      }
    } else {
      console.log('Usuario nao salvo, configurando manual');
      setManualData();
    }

    const savedToken = localStorage.getItem('facebookAccessToken');
    if (savedToken) {
      setTokenConfigured(true);
      metaAdsService.setAccessToken(savedToken);
    }

    const handleLoginSuccess = (event: CustomEvent) => {
      console.log('Evento facebookLoginSuccess recebido');
      const user = event.detail;
      setUser(user);
      metaAdsService.setUser(user);
      
      setFacebookData();
      
      setTimeout(() => {
        setIsOpen(false);
        onConfigSaved();
      }, 500);
    };

    window.addEventListener('facebookLoginSuccess', handleLoginSuccess as EventListener);

    return () => {
      window.removeEventListener('facebookLoginSuccess', handleLoginSuccess as EventListener);
    };
  }, []);

  const handleConfigureToken = async () => {
    if (!accessToken.trim()) {
      alert('Por favor, insira o token de acesso');
      return;
    }

    try {
      setIsLoading(true);
      
      metaAdsService.setAccessToken(accessToken.trim());
      setTokenConfigured(true);
      
      await loadAdAccounts();
      
      alert('Token configurado com sucesso!');
    } catch (error: any) {
      alert(`Erro ao configurar token: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setIsLoading(true);
    try {
      const rateLimitStatus = await metaAdsService.getOAuthRateLimitStatus();
      
      if (!rateLimitStatus.canAttempt) {
        const minutes = Math.ceil((rateLimitStatus.nextAttemptDelay || 0) / 60000);
        alert(`Rate limit do OAuth excedido. Tente novamente em ${minutes} minutos.`);
        setIsLoading(false);
        return;
      }
      
      const user = await metaAdsService.loginWithFacebook();
      
      setUser(user);
      setFacebookData();
      
      setTimeout(() => {
        setIsOpen(false);
        onConfigSaved();
      }, 500);
      
    } catch (error: any) {
      let errorMessage = 'Erro ao fazer login com o Facebook.';
      
      if (error.message.includes('rate limit') || error.message.includes('exceeded')) {
        const rateLimitStatus = await metaAdsService.getOAuthRateLimitStatus();
        const minutes = Math.ceil((rateLimitStatus.nextAttemptDelay || 0) / 60000);
        errorMessage = `Rate limit do OAuth excedido. Tente novamente em ${minutes} minutos.`;
      } else if (error.message.includes('nao autorizado')) {
        errorMessage = 'Login nao autorizado. Verifique se voce concedeu as permissoes necessarias.';
      } else if (error.message.includes('cancelado')) {
        errorMessage = 'Login cancelado pelo usuario.';
      } else if (error.message.includes('desconhecido')) {
        errorMessage = 'Erro desconhecido no login. Tente novamente.';
      } else if (error.message.includes('SDK nao carregado')) {
        errorMessage = 'Facebook SDK nao carregado. Recarregue a pagina e tente novamente.';
      } else if (error.message.includes('dados do usuario')) {
        errorMessage = 'Erro ao buscar dados do usuario. Tente novamente.';
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBusinessManagers = async () => {
    try {
      const managers = await metaAdsService.getBusinessManagers();

      if (managers.length > 0) {
        setBusinessManagers(managers);
        setStep('selectBusiness');
      } else {
        await loadAdAccounts();
      }
    } catch (error: any) {
      if (error.message.includes('Permissoes de anuncios nao concedidas')) {
        setStep('permissionsRequired');
      } else {
        await loadAdAccounts();
      }
    }
  };

  const loadAdAccounts = async (businessId?: string) => {
    try {
      let accounts: AdAccount[];
      
      if (businessId) {
        accounts = await metaAdsService.getAdAccountsByBusiness(businessId);
      } else {
        accounts = await metaAdsService.getAdAccounts();
      }

      setAdAccounts(accounts);
      
      if (accounts.length > 0) {
        setStep('selectAccount');
      } else {
        setStep('tokenConfig');
      }
    } catch (error: any) {
      if (error.message.includes('Token de acesso nao configurado') || 
          error.message.includes('Permissoes de anuncios nao concedidas')) {
        setStep('tokenConfig');
      } else {
        alert(`Erro ao carregar contas de anuncios: ${error.message}`);
      }
    }
  };

  const handleSelectBusiness = async (business: BusinessManager) => {
    setSelectedBusiness(business);
    await loadAdAccounts(business.id);
  };

  const handleSelectAccount = async (account: AdAccount) => {
    try {
      setIsSelectingAccount(true);
      setSelectedAccount(account);
      metaAdsService.selectAdAccount(account);
      
      setTimeout(() => {
        setIsOpen(false);
        setIsSelectingAccount(false);
        onConfigSaved();
      }, 500);
    } catch (error) {
      setIsSelectingAccount(false);
    }
  };

  const handleLogout = () => {
    metaAdsService.logout();
    
    clearFacebookData();
    
    onDataSourceChange?.('manual', false);
    
    setStep('login');
  };

  const handleRequestAdsPermissions = async () => {
    setIsLoading(true);
    try {
      metaAdsService.logout();
      setUser(null);
      setSelectedAccount(null);
      setSelectedBusiness(null);
      setBusinessManagers([]);
      setAdAccounts([]);
      
      const loggedUser = await metaAdsService.loginWithAdsPermissions();
      setUser(loggedUser);
      setStep('selectBusiness');
      await loadBusinessManagers();
    } catch (error: any) {
      alert(`Erro ao solicitar permissoes: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isConnected = user && metaAdsService.isLoggedIn();

  const Modal = () => {
    if (!mounted || !isOpen) return null;

    return createPortal(
      <div 
        className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsOpen(false);
          }
        }}
      >
        <div 
          className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto"
          style={{
            animation: 'modalSlideIn 0.3s ease-out'
          }}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-700 sticky top-0 bg-gray-800 rounded-t-2xl">
            <h2 className="text-xl font-semibold text-white">
              {isConnected ? 'Meta Ads Conectado' : 'Meta Ads Integration'}
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700"
              aria-label="Fechar modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6">
            {!isConnected && step === 'login' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">Conectar com Facebook</h3>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
                    Faca login com sua conta do Facebook para acessar suas contas de anuncios e metricas
                  </p>
                </div>

                {rateLimitStatus?.canAttempt === false && (
                  <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-yellow-500 font-medium">
                        {rateLimitStatus.facebookRateLimit ? 'Rate Limit do Facebook' : 'Rate Limit Local'}
                      </span>
                    </div>
                    
                    {rateLimitStatus.facebookRateLimit ? (
                      <div>
                        <p className="text-yellow-400 text-sm mb-3">
                          O Facebook esta limitando as tentativas de login. Aguarde 30 minutos antes de tentar novamente.
                        </p>
                        <p className="text-yellow-300 text-xs mb-3">
                          Este e um limite do Facebook, nao do nosso sistema. Fazer logout/reconectar nao resolve.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-yellow-400 text-sm mb-3">
                          Voce atingiu o limite local de tentativas. Tente novamente em {Math.ceil((rateLimitStatus.nextAttemptDelay || 0) / 60000)} minutos.
                        </p>
                        <button
                          onClick={() => metaAdsService.resetOAuthRateLimit()}
                          className="text-yellow-400 hover:text-yellow-300 text-sm underline"
                        >
                          Resetar contador (apenas se necessario)
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {rateLimitStatus?.canAttempt === true && rateLimitStatus.attempts > 0 && (
                  <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-400">Tentativas de login: {rateLimitStatus.attempts}/{rateLimitStatus.maxAttempts}</span>
                      <div className="w-20 bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(rateLimitStatus.attempts / rateLimitStatus.maxAttempts) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleFacebookLogin}
                  disabled={isLoading || (rateLimitStatus?.canAttempt === false)}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-4 rounded-xl flex items-center justify-center space-x-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span className="font-medium">Conectando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <span className="font-medium">Entrar com Facebook</span>
                    </>
                  )}
                </button>

                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Suas informacoes estao seguras e nao serao compartilhadas
                  </p>
                </div>
              </div>
            )}

            {isConnected && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-600/50 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-green-400 font-semibold text-lg">Conectado com sucesso!</h3>
                      <p className="text-green-300 text-sm mt-1">
                        {user?.name || 'Usuario do Facebook'}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-4 rounded-xl flex items-center justify-center space-x-3 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Trocar Conta</span>
                </button>

                {selectedAccount && (
                  <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600/50">
                    <h4 className="text-white font-medium mb-2">Conta Selecionada</h4>
                    <p className="text-gray-300 text-sm">{selectedAccount.name}</p>
                    <p className="text-gray-400 text-xs mt-1">ID: {selectedAccount.id}</p>
                  </div>
                )}
              </div>
            )}

            {step === 'selectBusiness' && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Selecionar Business Manager</h3>
                  <p className="text-gray-400 text-sm">Escolha o Business Manager que contem suas contas de anuncios</p>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {businessManagers.map((business) => (
                    <button
                      key={business.id}
                      onClick={() => handleSelectBusiness(business)}
                      className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors border border-gray-600 hover:border-gray-500"
                    >
                      <h4 className="text-white font-medium">{business.name}</h4>
                      <p className="text-gray-400 text-sm">ID: {business.id}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 'selectAccount' && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Selecionar Conta de Anuncios</h3>
                  <p className="text-gray-400 text-sm">Escolha a conta de anuncios que deseja monitorar</p>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {adAccounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleSelectAccount(account)}
                      disabled={isSelectingAccount}
                      className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors border border-gray-600 hover:border-gray-500 disabled:opacity-50"
                    >
                      <h4 className="text-white font-medium">{account.name}</h4>
                      <p className="text-gray-400 text-sm">ID: {account.id}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 'permissionsRequired' && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Permissoes Necessarias</h3>
                  <p className="text-gray-400 text-sm">Para acessar suas contas de anuncios, precisamos de permissoes adicionais</p>
                </div>
                
                <button
                  onClick={handleRequestAdsPermissions}
                  disabled={isLoading}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      <span>Solicitar Permissoes</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {step === 'tokenConfig' && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Settings className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Configurar Token de Acesso</h3>
                  <p className="text-gray-400 text-sm">Insira seu token de acesso do Facebook para conectar manualmente</p>
                </div>
                
                <textarea
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Cole seu token de acesso aqui..."
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                  aria-label="Token de acesso do Facebook"
                />
                
                <button
                  onClick={handleConfigureToken}
                  disabled={isLoading || !accessToken.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Settings className="w-5 h-5" />
                      <span>Configurar Token</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`p-2 rounded-lg flex items-center justify-center transition-all duration-200 relative ${
          isConnected 
            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
            : 'bg-gray-600 hover:bg-gray-700 text-gray-300 hover:text-white'
        }`}
        title={isConnected ? 'Meta Ads Conectado - Clique para opcoes' : 'Configurar Meta Ads'}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 transition-all duration-200 ${
          isConnected 
            ? 'bg-green-500 shadow-lg shadow-green-500/50' 
            : 'bg-red-500 shadow-lg shadow-red-500/50'
        }`}></div>
      </button>

      <Modal />
    </>
  );
};

export default MetaAdsConfig; 