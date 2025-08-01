import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle, XCircle, RefreshCw, User, LogOut, Building } from 'lucide-react';
import { metaAdsService, FacebookUser, AdAccount, BusinessManager } from '../services/metaAdsService';
import { metricsService } from '../services/metricsService';

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [step, setStep] = useState<'login' | 'selectBusiness' | 'selectAccount' | 'connected' | 'permissionsRequired' | 'tokenConfig'>('login');
  const [accessToken, setAccessToken] = useState('');
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [adSets, setAdSets] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [selectedAdSet, setSelectedAdSet] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('julho de 2023');
  
  // Estados para controlar origem dos dados
  const [dataSource, setDataSource] = useState<'manual' | 'facebook' | null>(null);
  const [isFacebookConnected, setIsFacebookConnected] = useState(false);

  useEffect(() => {
    // Verificar se já existe usuário salvo
    const savedUser = localStorage.getItem('facebookUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setUser(user);
        metaAdsService.setUser(user);
        
        // Configurar dados do Facebook automaticamente
        setFacebookData();
        
        // Verificar status atual no Facebook
        checkLoginStatus();
      } catch (error) {
        console.error('Erro ao carregar usuário salvo:', error);
        localStorage.removeItem('facebookUser');
      }
    }

    // Verificar se já existe token de acesso configurado
    const savedToken = localStorage.getItem('facebookAccessToken');
    if (savedToken) {
      setTokenConfigured(true);
      metaAdsService.setAccessToken(savedToken);
    }

    // Listener para evento de login bem-sucedido
    const handleLoginSuccess = (event: CustomEvent) => {
      console.log('Evento de login recebido:', event.detail);
      const user = event.detail;
      setUser(user);
      metaAdsService.setUser(user);
      setStep('selectBusiness');
      
      // Configurar dados do Facebook automaticamente
      setFacebookData();
      
      loadBusinessManagers();
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
      
      // Configurar o token
      metaAdsService.setAccessToken(accessToken.trim());
      setTokenConfigured(true);
      
      // Tentar buscar contas de anúncios
      await loadAdAccounts();
      
      alert('Token configurado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao configurar token:', error);
      alert(`Erro ao configurar token: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

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
      
      // Usar o serviço para fazer login
      const user = await metaAdsService.loginWithFacebook();
      console.log('Login bem-sucedido:', user);
      
      setUser(user);
      setStep('selectBusiness');
      
      // Marcar que os dados são do Facebook
      setFacebookData();
      
      // Tentar carregar Business Managers
      await loadBusinessManagers();
      
    } catch (error: any) {
      console.error('Erro no login:', error);
      
      // Mostrar mensagem de erro mais amigável
      let errorMessage = 'Erro ao fazer login com o Facebook.';
      
      if (error.message.includes('não autorizado')) {
        errorMessage = 'Login não autorizado. Verifique se você concedeu as permissões necessárias.';
      } else if (error.message.includes('cancelado')) {
        errorMessage = 'Login cancelado pelo usuário.';
      } else if (error.message.includes('desconhecido')) {
        errorMessage = 'Erro desconhecido no login. Tente novamente.';
      } else if (error.message.includes('SDK não carregado')) {
        errorMessage = 'Facebook SDK não carregado. Recarregue a página e tente novamente.';
      } else if (error.message.includes('dados do usuário')) {
        errorMessage = 'Erro ao buscar dados do usuário. Tente novamente.';
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBusinessManagers = async () => {
    try {
      console.log('Carregando Business Managers...');
      const managers = await metaAdsService.getBusinessManagers();
      console.log('Business Managers carregados:', managers);
      
      if (managers.length > 0) {
        setBusinessManagers(managers);
        setStep('selectBusiness');
      } else {
        console.log('Nenhum Business Manager encontrado, tentando buscar contas diretamente...');
        // Se não tem Business Managers, tentar buscar contas diretamente
        await loadAdAccounts();
      }
    } catch (error: any) {
      console.error('Erro ao carregar Business Managers:', error);
      
      // Se for erro de permissão, mostrar mensagem específica
      if (error.message.includes('Permissões de anúncios não concedidas')) {
        setStep('permissionsRequired');
      } else {
        // Para outros erros, tentar buscar contas diretamente
        console.log('Tentando buscar contas diretamente...');
        await loadAdAccounts();
      }
    }
  };

  const loadAdAccounts = async (businessId?: string) => {
    try {
      console.log('Carregando contas de anúncios...');
      let accounts: AdAccount[];
      
      if (businessId) {
        accounts = await metaAdsService.getAdAccountsByBusiness(businessId);
      } else {
        accounts = await metaAdsService.getAdAccounts();
      }
      
      console.log('Contas de anúncios carregadas:', accounts);
      setAdAccounts(accounts);
      
      if (accounts.length > 0) {
        setStep('selectAccount');
      } else {
        // Se não há contas, mostrar opção de configurar token
        setStep('tokenConfig');
      }
    } catch (error: any) {
      console.error('Erro ao carregar contas de anúncios:', error);
      
      // Se for erro de permissão, mostrar opção de configurar token
      if (error.message.includes('Token de acesso não configurado') || 
          error.message.includes('Permissões de anúncios não concedidas')) {
        setStep('tokenConfig');
      } else {
        alert(`Erro ao carregar contas de anúncios: ${error.message}`);
      }
    }
  };

  const handleSelectBusiness = async (business: BusinessManager) => {
    setSelectedBusiness(business);
    await loadAdAccounts(business.id);
  };

  const handleSelectAccount = (account: AdAccount) => {
    setSelectedAccount(account);
    metaAdsService.selectAdAccount(account);
    
    // Carregar campanhas da conta selecionada
    loadCampaigns();
  };

  const loadCampaigns = async () => {
    if (!selectedAccount) return;

    try {
      setIsLoading(true);
      console.log('Carregando campanhas...');
      
      // Converter período para datas
      const { startDate, endDate } = getPeriodDates(selectedPeriod);
      
      const campaignsData = await metaAdsService.getCampaigns(startDate, endDate);
      setCampaigns(campaignsData);
      
      console.log('Campanhas carregadas:', campaignsData);
    } catch (error: any) {
      console.error('Erro ao carregar campanhas:', error);
      alert(`Erro ao carregar campanhas: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdSets = async (campaignId?: string) => {
    if (!selectedAccount) return;

    try {
      setIsLoading(true);
      console.log('Carregando conjuntos de anúncios...');
      
      // Converter período para datas
      const { startDate, endDate } = getPeriodDates(selectedPeriod);
      
      const adSetsData = await metaAdsService.getAdSets(campaignId, startDate, endDate);
      setAdSets(adSetsData);
      
      console.log('Conjuntos de anúncios carregados:', adSetsData);
    } catch (error: any) {
      console.error('Erro ao carregar conjuntos de anúncios:', error);
      alert(`Erro ao carregar conjuntos de anúncios: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCampaign = (campaign: any) => {
    setSelectedCampaign(campaign);
    
    // Carregar conjuntos de anúncios da campanha selecionada
    loadAdSets(campaign.id);
  };

  const handleSelectAdSet = (adSet: any) => {
    setSelectedAdSet(adSet);
    
    // Aqui você pode carregar as métricas específicas do conjunto de anúncios
    loadAdSetMetrics(adSet.id);
  };

  const loadAdSetMetrics = async (adSetId: string) => {
    try {
      console.log('Carregando métricas do conjunto de anúncios...');
      
      // Converter período para datas
      const { startDate, endDate } = getPeriodDates(selectedPeriod);
      
      const insights = await metaAdsService.getAdSetInsights(adSetId, startDate, endDate);
      
      // Aqui você pode processar os insights e atualizar as métricas do dashboard
      console.log('Métricas carregadas:', insights);
      
      // Chamar callback para atualizar o dashboard
      onConfigSaved();
      
    } catch (error: any) {
      console.error('Erro ao carregar métricas:', error);
      alert(`Erro ao carregar métricas: ${error.message}`);
    }
  };

  const getPeriodDates = (period: string) => {
    const now = new Date();
    let startDate: string;
    let endDate: string;

    switch (period) {
      case 'julho de 2023':
        startDate = '2023-07-01';
        endDate = '2023-07-31';
        break;
      case 'agosto de 2023':
        startDate = '2023-08-01';
        endDate = '2023-08-31';
        break;
      case 'setembro de 2023':
        startDate = '2023-09-01';
        endDate = '2023-09-30';
        break;
      case 'outubro de 2023':
        startDate = '2023-10-01';
        endDate = '2023-10-31';
        break;
      case 'novembro de 2023':
        startDate = '2023-11-01';
        endDate = '2023-11-30';
        break;
      case 'dezembro de 2023':
        startDate = '2023-12-01';
        endDate = '2023-12-31';
        break;
      case 'janeiro de 2024':
        startDate = '2024-01-01';
        endDate = '2024-01-31';
        break;
      case 'fevereiro de 2024':
        startDate = '2024-02-01';
        endDate = '2024-02-29';
        break;
      case 'março de 2024':
        startDate = '2024-03-01';
        endDate = '2024-03-31';
        break;
      case 'abril de 2024':
        startDate = '2024-04-01';
        endDate = '2024-04-30';
        break;
      case 'maio de 2024':
        startDate = '2024-05-01';
        endDate = '2024-05-31';
        break;
      case 'junho de 2024':
        startDate = '2024-06-01';
        endDate = '2024-06-30';
        break;
      case 'julho de 2024':
        startDate = '2024-07-01';
        endDate = '2024-07-31';
        break;
      case 'agosto de 2024':
        startDate = '2024-08-01';
        endDate = '2024-08-31';
        break;
      case 'setembro de 2024':
        startDate = '2024-09-01';
        endDate = '2024-09-30';
        break;
      case 'outubro de 2024':
        startDate = '2024-10-01';
        endDate = '2024-10-31';
        break;
      case 'novembro de 2024':
        startDate = '2024-11-01';
        endDate = '2024-11-30';
        break;
      case 'dezembro de 2024':
        startDate = '2024-12-01';
        endDate = '2024-12-31';
        break;
      case 'janeiro de 2025':
        startDate = '2025-01-01';
        endDate = '2025-01-31';
        break;
      case 'fevereiro de 2025':
        startDate = '2025-02-01';
        endDate = '2025-02-28';
        break;
      case 'março de 2025':
        startDate = '2025-03-01';
        endDate = '2025-03-31';
        break;
      case 'abril de 2025':
        startDate = '2025-04-01';
        endDate = '2025-04-30';
        break;
      case 'maio de 2025':
        startDate = '2025-05-01';
        endDate = '2025-05-31';
        break;
      case 'junho de 2025':
        startDate = '2025-06-01';
        endDate = '2025-06-30';
        break;
      case 'julho de 2025':
        startDate = '2025-07-01';
        endDate = '2025-07-31';
        break;
      default:
        // Últimos 30 dias
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = thirtyDaysAgo.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
    }

    return { startDate, endDate };
  };

  const handleLogout = () => {
    console.log('Fazendo logout...');
    
    // Limpar dados do Facebook
    setUser(null);
    setSelectedAccount(null);
    setSelectedBusiness(null);
    setBusinessManagers([]);
    setAdAccounts([]);
    setCampaigns([]);
    setAdSets([]);
    setSelectedCampaign(null);
    setSelectedAdSet(null);
    setIsFacebookConnected(false);
    setDataSource(null);
    
    // Limpar dados locais
    localStorage.removeItem('facebookUser');
    localStorage.removeItem('selectedAdAccount');
    
    // Fazer logout do Facebook
    metaAdsService.logout();
    
    // Voltar para tela de login
    setStep('login');
  };

  const clearFacebookData = () => {
    console.log('Limpando dados do Facebook...');
    
    // Limpar apenas dados do Facebook, mantendo dados manuais
    setUser(null);
    setSelectedAccount(null);
    setSelectedBusiness(null);
    setBusinessManagers([]);
    setAdAccounts([]);
    setCampaigns([]);
    setAdSets([]);
    setSelectedCampaign(null);
    setSelectedAdSet(null);
    setIsFacebookConnected(false);
    setDataSource(null);
    
    // Limpar dados locais
    localStorage.removeItem('facebookUser');
    localStorage.removeItem('selectedAdAccount');
    
    // Fazer logout do Facebook
    metaAdsService.logout();
  };

  const setFacebookData = () => {
    console.log('Configurando dados do Facebook...');
    setDataSource('facebook');
    setIsFacebookConnected(true);
    
    // Notificar mudança de origem dos dados
    onDataSourceChange?.('facebook', true);
    
    // Limpar dados manuais se necessário
    // Aqui você pode limpar dados manuais e carregar dados do Facebook
  };

  const setManualData = () => {
    console.log('Configurando dados manuais...');
    setDataSource('manual');
    setIsFacebookConnected(false);
    
    // Notificar mudança de origem dos dados
    onDataSourceChange?.('manual', false);
    
    // Limpar dados do Facebook
    clearFacebookData();
    
    // Aqui você pode carregar dados manuais se existirem
    // Por exemplo, dados salvos localmente ou de uma API própria
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
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">
                      {selectedBusiness ? `${selectedBusiness.name}` : 'Business Managers'}
                    </h3>
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
                              Tipo: {business.account_type}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400 mb-4">Nenhum Business Manager encontrado</p>
                      <button
                        onClick={() => setStep('tokenConfig')}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 mx-auto transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Configurar Token de Acesso</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setStep('login')}
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
                    onClick={() => setStep('tokenConfig')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                    <span>Configurar Token de Acesso</span>
                  </button>
                </div>
              </div>
            )}

            {step === 'tokenConfig' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Configurar Token de Acesso</h3>
                    <p className="text-gray-400 text-sm">API de Marketing do Facebook</p>
                  </div>
                </div>

                <div className="bg-green-900 border border-green-700 rounded-lg p-4">
                  <p className="text-green-300 text-sm mb-4">
                    Cole aqui o token de acesso gerado no Facebook Developers. 
                    Este token permite acessar dados de anúncios diretamente.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-300 text-sm">Token com permissões ads_read e ads_management</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-300 text-sm">Acesso direto às contas de anúncios</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Token de Acesso
                    </label>
                    <textarea
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="Cole aqui o token de acesso..."
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                    />
                  </div>

                  <button
                    onClick={handleConfigureToken}
                    disabled={isLoading || !accessToken.trim()}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Settings className="w-5 h-5" />
                    )}
                    <span>{isLoading ? 'Configurando...' : 'Configurar Token'}</span>
                  </button>

                  <button
                    onClick={() => setStep('permissionsRequired')}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Voltar
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