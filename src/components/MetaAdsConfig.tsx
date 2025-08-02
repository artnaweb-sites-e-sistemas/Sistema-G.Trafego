import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle, XCircle, RefreshCw, User, LogOut, Building } from 'lucide-react';
import { metaAdsService, FacebookUser, AdAccount, BusinessManager } from '../services/metaAdsService';
import { metricsService } from '../services/metricsService';
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSelectingAccount, setIsSelectingAccount] = useState(false);
  const [step, setStep] = useState<'login' | 'selectBusiness' | 'selectAccount' | 'connected' | 'permissionsRequired' | 'tokenConfig'>('login');
  const [accessToken, setAccessToken] = useState('');
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [adSets, setAdSets] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [selectedAdSet, setSelectedAdSet] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('julho de 2023');
  const [mounted, setMounted] = useState(false);
  
  // Estados para controlar origem dos dados
  const [dataSource, setDataSource] = useState<'manual' | 'facebook' | null>(null);
  const [isFacebookConnected, setIsFacebookConnected] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    // Verificar se já existe usuário salvo E se está realmente conectado
    const savedUser = localStorage.getItem('facebookUser');
    if (savedUser && metaAdsService.isConnected()) {
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
        setManualData();
      }
    } else {
      console.log('Usuário não encontrado ou não está conectado, iniciando em modo manual');
      setManualData();
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
      
      // Configurar dados do Facebook automaticamente
      setFacebookData();
      
      // Fechar modal e ir para dashboard
      setTimeout(() => {
        setIsOpen(false);
        // Chamar callback para atualizar o dashboard
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
      
      // Marcar que os dados são do Facebook
      setFacebookData();
      
      // Fechar modal automaticamente após login bem-sucedido
      setTimeout(() => {
        setIsOpen(false);
        // Chamar callback para atualizar o dashboard
        onConfigSaved();
      }, 500);
      
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

  const handleSelectAccount = async (account: AdAccount) => {
    try {
      setIsSelectingAccount(true);
    setSelectedAccount(account);
    metaAdsService.selectAdAccount(account);
    
      // Fechar modal automaticamente após seleção
      setTimeout(() => {
        setIsOpen(false);
        setIsSelectingAccount(false);
        // Chamar callback para atualizar o dashboard
        onConfigSaved();
      }, 500); // 500ms para feedback visual mínimo
    } catch (error) {
      console.error('Erro ao selecionar conta:', error);
      setIsSelectingAccount(false);
    }
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
    console.log('=== INICIANDO LOGOUT COMPLETO ===');
    console.log('Estado antes do logout:', {
      user: !!user,
      selectedAccount: !!selectedAccount,
      isFacebookConnected,
      dataSource
    });
    
    // Fazer logout do Facebook primeiro (isso dispara o evento)
    metaAdsService.logout();
    
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
    
    // Notificar mudança de origem dos dados
    onDataSourceChange?.('manual', false);
    
    // Voltar para tela de login
    setStep('login');
    
    console.log('=== LOGOUT COMPLETO REALIZADO ===');
    console.log('Estado após logout:', {
      user: null,
      selectedAccount: null,
      isFacebookConnected: false,
      dataSource: null
    });
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
    localStorage.removeItem('metaAdsLogoutTimestamp'); // Limpar timestamp de logout
    
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

  const isConnected = user && metaAdsService.isLoggedIn();

  // Modal Component usando Portal
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
          {/* Header */}
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

          {/* Content */}
          <div className="p-6">
              {!isConnected && step === 'login' && (
                <div className="space-y-6">
                  {/* Ícone e Título */}
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <User className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">Conectar com Facebook</h3>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
                      Faça login com sua conta do Facebook para acessar suas contas de anúncios e métricas
                    </p>
                  </div>

                  {/* Botão de Login */}
                  <button
                    onClick={handleFacebookLogin}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-4 rounded-xl flex items-center justify-center space-x-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] facebook-modal-btn"
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

                  {/* Informações Adicionais */}
                  <div className="text-center">
                    <p className="text-xs text-gray-500">
                      Suas informações estão seguras e não serão compartilhadas
                    </p>
                  </div>
                </div>
              )}

              {isConnected && (
                <div className="space-y-6">
                  {/* Status de Conectado */}
                  <div className="bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-600/50 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-green-400 font-semibold text-lg">Conectado com sucesso!</h3>
                        <p className="text-green-300 text-sm mt-1">
                          {user?.name || 'Usuário do Facebook'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botão de Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-4 rounded-xl flex items-center justify-center space-x-3 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] facebook-modal-btn"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Trocar Conta</span>
                  </button>

                  {/* Informações da Conta */}
                  {selectedAccount && (
                    <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600/50">
                      <h4 className="text-white font-medium mb-2">Conta Selecionada</h4>
                      <p className="text-gray-300 text-sm">{selectedAccount.name}</p>
                      <p className="text-gray-400 text-xs mt-1">ID: {selectedAccount.id}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Outros Estados do Modal */}
              {step === 'selectBusiness' && (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Building className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Selecionar Business Manager</h3>
                    <p className="text-gray-400 text-sm">Escolha o Business Manager que contém suas contas de anúncios</p>
                  </div>
                  
                                     <div className="space-y-2 max-h-60 overflow-y-auto facebook-modal-scroll">
                     {businessManagers.map((business) => (
                       <button
                         key={business.id}
                         onClick={() => handleSelectBusiness(business)}
                         className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors border border-gray-600 hover:border-gray-500 facebook-modal-btn"
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
                    <h3 className="text-lg font-medium text-white mb-2">Selecionar Conta de Anúncios</h3>
                    <p className="text-gray-400 text-sm">Escolha a conta de anúncios que deseja monitorar</p>
                  </div>
                  
                                     <div className="space-y-2 max-h-60 overflow-y-auto facebook-modal-scroll">
                     {adAccounts.map((account) => (
                       <button
                         key={account.id}
                         onClick={() => handleSelectAccount(account)}
                         disabled={isSelectingAccount}
                         className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors border border-gray-600 hover:border-gray-500 disabled:opacity-50 facebook-modal-btn"
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
                    <h3 className="text-lg font-medium text-white mb-2">Permissões Necessárias</h3>
                    <p className="text-gray-400 text-sm">Para acessar suas contas de anúncios, precisamos de permissões adicionais</p>
                  </div>
                  
                                     <button
                     onClick={handleRequestAdsPermissions}
                     disabled={isLoading}
                     className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 facebook-modal-btn"
                   >
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        <span>Solicitar Permissões</span>
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
                     className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none facebook-modal-focus"
                     rows={4}
                     aria-label="Token de acesso do Facebook"
                   />
                  
                                     <button
                     onClick={handleConfigureToken}
                     disabled={isLoading || !accessToken.trim()}
                     className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 facebook-modal-btn"
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
          title={isConnected ? 'Meta Ads Conectado - Clique para opções' : 'Configurar Meta Ads'}
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

        <Modal />
      </>
    );
  };

export default MetaAdsConfig;