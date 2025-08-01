import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle, XCircle, RefreshCw, User, LogOut, Building } from 'lucide-react';
import { metaAdsService, FacebookUser, AdAccount, BusinessManager } from '../services/metaAdsService';
import { metricsService } from '../services/metricsService';

interface MetaAdsConfigProps {
  onConfigSaved: () => void;
}

const MetaAdsConfig: React.FC<MetaAdsConfigProps> = ({ onConfigSaved }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<FacebookUser | null>(null);
  const [businessManagers, setBusinessManagers] = useState<BusinessManager[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessManager | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AdAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [step, setStep] = useState<'login' | 'selectBusiness' | 'selectAccount' | 'connected' | 'permissionsRequired'>('login');

  useEffect(() => {
    // Verificar se já existe usuário salvo
    const savedUser = localStorage.getItem('facebookUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setUser(user);
        metaAdsService.setUser(user);
        
        // Verificar status atual no Facebook
        checkLoginStatus();
      } catch (error) {
        console.error('Erro ao carregar usuário salvo:', error);
        localStorage.removeItem('facebookUser');
      }
    }

    // Listener para evento de login bem-sucedido
    const handleLoginSuccess = (event: CustomEvent) => {
      console.log('Evento de login recebido:', event.detail);
      const user = event.detail;
      setUser(user);
      metaAdsService.setUser(user);
      setStep('selectBusiness');
      loadBusinessManagers();
    };

    window.addEventListener('facebookLoginSuccess', handleLoginSuccess as EventListener);

    return () => {
      window.removeEventListener('facebookLoginSuccess', handleLoginSuccess as EventListener);
    };
  }, []);

  const checkLoginStatus = async () => {
    try {
      const status = await metaAdsService.getLoginStatus();
      console.log('Status atual do login:', status);
      
      if (status.status === 'connected') {
        // Usuário está logado, tentar carregar contas
        await loadBusinessManagers();
      } else {
        // Usuário não está logado, limpar dados
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

  const handleFacebookLogin = async () => {
    setIsLoading(true);
    try {
      console.log('Iniciando login do Facebook...');
      
      // Chamar FB.login() diretamente
      if (typeof window !== 'undefined' && window.FB) {
        window.FB.login((response: any) => {
          console.log('Resposta do FB.login:', response);
          
          if (response.authResponse) {
            console.log('Login bem-sucedido!');
            const { accessToken, userID } = response.authResponse;
            
            // Buscar dados do usuário
            window.FB.api('/me', { fields: 'name,email' }, (userInfo: any) => {
              if (userInfo.error) {
                console.error('Erro ao buscar dados do usuário:', userInfo.error);
                alert('Erro ao buscar dados do usuário');
                setIsLoading(false);
                return;
              }
              
              const user = {
                id: userID,
                name: userInfo.name,
                email: userInfo.email,
                accessToken: accessToken
              };
              
              console.log('Dados do usuário:', user);
              setUser(user);
              metaAdsService.setUser(user);
              localStorage.setItem('facebookUser', JSON.stringify(user));
              
              // Tentar carregar contas de anúncios
              setStep('selectBusiness');
              loadBusinessManagers();
              setIsLoading(false);
            });
          } else {
            console.log('Login falhou ou foi cancelado');
            alert('Login falhou ou foi cancelado');
            setIsLoading(false);
          }
        }, { 
          scope: 'email,public_profile',
          return_scopes: true,
          auth_type: 'rerequest'
        });
      } else {
        throw new Error('Facebook SDK não está disponível');
      }
    } catch (error: any) {
      console.error('Erro no login:', error);
      alert(`Erro no login: ${error.message}`);
      setIsLoading(false);
    }
  };

  const loadBusinessManagers = async () => {
    setIsLoading(true);
    try {
      const businesses = await metaAdsService.getBusinessManagers();
      setBusinessManagers(businesses);
      
      // Se não há Business Managers, tentar buscar contas de anúncios diretamente
      if (businesses.length === 0) {
        console.log('Nenhum Business Manager encontrado, tentando buscar contas diretamente...');
        await loadAdAccounts();
      }
    } catch (error: any) {
      console.warn('Erro ao buscar Business Managers:', error.message);
      // Se falhar, tentar buscar contas de anúncios diretamente
      await loadAdAccounts();
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdAccounts = async (businessId?: string) => {
    setIsLoading(true);
    try {
      let accounts: AdAccount[];
      
      if (businessId) {
        accounts = await metaAdsService.getAdAccountsByBusiness(businessId);
      } else {
        accounts = await metaAdsService.getAdAccounts();
      }
      
      setAdAccounts(accounts);
      setStep('selectAccount');
    } catch (error: any) {
      // Se o erro for sobre permissões, mostrar mensagem amigável
      if (error.message.includes('Permissões de anúncios não concedidas')) {
        setStep('permissionsRequired');
      } else {
        alert(`Erro ao carregar contas: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectBusiness = async (business: BusinessManager) => {
    setSelectedBusiness(business);
    await loadAdAccounts(business.id);
  };

  const handleSelectAccount = (account: AdAccount) => {
    metaAdsService.selectAdAccount(account);
    setSelectedAccount(account);
    setStep('connected');
    onConfigSaved();
    setIsOpen(false);
  };

  const handleLogout = () => {
    metaAdsService.logout();
    setUser(null);
    setSelectedAccount(null);
    setSelectedBusiness(null);
    setBusinessManagers([]);
    setAdAccounts([]);
    setStep('login');
  };

  const syncData = async () => {
    setIsSyncing(true);
    try {
      const today = new Date();
      const month = today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      
      const result = await metricsService.syncMetaAdsData(month);
      alert(result.message);
      onConfigSaved();
    } catch (error: any) {
      alert(`Erro na sincronização: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRequestAdsPermissions = async () => {
    setIsLoading(true);
    try {
      // Fazer logout primeiro para limpar as permissões
      metaAdsService.logout();
      setUser(null);
      setSelectedAccount(null);
      setSelectedBusiness(null);
      setBusinessManagers([]);
      setAdAccounts([]);
      
      // Fazer login novamente solicitando permissões de anúncios
      const loggedUser = await metaAdsService.loginWithAdsPermissions();
      setUser(loggedUser);
      setStep('selectBusiness');
      await loadBusinessManagers();
    } catch (error: any) {
      alert(`Erro ao solicitar permissões: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isConnected = user && selectedAccount;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`p-2 rounded-lg flex items-center justify-center transition-all duration-200 relative ${
          isConnected 
            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
            : 'bg-gray-600 hover:bg-gray-700 text-gray-300 hover:text-white'
        }`}
        title={isConnected ? 'Meta Ads Conectado' : 'Configurar Meta Ads'}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        
        {/* Indicador de Status */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 transition-all duration-200 ${
          isConnected 
            ? 'bg-green-500 shadow-lg shadow-green-500/50' 
            : 'bg-red-500 shadow-lg shadow-red-500/50'
        }`}></div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Meta Ads Integration</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {step === 'login' && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Conectar com Facebook</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Faça login com sua conta do Facebook para acessar suas contas de anúncios
                  </p>
                </div>

                <button
                  onClick={handleFacebookLogin}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <span>Entrar com Facebook</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {step === 'selectBusiness' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Olá, {user?.name}!</h3>
                    <p className="text-gray-400 text-sm">Selecione um Business Manager</p>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                    </div>
                  ) : businessManagers.length > 0 ? (
                    businessManagers.map((business) => (
                      <button
                        key={business.id}
                        onClick={() => handleSelectBusiness(business)}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-left p-3 rounded-lg transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Building className="w-5 h-5 text-blue-400" />
                          <div>
                            <div className="text-white font-medium">{business.name}</div>
                            <div className="text-gray-400 text-sm">
                              ID: {business.id} • {business.account_type}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400">Nenhum Business Manager encontrado</p>
                      <p className="text-gray-500 text-sm mt-2">Buscando contas de anúncios diretamente...</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Trocar Conta</span>
                </button>
              </div>
            )}

            {step === 'selectAccount' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">
                      {selectedBusiness ? `${selectedBusiness.name}` : 'Contas de Anúncios'}
                    </h3>
                    <p className="text-gray-400 text-sm">Selecione uma conta de anúncios</p>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                    </div>
                  ) : adAccounts.length > 0 ? (
                    adAccounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() => handleSelectAccount(account)}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-left p-3 rounded-lg transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Building className="w-5 h-5 text-blue-400" />
                          <div>
                            <div className="text-white font-medium">{account.name}</div>
                            <div className="text-gray-400 text-sm">
                              ID: {account.account_id} • {account.currency}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400">Nenhuma conta de anúncios encontrada</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setStep('selectBusiness')}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <Building className="w-4 h-4" />
                  <span>Voltar aos Business Managers</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Trocar Conta</span>
                </button>
              </div>
            )}

            {step === 'permissionsRequired' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Permissões Necessárias</h3>
                    <p className="text-gray-400 text-sm">Para acessar contas de anúncios</p>
                  </div>
                </div>

                <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
                  <p className="text-yellow-300 text-sm mb-4">
                    O login básico funcionou! Porém, para acessar dados de anúncios, você precisa solicitar 
                    revisão do Facebook para as permissões avançadas (pages_show_list, ads_read, ads_management).
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-300 text-sm">Login básico funcionando</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-red-300 text-sm">Permissões avançadas precisam de App Review</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleRequestAdsPermissions}
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    )}
                    <span>{isLoading ? 'Solicitando...' : 'Fazer Login Básico'}</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Trocar Conta</span>
                  </button>
                </div>
              </div>
            )}

            {step === 'connected' && (
              <div className="space-y-4">
                <div className="bg-green-900 border border-green-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <div>
                      <h3 className="text-green-400 font-medium">Conectado com sucesso!</h3>
                      <p className="text-green-300 text-sm">
                        {user?.name} • {selectedAccount?.name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={syncData}
                    disabled={isSyncing}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-5 h-5" />
                    )}
                    <span>Sincronizar Dados</span>
                  </button>

                  <button
                    onClick={() => setStep('selectBusiness')}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Building className="w-4 h-4" />
                    <span>Trocar Conta</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Desconectar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MetaAdsConfig;