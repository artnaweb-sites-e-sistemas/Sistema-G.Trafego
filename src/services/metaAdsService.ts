import axios from 'axios';
import { format, subDays } from 'date-fns';

export interface FacebookUser {
  id: string;
  name: string;
  email: string;
  accessToken: string;
}

export interface BusinessManager {
  id: string;
  name: string;
  account_type: string;
}

export interface AdAccount {
  id: string;
  name: string;
  account_id: string;
  account_status: number;
  currency: string;
  business_id?: string;
}

export interface MetaAdsInsight {
  date_start: string;
  date_stop: string;
  impressions: string;
  clicks: string;
  spend: string;
  ctr: string;
  cpm: string;
  cpp: string;
  reach: string;
  frequency: string;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
  cost_per_action_type?: Array<{
    action_type: string;
    value: string;
  }>;
}

export interface MetaAdsCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  created_time: string;
  updated_time: string;
}

class MetaAdsService {
  private baseURL = 'https://graph.facebook.com/v18.0';
  private user: FacebookUser | null = null;
  private selectedAccount: AdAccount | null = null;
  private appId = import.meta.env.VITE_FACEBOOK_APP_ID || '1793110515418498'; // Novo App ID com permissões avançadas
  private accessToken: string | null = null; // Token de acesso para API de Marketing
  
  // Sistema de cache para reduzir chamadas à API
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL = {
    BUSINESS_MANAGERS: 30 * 60 * 1000, // 30 minutos
    AD_ACCOUNTS: 15 * 60 * 1000, // 15 minutos
    CAMPAIGNS: 10 * 60 * 1000, // 10 minutos
    AD_SETS: 10 * 60 * 1000, // 10 minutos
    INSIGHTS: 5 * 60 * 1000, // 5 minutos
    USER_INFO: 60 * 60 * 1000, // 1 hora
  };

  // Debounce para evitar múltiplas chamadas simultâneas
  private pendingRequests = new Map<string, Promise<any>>();

  // Métodos de cache
  private getCacheKey(type: string, params: any = {}): string {
    const paramStr = Object.keys(params).length > 0 
      ? '_' + JSON.stringify(params) 
      : '';
    return `${type}${paramStr}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    console.log(`Cache hit: ${key}`);
    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    console.log(`Cache set: ${key} (TTL: ${ttl/1000}s)`);
  }

  private clearCache(type?: string): void {
    if (type) {
      // Limpar cache específico
      for (const key of this.cache.keys()) {
        if (key.startsWith(type)) {
          this.cache.delete(key);
        }
      }
      console.log(`Cache cleared for type: ${type}`);
    } else {
      // Limpar todo o cache
      this.cache.clear();
      console.log('All cache cleared');
    }
  }

  // Método para fazer requisições com cache e debounce
  private async makeCachedRequest<T>(
    type: string, 
    requestFn: () => Promise<T>, 
    ttl: number,
    params: any = {}
  ): Promise<T> {
    const cacheKey = this.getCacheKey(type, params);
    
    // Verificar cache primeiro
    const cached = this.getFromCache<T>(cacheKey);
    if (cached) {
      return cached;
    }

    // Verificar se já existe uma requisição pendente
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`Using pending request for: ${cacheKey}`);
      return this.pendingRequests.get(cacheKey)!;
    }

    // Fazer nova requisição
    const requestPromise = requestFn().then(data => {
      this.setCache(cacheKey, data, ttl);
      this.pendingRequests.delete(cacheKey);
      return data;
    }).catch(error => {
      this.pendingRequests.delete(cacheKey);
      throw error;
    });

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  // Configurar token de acesso para API de Marketing
  setAccessToken(token: string) {
    this.accessToken = token;
    localStorage.setItem('facebookAccessToken', token);
    console.log('Token de acesso configurado');
  }

  // Obter token de acesso
  getAccessToken(): string | null {
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem('facebookAccessToken');
    }
    return this.accessToken;
  }

  // Verificar se o serviço está configurado
  isConfigured(): boolean {
    return this.isLoggedIn() && (this.hasSelectedAccount() || this.getAccessToken() !== null);
  }

  // Inicializar Facebook SDK
  initFacebookSDK(): Promise<void> {
    return new Promise((resolve) => {
      console.log('Inicializando Facebook SDK...');
      
      if (typeof window !== 'undefined' && window.FB) {
        console.log('Facebook SDK já carregado');
        window.FB.init({
          appId: this.appId,
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
        console.log('Facebook SDK inicializado com appId:', this.appId);
        resolve();
      } else {
        console.log('Aguardando Facebook SDK carregar...');
        // Aguardar SDK carregar
        window.fbAsyncInit = () => {
          console.log('Facebook SDK carregado, inicializando...');
          window.FB.init({
            appId: this.appId,
            cookie: true,
            xfbml: true,
            version: 'v18.0'
          });
          console.log('Facebook SDK inicializado com appId:', this.appId);
          resolve();
        };
      }
    });
  }

  // Login com Facebook
  async loginWithFacebook(): Promise<FacebookUser> {
    return new Promise((resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK não carregado. Verifique se o script está sendo carregado corretamente.'));
        return;
      }

      console.log('Iniciando login do Facebook...');

      // Verificar se já está logado primeiro
      window.FB.getLoginStatus((statusResponse: any) => {
        console.log('Status atual do login:', statusResponse);
        
        if (statusResponse.status === 'connected') {
          console.log('Usuário já está logado, buscando dados...');
          
          // Buscar dados do usuário
          window.FB.api('/me', { fields: 'name,email' }, (userInfo: any) => {
            if (userInfo.error) {
              console.error('Erro ao buscar dados do usuário:', userInfo.error);
              reject(new Error(`Erro ao buscar dados do usuário: ${userInfo.error.message}`));
              return;
            }
            
            const user: FacebookUser = {
              id: statusResponse.authResponse.userID,
              name: userInfo.name,
              email: userInfo.email,
              accessToken: statusResponse.authResponse.accessToken
            };
            
            this.user = user;
            localStorage.setItem('facebookUser', JSON.stringify(user));
            console.log('Usuário já logado, dados salvos:', user);
            resolve(user);
          });
        } else {
          // Login com permissões avançadas
          window.FB.login((response: any) => {
            console.log('Resposta do FB.login:', response);
            
            if (response.authResponse) {
              const { accessToken, userID } = response.authResponse;
              console.log('Login bem-sucedido, userID:', userID);
              
              // Buscar dados do usuário
              window.FB.api('/me', { fields: 'name,email' }, (userInfo: any) => {
                console.log('Dados do usuário:', userInfo);
                
                if (userInfo.error) {
                  console.error('Erro ao buscar dados do usuário:', userInfo.error);
                  reject(new Error(`Erro ao buscar dados do usuário: ${userInfo.error.message}`));
                  return;
                }
                
                const user: FacebookUser = {
                  id: userID,
                  name: userInfo.name,
                  email: userInfo.email,
                  accessToken: accessToken
                };
                
                this.user = user;
                localStorage.setItem('facebookUser', JSON.stringify(user));
                console.log('Usuário salvo:', user);
                resolve(user);
              });
            } else {
              console.error('Login falhou:', response);
              if (response.status === 'not_authorized') {
                reject(new Error('Login não autorizado. Verifique se você concedeu as permissões necessárias.'));
              } else if (response.status === 'unknown') {
                reject(new Error('Erro desconhecido no login. Tente novamente.'));
              } else {
                reject(new Error('Login cancelado pelo usuário'));
              }
            }
          }, { 
            scope: 'email,public_profile,ads_read,ads_management,pages_show_list,pages_read_engagement',
            return_scopes: true
          });
        }
      });
    });
  }

  // Login com Facebook solicitando permissões de anúncios
  async loginWithAdsPermissions(): Promise<FacebookUser> {
    return new Promise((resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK não carregado. Verifique se o script está sendo carregado corretamente.'));
        return;
      }

      // Fazer logout primeiro para limpar permissões anteriores
      window.FB.logout();

      // Login solicitando apenas permissões básicas (que não precisam de App Review)
      window.FB.login((response: any) => {
        console.log('Resposta do FB.login com permissões básicas:', response);
        
        if (response.authResponse) {
          const { accessToken, userID } = response.authResponse;
          console.log('Login com permissões básicas bem-sucedido, userID:', userID);
          
          // Buscar dados do usuário
          window.FB.api('/me', { fields: 'name,email' }, (userInfo: any) => {
            console.log('Dados do usuário:', userInfo);
            
            if (userInfo.error) {
              console.error('Erro ao buscar dados do usuário:', userInfo.error);
              reject(new Error(`Erro ao buscar dados do usuário: ${userInfo.error.message}`));
              return;
            }
            
            const user: FacebookUser = {
              id: userID,
              name: userInfo.name,
              email: userInfo.email,
              accessToken: accessToken
            };
            
            this.user = user;
            localStorage.setItem('facebookUser', JSON.stringify(user));
            resolve(user);
          });
        } else {
          console.error('Login com permissões básicas falhou:', response);
          if (response.status === 'not_authorized') {
            reject(new Error('Login não autorizado. Verifique se você concedeu as permissões necessárias.'));
        } else {
          reject(new Error('Login cancelado pelo usuário'));
        }
        }
      }, { 
        scope: 'email,public_profile',
        return_scopes: true,
        auth_type: 'rerequest',
        redirect_uri: 'https://gtrafego.artnawebsite.com.br/'
      });
    });
  }

  // Logout
  logout() {
    console.log('Fazendo logout do Meta Ads...');
    
    // Limpar cache ao fazer logout
    this.clearCache();
    
    // Fazer logout do Facebook SDK se disponível
    if (window.FB && this.user?.accessToken) {
      try {
        window.FB.logout();
        console.log('Logout do Facebook SDK realizado');
      } catch (error) {
        console.warn('Erro ao fazer logout do Facebook SDK:', error);
      }
    }
    
    // Limpar dados do usuário
    this.user = null;
    this.selectedAccount = null;
    
    // Limpar dados locais
    localStorage.removeItem('facebookUser');
    localStorage.removeItem('selectedAdAccount');
    
    console.log('Logout concluído');
  }

  // Verificar se está logado
  isLoggedIn(): boolean {
    if (this.user) return true;
    
    // Verificar localStorage
    const savedUser = localStorage.getItem('facebookUser');
    if (savedUser) {
      this.user = JSON.parse(savedUser);
      return true;
    }
    
    return false;
  }

  // Definir usuário atual
  setUser(user: FacebookUser) {
    this.user = user;
  }

  // Verificar permissões do usuário
  async checkUserPermissions(): Promise<string[]> {
    if (!this.user) {
      throw new Error('Usuário não está logado.');
    }

    try {
      const response = await axios.get(
        `${this.baseURL}/me/permissions`,
        {
          params: {
            access_token: this.user.accessToken
          }
        }
      );

      console.log('Permissões do usuário:', response.data);
      return response.data.data.map((perm: any) => perm.permission);
    } catch (error: any) {
      console.error('Erro ao verificar permissões:', error);
      return [];
    }
  }

  // Buscar Business Managers do usuário
  async getBusinessManagers(): Promise<BusinessManager[]> {
    if (!this.user?.accessToken) {
      throw new Error('Usuário não logado');
    }

    return this.makeCachedRequest(
      'business_managers',
      async () => {
        console.log('Buscando Business Managers...');
        
        try {
          const response = await axios.get(
            `${this.baseURL}/me/businesses`,
            {
              params: {
                access_token: this.user!.accessToken,
                fields: 'id,name,account_type'
              }
            }
          );

          console.log('Business Managers encontrados:', response.data);
          return response.data.data || [];
        } catch (error: any) {
          console.error('Erro ao buscar Business Managers:', error.response?.data || error.message);
          
          if (error.response?.data?.error?.code === 100) {
            throw new Error('Permissão negada. É necessário solicitar permissão ads_read no App Review.');
          }
          
          throw new Error(`Erro ao buscar Business Managers: ${error.response?.data?.error?.message || error.message}`);
        }
      },
      this.CACHE_TTL.BUSINESS_MANAGERS
    );
  }

  // Buscar contas de anúncios de um Business Manager específico
  async getAdAccountsByBusiness(businessId: string): Promise<AdAccount[]> {
    if (!this.user?.accessToken) {
      throw new Error('Usuário não logado');
    }

    return this.makeCachedRequest(
      'ad_accounts_by_business',
      async () => {
        console.log(`Buscando contas de anúncios para Business Manager ${businessId}...`);
        
        try {
          // Primeiro, tentar owned_ad_accounts
          let response = await axios.get(
            `${this.baseURL}/${businessId}/owned_ad_accounts`,
            {
              params: {
                access_token: this.user!.accessToken,
                fields: 'id,name,account_id,account_status,currency'
              }
            }
          );

          let adAccounts = response.data.data || [];

          // Se não encontrou owned_ad_accounts, tentar client_ad_accounts
          if (adAccounts.length === 0) {
            console.log('Nenhuma conta própria encontrada, tentando contas de cliente...');
            
            response = await axios.get(
              `${this.baseURL}/${businessId}/client_ad_accounts`,
              {
                params: {
                  access_token: this.user!.accessToken,
                  fields: 'id,name,account_id,account_status,currency'
                }
              }
            );

            adAccounts = response.data.data || [];
          }

          console.log(`Contas de anúncios encontradas: ${adAccounts.length}`);
          return adAccounts.map((account: any) => ({
            ...account,
            business_id: businessId
          }));
        } catch (error: any) {
          console.error('Erro ao buscar contas de anúncios:', error.response?.data || error.message);
          
          if (error.response?.data?.error?.code === 100) {
            throw new Error('Permissão negada. É necessário solicitar permissão ads_read no App Review.');
          }
          
          throw new Error(`Erro ao buscar contas de anúncios: ${error.response?.data?.error?.message || error.message}`);
        }
      },
      this.CACHE_TTL.AD_ACCOUNTS,
      { businessId }
    );
  }

  // Buscar contas de anúncios do usuário (método original - mantido para compatibilidade)
  async getAdAccounts(): Promise<AdAccount[]> {
    // Verificar se temos token do usuário com permissões avançadas
    if (!this.user) {
      throw new Error('Usuário não está logado. Faça login primeiro.');
    }

    try {
      console.log('Buscando contas de anúncios com token do usuário...');
      console.log('Access Token:', this.user.accessToken.substring(0, 20) + '...');
      
      const response = await axios.get(
        `${this.baseURL}/me/adaccounts`,
        {
          params: {
            access_token: this.user.accessToken,
            fields: 'id,name,account_id,account_status,currency'
          }
        }
      );

      console.log('Resposta da API:', response.data);

      if (response.data.error) {
        throw new Error(`Erro da API do Facebook: ${response.data.error.message}`);
      }

      const accounts = response.data.data.filter((account: AdAccount) => 
        account.account_status === 1 // Apenas contas ativas
      );

      if (accounts.length === 0) {
        throw new Error('Nenhuma conta de anúncios ativa encontrada. Verifique se você tem acesso a contas de anúncios.');
      }

      console.log('Contas de anúncios encontradas:', accounts);
      return accounts;
    } catch (error: any) {
      console.error('Erro ao buscar contas de anúncios:', error.response?.data || error.message);
      
      // Se for erro 403 (Forbidden), não tem permissão para ads
      if (error.response?.status === 403) {
        throw new Error('Permissões de anúncios não concedidas. Para acessar contas de anúncios, você precisa das permissões ads_read e ads_management que requerem App Review.');
      }
      
      // Se for erro 400 (Bad Request), pode ser problema de permissão
      if (error.response?.status === 400) {
        throw new Error('Erro na requisição. Verifique se você tem permissões adequadas para acessar contas de anúncios.');
      }
      
      // Se o erro for sobre token expirado
      if (error.response?.data?.error?.code === 190) {
        throw new Error('Token de acesso expirado. Faça login novamente.');
      }
      
      // Se o erro for sobre permissões
      if (error.response?.data?.error?.code === 200) {
        throw new Error('Permissões de anúncios não concedidas. Para acessar contas de anúncios, você precisa conceder permissões adicionais.');
      }
      
      throw new Error(`Erro ao buscar contas: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Selecionar conta de anúncios
  selectAdAccount(account: AdAccount) {
    this.selectedAccount = account;
    localStorage.setItem('selectedAdAccount', JSON.stringify(account));
  }

  // Verificar se tem conta selecionada
  hasSelectedAccount(): boolean {
    if (this.selectedAccount) return true;
    
    const savedAccount = localStorage.getItem('selectedAdAccount');
    if (savedAccount) {
      this.selectedAccount = JSON.parse(savedAccount);
      return true;
    }
    
    return false;
  }

  // Buscar campanhas da conta selecionada com filtro de período
  async getCampaigns(dateStart?: string, dateEnd?: string): Promise<MetaAdsCampaign[]> {
    if (!this.selectedAccount) {
      throw new Error('Nenhuma conta selecionada');
    }

    const params = { dateStart, dateEnd };
    
    return this.makeCachedRequest(
      'campaigns',
      async () => {
        console.log(`Buscando campanhas da conta ${this.selectedAccount!.id}...`);
        
        try {
          const response = await axios.get(
            `${this.baseURL}/${this.selectedAccount!.id}/campaigns`,
            {
              params: {
                access_token: this.user?.accessToken || this.getAccessToken(),
                fields: 'id,name,status,objective,created_time,updated_time,start_time,stop_time',
                limit: 1000 // Aumentar limite para pegar mais campanhas
              }
            }
          );

          console.log('Campanhas encontradas:', response.data);
          return response.data.data || [];
        } catch (error: any) {
          console.error('Erro ao buscar campanhas:', error.response?.data || error.message);
          throw new Error(`Erro ao buscar campanhas: ${error.response?.data?.error?.message || error.message}`);
        }
      },
      this.CACHE_TTL.CAMPAIGNS,
      params
    );
  }

  // Buscar conjuntos de anúncios (Ad Sets) da conta selecionada
  async getAdSets(campaignId?: string, dateStart?: string, dateEnd?: string): Promise<any[]> {
    if (!this.user || !this.selectedAccount) {
      throw new Error('Usuário não logado ou conta não selecionada');
    }

    try {
      console.log(`Buscando conjuntos de anúncios da conta ${this.selectedAccount.id}...`);
      
      const params: any = {
        access_token: this.user.accessToken,
        fields: 'id,name,status,created_time,updated_time,start_time,stop_time,targeting',
        limit: 100
      };

      // Adicionar filtros de data se fornecidos
      if (dateStart && dateEnd) {
        params.time_range = JSON.stringify({
          since: dateStart,
          until: dateEnd
        });
      }

      let endpoint = `${this.baseURL}/${this.selectedAccount.id}/adsets`;
      
      // Se uma campanha específica foi fornecida, buscar conjuntos dessa campanha
      if (campaignId) {
        endpoint = `${this.baseURL}/${campaignId}/adsets`;
      }

      const response = await axios.get(endpoint, { params });

      console.log('Conjuntos de anúncios encontrados:', response.data);
      return response.data.data || [];
    } catch (error: any) {
      console.error('Erro ao buscar conjuntos de anúncios:', error.response?.data || error.message);
      throw new Error(`Erro ao buscar conjuntos de anúncios: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Buscar insights de campanha específica
  async getCampaignInsights(campaignId: string, dateStart: string, dateEnd: string): Promise<MetaAdsInsight[]> {
    if (!this.user) {
      throw new Error('Usuário não está logado. Faça login primeiro.');
    }

    try {
      console.log(`Buscando insights da campanha ${campaignId}...`);
      
      const response = await axios.get(
        `${this.baseURL}/${campaignId}/insights`,
        {
          params: {
            access_token: this.user.accessToken,
            fields: 'date_start,date_stop,impressions,clicks,spend,ctr,cpm,cpp,reach,frequency,actions,cost_per_action_type',
            time_range: {
              since: dateStart,
              until: dateEnd
            },
            time_increment: 1
          }
        }
      );

      console.log('Insights da campanha encontrados:', response.data);
      return response.data.data || [];
    } catch (error: any) {
      console.error('Erro ao buscar insights da campanha:', error.response?.data || error.message);
      throw new Error(`Erro ao buscar insights da campanha: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Buscar insights de conjunto de anúncios específico
  async getAdSetInsights(adSetId: string, dateStart: string, dateEnd: string): Promise<MetaAdsInsight[]> {
    if (!this.user) {
      throw new Error('Usuário não está logado. Faça login primeiro.');
    }

    try {
      console.log(`Buscando insights do conjunto de anúncios ${adSetId}...`);
      
      const response = await axios.get(
        `${this.baseURL}/${adSetId}/insights`,
        {
          params: {
            access_token: this.user.accessToken,
            fields: 'date_start,date_stop,impressions,clicks,spend,ctr,cpm,cpp,reach,frequency,actions,cost_per_action_type',
            time_range: {
              since: dateStart,
              until: dateEnd
            },
            time_increment: 1
          }
        }
      );

      console.log('Insights do conjunto de anúncios encontrados:', response.data);
      return response.data.data || [];
    } catch (error: any) {
      console.error('Erro ao buscar insights do conjunto de anúncios:', error.response?.data || error.message);
      throw new Error(`Erro ao buscar insights do conjunto de anúncios: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Buscar insights da conta selecionada
  async getAccountInsights(dateStart: string, dateEnd: string): Promise<MetaAdsInsight[]> {
    if (!this.selectedAccount) {
      throw new Error('Nenhuma conta selecionada');
    }

    const params = { dateStart, dateEnd };
    
    return this.makeCachedRequest(
      'account_insights',
      async () => {
        console.log(`Buscando insights da conta ${this.selectedAccount!.id}...`);
        
        // Usar token de acesso se disponível, senão usar token do usuário
        const accessToken = this.getAccessToken() || (this.user?.accessToken);
        if (!accessToken) {
          throw new Error('Token de acesso não disponível');
        }

        try {
          console.log(`Buscando insights da conta ${this.selectedAccount!.id}...`);
          
          const response = await axios.get(
            `${this.baseURL}/${this.selectedAccount!.id}/insights`,
            {
              params: {
                access_token: accessToken,
                fields: 'date_start,date_stop,impressions,clicks,spend,ctr,cpm,cpp,reach,frequency,actions,cost_per_action_type',
                time_range: {
                  since: dateStart,
                  until: dateEnd
                },
                time_increment: 1, // Dados diários
                limit: 1000 // Aumentar limite para pegar mais dados
              }
            }
          );

          console.log('Insights encontrados:', response.data);
          return response.data.data || [];
        } catch (error: any) {
          console.error('Erro ao buscar insights:', error.response?.data || error.message);
          throw new Error(`Erro ao buscar insights: ${error.response?.data?.error?.message || error.message}`);
        }
      },
      this.CACHE_TTL.INSIGHTS,
      params
    );
  }

  // Converter dados para formato do dashboard
  convertToMetricData(insights: MetaAdsInsight[], month: string, client?: string, product?: string, audience?: string): any[] {
    return insights.map(insight => {
      const leads = insight.actions?.find(action => 
        action.action_type === 'lead' || action.action_type === 'complete_registration'
      )?.value || '0';

      const costPerLead = insight.cost_per_action_type?.find(cost => 
        cost.action_type === 'lead' || cost.action_type === 'complete_registration'
      )?.value || '0';

      const investment = parseFloat(insight.spend || '0');
      const impressions = parseInt(insight.impressions || '0');
      const clicks = parseInt(insight.clicks || '0');
      const leadsCount = parseInt(leads);
      const ctr = parseFloat(insight.ctr || '0');
      const cpm = parseFloat(insight.cpm || '0');
      const cpl = parseFloat(costPerLead || '0');

      const estimatedRevenue = leadsCount * 200;
      const roas = investment > 0 ? estimatedRevenue / investment : 0;
      const roi = investment > 0 ? ((estimatedRevenue - investment) / investment) * 100 : 0;

      return {
        date: insight.date_start,
        month: month,
        service: 'Meta Ads',
        client: client || 'Meta Ads',
        product: product || 'Campanha Meta Ads',
        audience: audience || 'Público Meta Ads',
        leads: leadsCount,
        revenue: estimatedRevenue,
        investment: investment,
        impressions: impressions,
        clicks: clicks,
        ctr: ctr,
        cpm: cpm,
        cpl: cpl,
        roas: roas,
        roi: roi,
        appointments: Math.floor(leadsCount * 0.6),
        sales: Math.floor(leadsCount * 0.3),
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });
  }

  // Sincronizar dados
  async syncMetrics(month: string, startDate: string, endDate: string, campaignId?: string, client?: string, product?: string) {
    if (!this.isLoggedIn() || !this.hasSelectedAccount()) {
      throw new Error('Usuário não logado ou conta não selecionada');
    }

    try {
      console.log('Sincronizando dados do Meta Ads...');
      
      let insights: MetaAdsInsight[];
      
      if (campaignId) {
        console.log(`Sincronizando dados da campanha: ${campaignId}`);
        insights = await this.getCampaignInsights(campaignId, startDate, endDate);
      } else {
        console.log('Sincronizando dados da conta inteira');
        insights = await this.getAccountInsights(startDate, endDate);
      }
      
      const metrics = this.convertToMetricData(insights, month, client, product);
      
      console.log(`Sincronizados ${metrics.length} registros do Meta Ads`);
      return metrics;
    } catch (error: any) {
      console.error('Erro na sincronização:', error.message);
      throw error;
    }
  }

  // Obter usuário atual
  getCurrentUser(): FacebookUser | null {
    return this.user;
  }

  // Obter conta selecionada
  getSelectedAccount(): AdAccount | null {
    return this.selectedAccount;
  }

  // Verificar status de login
  async getLoginStatus(): Promise<{ status: string; authResponse?: any }> {
    return new Promise((resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK não carregado'));
        return;
      }

      window.FB.getLoginStatus((response: any) => {
        console.log('Status de login:', response);
        resolve(response);
      });
    });
  }

  // Callback para mudança de status
  private statusChangeCallback(response: any) {
    console.log('Mudança de status detectada:', response);
    
    if (response.status === 'connected') {
      console.log('Usuário conectado:', response.authResponse);
      // O usuário está logado e autorizou o app
      const { accessToken, userID } = response.authResponse;
      
      // Buscar dados do usuário
      window.FB.api('/me', { fields: 'name,email' }, (userInfo: any) => {
        if (userInfo.error) {
          console.error('Erro ao buscar dados do usuário:', userInfo.error);
          return;
        }
        
        const user: FacebookUser = {
          id: userID,
          name: userInfo.name,
          email: userInfo.email,
          accessToken: accessToken
        };
        
        this.user = user;
        localStorage.setItem('facebookUser', JSON.stringify(user));
        console.log('Usuário salvo:', user);
      });
    } else if (response.status === 'not_authorized') {
      console.log('Usuário não autorizou o app');
      this.logout();
    } else {
      console.log('Usuário não está logado');
      this.logout();
    }
  }

  // Métodos públicos para gerenciar cache
  clearAllCache(): void {
    this.clearCache();
  }

  clearCacheByType(type: string): void {
    this.clearCache(type);
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Declarar tipos para Facebook SDK
declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export const metaAdsService = new MetaAdsService();