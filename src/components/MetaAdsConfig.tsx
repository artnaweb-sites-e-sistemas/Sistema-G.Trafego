import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle, XCircle, RefreshCw, User, LogOut, Building } from 'lucide-react';
import { metaAdsService, FacebookUser, AdAccount } from '../services/metaAdsService';
import { metricsService } from '../services/metricsService';

interface MetaAdsConfigProps {
  onConfigSaved: () => void;
  selectedCampaign?: string;
}

const MetaAdsConfig: React.FC<MetaAdsConfigProps> = ({ onConfigSaved, selectedCampaign }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<FacebookUser | null>(null);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AdAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [step, setStep] = useState<'login' | 'selectAccount' | 'connected'>('login');

  useEffect(() => {
    // Inicializar Facebook SDK
    metaAdsService.initFacebookSDK();
    
    // Verificar se já está logado
    if (metaAdsService.isLoggedIn()) {
      setUser(metaAdsService.getCurrentUser());
      if (metaAdsService.hasSelectedAccount()) {
        setSelectedAccount(metaAdsService.getSelectedAccount());
        setStep('connected');
      } else {
        setStep('selectAccount');
        loadAdAccounts();
      }
    }
  }, []);

  const handleFacebookLogin = async () => {
    setIsLoading(true);
    try {
      const loggedUser = await metaAdsService.loginWithFacebook();
      setUser(loggedUser);
      setStep('selectAccount');
      await loadAdAccounts();
    } catch (error: any) {
      alert(`Erro no login: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdAccounts = async () => {
    setIsLoading(true);
    try {
      const accounts = await metaAdsService.getAdAccounts();
      setAdAccounts(accounts);
    } catch (error: any) {
      alert(`Erro ao carregar contas: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
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
    setAdAccounts([]);
    setStep('login');
  };

  const syncData = async () => {
    setIsSyncing(true);
    try {
      const today = new Date();
      const month = today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      
      const result = await metricsService.syncMetaAdsData(month, selectedCampaign);
      alert(result.message);
      onConfigSaved();
    } catch (error: any) {
      alert(`Erro na sincronização: ${error.message}`);
    } finally {
      setIsSyncing(false);
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

            {step === 'selectAccount' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Olá, {user?.name}!</h3>
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
                  onClick={handleLogout}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Trocar Conta</span>
                </button>
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
                    onClick={() => setStep('selectAccount')}
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