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

  constructor() {
    // Carregar rate limit persistente na inicialização
    this.loadPersistentRateLimit();
  }
  
  // Sistema de cache para reduzir chamadas à API
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL = {
    BUSINESS_MANAGERS: 30 * 60 * 1000, // 30 minutos
    AD_ACCOUNTS: 15 * 60 * 1000, // 15 minutos
    CAMPAIGNS: 2 * 60 * 1000, // 2 minutos (reduzido para atualizações mais frequentes)
    AD_SETS: 2 * 60 * 1000, // 2 minutos (reduzido para atualizações mais frequentes)
    INSIGHTS: 5 * 60 * 1000, // 5 minutos
    USER_INFO: 60 * 60 * 1000, // 1 hora
  };

  // Debounce para evitar múltiplas chamadas simultâneas
  private pendingRequests = new Map<string, Promise<any>>();

  // Sistema de rate limiting para OAuth
  private oauthAttempts = 0;
  private lastOAuthAttempt = 0;
  private facebookRateLimitActive = false;
  private facebookRateLimitUntil = 0;
  private readonly OAUTH_RATE_LIMIT = {
    MAX_ATTEMPTS: 5,
    WINDOW_MS: 15 * 60 * 1000, // 15 minutos
    BACKOFF_MS: 2 * 60 * 1000, // 2 minutos inicial
  };

  // Sistema de rate limiting persistente para produção
  private readonly RATE_LIMIT_STORAGE_KEY = 'metaAdsRateLimit';
  private readonly GLOBAL_RATE_LIMIT_KEY = 'metaAdsGlobalRateLimit';

  // Método para carregar rate limit persistente
  private loadPersistentRateLimit(): void {
    try {
      const stored = localStorage.getItem(this.RATE_LIMIT_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.oauthAttempts = data.oauthAttempts || 0;
        this.lastOAuthAttempt = data.lastOAuthAttempt || 0;
        this.facebookRateLimitActive = data.facebookRateLimitActive || false;
        this.facebookRateLimitUntil = data.facebookRateLimitUntil || 0;
      }
    } catch (error) {
      }
  }

  // Método para salvar rate limit persistente
  private savePersistentRateLimit(): void {
    try {
      const data = {
        oauthAttempts: this.oauthAttempts,
        lastOAuthAttempt: this.lastOAuthAttempt,
        facebookRateLimitActive: this.facebookRateLimitActive,
        facebookRateLimitUntil: this.facebookRateLimitUntil,
        timestamp: Date.now()
      };
      localStorage.setItem(this.RATE_LIMIT_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      }
  }

  // Método para verificar rate limit global (por IP/usuário)
  private async checkGlobalRateLimit(): Promise<boolean> {
    try {
      // Em produção, isso seria uma chamada para o servidor
      // Por enquanto, vamos usar localStorage como fallback
      const globalKey = `${this.GLOBAL_RATE_LIMIT_KEY}_${this.getUserIdentifier()}`;
      const stored = localStorage.getItem(globalKey);
      
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();
        
        // Verificar se ainda está dentro da janela de rate limit
        if (now < data.until) {
          return false; // Rate limit ativo
        } else {
          // Rate limit expirado, limpar
          localStorage.removeItem(globalKey);
        }
      }
      
      return true; // Pode tentar
    } catch (error) {
      return true; // Em caso de erro, permitir tentativa
    }
  }

  // Método para registrar rate limit global
  private async recordGlobalRateLimit(duration: number): Promise<void> {
    try {
      const globalKey = `${this.GLOBAL_RATE_LIMIT_KEY}_${this.getUserIdentifier()}`;
      const data = {
        until: Date.now() + duration,
        timestamp: Date.now(),
        attempts: 1
      };
      localStorage.setItem(globalKey, JSON.stringify(data));
    } catch (error) {
      }
  }

  // Método para obter identificador único do usuário
  private getUserIdentifier(): string {
    // Em produção, isso seria o ID do usuário logado
    // Por enquanto, vamos usar uma combinação de dados do navegador
    const userAgent = navigator.userAgent;
    const screenRes = `${screen.width}x${screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Criar um hash simples (em produção, usar algo mais robusto)
    let hash = 0;
    const str = `${userAgent}_${screenRes}_${timezone}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString();
  }

  // Método para verificar se podemos tentar OAuth novamente
  private async canAttemptOAuth(): Promise<boolean> {
    const now = Date.now();
    
    // Se o Facebook está com rate limit ativo, verificar se já passou
    if (this.facebookRateLimitActive && now < this.facebookRateLimitUntil) {
      return false;
    }
    
    // Se passou o tempo do rate limit do Facebook, resetar
    if (this.facebookRateLimitActive && now >= this.facebookRateLimitUntil) {
      this.facebookRateLimitActive = false;
      this.facebookRateLimitUntil = 0;
      this.savePersistentRateLimit();
    }
    
    // Reset contador se passou a janela de tempo
    if (now - this.lastOAuthAttempt > this.OAUTH_RATE_LIMIT.WINDOW_MS) {
      this.oauthAttempts = 0;
      this.savePersistentRateLimit();
    }
    
    // Verificar rate limit local
    const localCanAttempt = this.oauthAttempts < this.OAUTH_RATE_LIMIT.MAX_ATTEMPTS;
    
    if (!localCanAttempt) {
      return false;
    }
    
    // Verificar rate limit global (por usuário/IP)
    const globalCanAttempt = await this.checkGlobalRateLimit();
    
    return globalCanAttempt;
  }

  // Método para registrar tentativa de OAuth
  private recordOAuthAttempt(): void {
    this.oauthAttempts++;
    this.lastOAuthAttempt = Date.now();
    this.savePersistentRateLimit();
  }

  // Método para registrar rate limit do Facebook
  private recordFacebookRateLimit(): void {
    this.facebookRateLimitActive = true;
    // Definir rate limit do Facebook para 30 minutos (mais conservador)
    this.facebookRateLimitUntil = Date.now() + (30 * 60 * 1000);
    }

  // Método para calcular delay de backoff
  private getBackoffDelay(): number {
    const baseDelay = this.OAUTH_RATE_LIMIT.BACKOFF_MS;
    const exponentialDelay = baseDelay * Math.pow(2, this.oauthAttempts - 1);
    const jitter = Math.random() * 1000; // Adicionar jitter para evitar thundering herd
    return Math.min(exponentialDelay + jitter, 30 * 60 * 1000); // Máximo 30 minutos
  }

  // Métodos de cache
  private getCacheKey(type: string, params: any = {}): string {
    // Incluir cliente atual e conta selecionada nos parâmetros de cache
    const currentClient = localStorage.getItem('currentSelectedClient');
    if (currentClient) {
      params.client = currentClient;
    }
    
    // Incluir a conta selecionada para diferenciar cache por conta
    if (this.selectedAccount) {
      params.accountId = this.selectedAccount.id;
      params.accountName = this.selectedAccount.name;
    }
    
    // Ordenar parâmetros para garantir consistência na chave
    const sortedParams = Object.keys(params).sort().reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {} as any);
    
    const paramStr = Object.keys(sortedParams).length > 0 
      ? '_' + JSON.stringify(sortedParams) 
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
    
    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

  }

  private clearCache(type?: string): void {
    if (type) {
      // Limpar cache específico
      for (const key of this.cache.keys()) {
        if (key.startsWith(type)) {
          this.cache.delete(key);
        }
      }
      } else {
      // Limpar todo o cache
      this.cache.clear();
  
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
    }

  // Obter token de acesso
  getAccessToken(): string | null {
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem('facebookAccessToken');
    }
    return this.accessToken;
  }

  // Verificar se está configurado
  isConfigured(): boolean {
    return !!(this.user && this.selectedAccount);
  }

  // Inicializar Facebook SDK
  initFacebookSDK(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.FB) {
        window.FB.init({
          appId: this.appId,
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
        resolve();
      } else {
        // Aguardar SDK carregar
        window.fbAsyncInit = () => {
          window.FB.init({
            appId: this.appId,
            cookie: true,
            xfbml: true,
            version: 'v18.0'
          });
          resolve();
        };
      }
    });
  }

  // Login com Facebook
  async loginWithFacebook(): Promise<FacebookUser> {
    return new Promise(async (resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK não carregado. Verifique se o script está sendo carregado corretamente.'));
        return;
      }

      // Verificar rate limit antes de tentar login
      const canAttempt = await this.canAttemptOAuth();
      if (!canAttempt) {
        const delay = this.getBackoffDelay();
        const minutes = Math.ceil(delay / 60000);
        reject(new Error(`Rate limit do OAuth excedido. Tente novamente em ${minutes} minutos.`));
        return;
      }

      this.recordOAuthAttempt();

      // Verificar se já está logado primeiro
      window.FB.getLoginStatus((statusResponse: any) => {
        if (statusResponse.status === 'connected') {
          // Buscar dados do usuário
          window.FB.api('/me', { fields: 'name,email' }, (userInfo: any) => {
            if (userInfo.error) {
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
            resolve(user);
          });
        } else {
          // Login com permissões avançadas
          window.FB.login((response: any) => {
            if (response.authResponse) {
              const { accessToken, userID } = response.authResponse;
              // Buscar dados do usuário
              window.FB.api('/me', { fields: 'name,email' }, (userInfo: any) => {
                if (userInfo.error) {
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
              // Verificar se é rate limit do Facebook
              if (response.error && response.error.message && 
                  response.error.message.includes('rate limit')) {
                this.recordFacebookRateLimit();
                reject(new Error('Rate limit do Facebook ativo. Aguarde 30 minutos antes de tentar novamente.'));
                return;
              }
              
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
    return new Promise(async (resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK não carregado. Verifique se o script está sendo carregado corretamente.'));
        return;
      }

      // Verificar rate limit antes de tentar login
      const canAttempt = await this.canAttemptOAuth();
      if (!canAttempt) {
        const delay = this.getBackoffDelay();
        const minutes = Math.ceil(delay / 60000);
        reject(new Error(`Rate limit do OAuth excedido. Tente novamente em ${minutes} minutos.`));
        return;
      }

      this.recordOAuthAttempt();

      // Fazer logout primeiro para limpar permissões anteriores
      window.FB.logout();

      // Login solicitando apenas permissões básicas (que não precisam de App Review)
      window.FB.login((response: any) => {
        if (response.authResponse) {
          const { accessToken, userID } = response.authResponse;
          // Buscar dados do usuário
          window.FB.api('/me', { fields: 'name,email' }, (userInfo: any) => {
            if (userInfo.error) {
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
    // Limpar todo o cache ao fazer logout
    this.clearAllCache();
    
    // Limpar dados de localStorage relacionados ao Meta Ads
    this.clearAllMetaAdsLocalStorage();
    
    // Fazer logout do Facebook SDK se disponível
    if (window.FB && this.user?.accessToken) {
      try {
        window.FB.logout();
        } catch (error) {
        }
    }
    
    // Limpar dados do usuário
    this.user = null;
    this.selectedAccount = null;
    this.accessToken = null;
    
    // Limpar dados locais
    localStorage.removeItem('facebookUser');
    localStorage.removeItem('selectedAdAccount');
    localStorage.removeItem('facebookAccessToken');
    
    // Adicionar timestamp de logout para evitar restauração automática
    localStorage.setItem('metaAdsLogoutTimestamp', Date.now().toString());
    
    // Disparar evento para notificar componentes sobre logout
    window.dispatchEvent(new CustomEvent('metaAdsLoggedOut', {
      detail: { timestamp: Date.now() }
    }));
    
    // Resetar contador de tentativas OAuth
    this.resetOAuthRateLimit();
    
    }

  // Resetar rate limit do OAuth
  resetOAuthRateLimit(): void {
    this.oauthAttempts = 0;
    this.lastOAuthAttempt = 0;
    this.facebookRateLimitActive = false;
    this.facebookRateLimitUntil = 0;
    }

  // Obter status do rate limit do OAuth
  async getOAuthRateLimitStatus(): Promise<{ 
    attempts: number; 
    maxAttempts: number; 
    canAttempt: boolean; 
    nextAttemptDelay?: number;
    facebookRateLimit?: boolean;
    facebookRateLimitUntil?: number;
  }> {
    const canAttempt = await this.canAttemptOAuth();
    const status: { 
      attempts: number; 
      maxAttempts: number; 
      canAttempt: boolean; 
      nextAttemptDelay?: number;
      facebookRateLimit?: boolean;
      facebookRateLimitUntil?: number;
    } = {
      attempts: this.oauthAttempts,
      maxAttempts: this.OAUTH_RATE_LIMIT.MAX_ATTEMPTS,
      canAttempt,
      facebookRateLimit: this.facebookRateLimitActive,
      facebookRateLimitUntil: this.facebookRateLimitUntil
    };

    if (!canAttempt) {
      status.nextAttemptDelay = this.getBackoffDelay();
    }

    return status;
  }

  // Método para limpar todo o localStorage relacionado ao Meta Ads
  private clearAllMetaAdsLocalStorage(): void {
    const keysToRemove = [
      'facebookUser',
      'selectedAdAccount',
      'facebookAccessToken',
      'currentSelectedClient',
      'selectedProduct',
      'selectedAudience',
      'selectedCampaignId',
      'selectedAdSetId',
      'metaAds_campaigns',
      'metaAds_adsets',
      'metaAds_business_managers',
      'metaAds_ad_accounts_by_business',
      'metaAds_metrics',
      'metaAds_insights',
      'metaAds_campaign_insights',
      'metaAds_adset_insights',
      'metaAds_account_insights'
    ];
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        } catch (error) {
        }
    });
  }

  // Verificar se está logado
  isLoggedIn(): boolean {
    // Verificar se há usuário em memória
    if (this.user && this.user.accessToken) {
      return true;
    }
    
    // Verificar localStorage
    const savedUser = localStorage.getItem('facebookUser');
    const savedToken = localStorage.getItem('facebookAccessToken');
    
    if (savedUser && savedToken) {
      try {
        this.user = JSON.parse(savedUser);
        this.accessToken = savedToken;
        return true;
      } catch (error) {
        this.clearAllMetaAdsLocalStorage();
        return false;
      }
    }
    
    return false;
  }

  // Verificar se está logado E conectado (mais rigoroso)
  isConnected(): boolean {
    // Verificar se há usuário em memória E se não foi feito logout recentemente
    if (this.user && this.user.accessToken) {
      // Verificar se não há flag de logout recente
      const logoutTimestamp = localStorage.getItem('metaAdsLogoutTimestamp');
      if (logoutTimestamp) {
        const logoutTime = parseInt(logoutTimestamp);
        const now = Date.now();
        // Se o logout foi feito há menos de 5 minutos, considerar como desconectado
        if (now - logoutTime < 5 * 60 * 1000) {
          return false;
        }
      }
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

      return response.data.data.map((perm: any) => perm.permission);
    } catch (error: any) {
      return [];
    }
  }

  // Buscar Business Managers do usuário
  async getBusinessManagers(): Promise<BusinessManager[]> {
    // Se não está logado, tentar carregar dados salvos
    if (!this.isLoggedIn()) {
      const savedData = this.getDataFromStorage('business_managers');
      if (savedData) {
        return savedData;
      }
      throw new Error('Usuário não logado e não há dados salvos');
    }

    return this.makeCachedRequest(
      'business_managers',
      async () => {
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

          const data = response.data.data || [];
          // Salvar dados no localStorage
          this.saveDataAfterLoad('business_managers', data);
          
          return data;
        } catch (error: any) {
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
      
          return adAccounts.map((account: any) => ({
            ...account,
            business_id: businessId
          }));
        } catch (error: any) {
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
      const response = await axios.get(
        `${this.baseURL}/me/adaccounts`,
        {
          params: {
            access_token: this.user.accessToken,
            fields: 'id,name,account_id,account_status,currency'
          }
        }
      );

      if (response.data.error) {
        throw new Error(`Erro da API do Facebook: ${response.data.error.message}`);
      }

      const accounts = response.data.data.filter((account: AdAccount) => 
        account.account_status === 1 // Apenas contas ativas
      );

      if (accounts.length === 0) {
        throw new Error('Nenhuma conta de anúncios ativa encontrada. Verifique se você tem acesso a contas de anúncios.');
      }

      return accounts;
    } catch (error: any) {
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

  // Verificar se há conta selecionada
  hasSelectedAccount(): boolean {
    return !!this.selectedAccount;
  }

  // Buscar campanhas da conta selecionada com filtro de período
  async getCampaigns(dateStart?: string, dateEnd?: string): Promise<MetaAdsCampaign[]> {
    if (!this.isLoggedIn()) {
      throw new Error('Usuário não está logado no Meta Ads. Faça login novamente.');
    }
    
    if (!this.hasSelectedAccount()) {
      throw new Error('Nenhuma conta de anúncios selecionada. Selecione um Business Manager primeiro.');
    }
    
    if (!this.user?.accessToken && !this.accessToken) {
      throw new Error('Token de acesso não encontrado. Faça login novamente.');
    }

    if (!this.selectedAccount) {
      throw new Error('Conta de anúncios não configurada corretamente. Tente selecionar o cliente novamente.');
    }
    
    const params = { dateStart, dateEnd };
    
    return this.makeCachedRequest(
      'campaigns',
      async () => {
        try {
          const accessToken = this.user?.accessToken || this.getAccessToken();
          const url = `${this.baseURL}/${this.selectedAccount!.id}/campaigns`;
          
          const response = await axios.get(url, {
            params: {
              access_token: accessToken,
              fields: 'id,name,status,objective,created_time,updated_time,start_time,stop_time',
              limit: 1000
            }
          });

          const data = response.data.data || [];
          return data;
        } catch (error: any) {
          throw new Error(`Erro ao buscar campanhas: ${error.response?.data?.error?.message || error.message}`);
        }
      },
      this.CACHE_TTL.CAMPAIGNS,
      params
    );
  }

  // Buscar conjuntos de anúncios (Ad Sets) da conta selecionada
  async getAdSets(campaignId?: string, dateStart?: string, dateEnd?: string): Promise<any[]> {
    // Se não está logado, tentar carregar dados salvos
    if (!this.isLoggedIn()) {
      const savedData = this.getDataFromStorage('adsets');
      if (savedData) {
        return savedData;
      }
      throw new Error('Usuário não logado e não há dados salvos');
    }

    if (!this.hasSelectedAccount()) {
      throw new Error('Conta não selecionada');
    }

    try {
      const params: any = {
        access_token: this.user!.accessToken,
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

      let endpoint = `${this.baseURL}/${this.selectedAccount!.id}/adsets`;
      
      // Se uma campanha específica foi fornecida, buscar conjuntos dessa campanha
      if (campaignId) {
        endpoint = `${this.baseURL}/${campaignId}/adsets`;
      }

      const response = await axios.get(endpoint, { params });

      const data = response.data.data || [];
      // Salvar dados no localStorage
      this.saveDataAfterLoad('adsets', data);
      
      return data;
    } catch (error: any) {
      throw new Error(`Erro ao buscar conjuntos de anúncios: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Buscar insights de campanha específica
  async getCampaignInsights(campaignId: string, dateStart: string, dateEnd: string): Promise<MetaAdsInsight[]> {
    if (!this.user) {
      throw new Error('Usuário não está logado. Faça login primeiro.');
    }

    try {
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

      const insights = response.data.data || [];
      // Log detalhado dos primeiros insights para debug
      if (insights.length > 0) {
        // Verificar se há actions no primeiro insight
        if (insights[0].actions && insights[0].actions.length > 0) {
          // Verificar especificamente por messaging_conversations_started
          const messagingAction = insights[0].actions.find((action: any) => 
            action.action_type === 'messaging_conversations_started' || 
            action.action_type === 'onsite_conversion.messaging_conversation_started_7d'
          );
          } else {
          }
      } else {
        }

      return insights;
    } catch (error: any) {
      throw new Error(`Erro ao buscar insights da campanha: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Buscar insights de conjunto de anúncios específico
  async getAdSetInsights(adSetId: string, dateStart: string, dateEnd: string): Promise<MetaAdsInsight[]> {
    if (!this.user) {
      throw new Error('Usuário não está logado. Faça login primeiro.');
    }

    try {
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

      const insights = response.data.data || [];
      // Log detalhado dos primeiros insights para debug
      if (insights.length > 0) {
        // Verificar se há actions no primeiro insight
        if (insights[0].actions && insights[0].actions.length > 0) {
          // Verificar especificamente por messaging_conversations_started
          const messagingAction = insights[0].actions.find((action: any) => 
            action.action_type === 'messaging_conversations_started' || 
            action.action_type === 'onsite_conversion.messaging_conversation_started_7d'
          );
          } else {
          }
      } else {
        }

      return insights;
    } catch (error: any) {
      throw new Error(`Erro ao buscar insights do conjunto de anúncios: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Buscar especificamente a métrica messaging_conversations_started através do campo actions
  async getMessagingConversationsInsights(dateStart: string, dateEnd: string): Promise<MetaAdsInsight[]> {
    if (!this.selectedAccount) {
      return [];
    }

    const params = { dateStart, dateEnd, metric: 'messaging_conversations_started' };
    
    return this.makeCachedRequest(
      'messaging_conversations_insights',
      async () => {
        const accessToken = this.getAccessToken() || (this.user?.accessToken);
        if (!accessToken) {
          throw new Error('Token de acesso não disponível');
        }

        try {
          const response = await axios.get(
            `${this.baseURL}/${this.selectedAccount!.id}/insights`,
            {
              params: {
                access_token: accessToken,
                fields: 'date_start,date_stop,actions',
                time_range: {
                  since: dateStart,
                  until: dateEnd
                },
                time_increment: 1
              }
            }
          );

          const insights = response.data.data || [];
          // Log dos primeiros insights para debug
          if (insights.length > 0) {
            }

          return insights;
        } catch (error: any) {
          throw new Error(`Erro ao buscar insights com actions: ${error.response?.data?.error?.message || error.message}`);
        }
      },
      this.CACHE_TTL.INSIGHTS,
      params
    );
  }

  // Buscar insights da conta selecionada
  async getAccountInsights(dateStart: string, dateEnd: string): Promise<MetaAdsInsight[]> {
    if (!this.selectedAccount) {
      return [];
    }

    const params = { dateStart, dateEnd };
    
    return this.makeCachedRequest(
      'account_insights',
      async () => {
        const accessToken = this.getAccessToken() || (this.user?.accessToken);
        if (!accessToken) {
          throw new Error('Token de acesso não disponível');
        }

        try {
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

          const insights = response.data.data || [];
          if (insights.length === 0) {
            }

          return insights;
        } catch (error: any) {
          throw new Error(`Erro ao buscar insights: ${error.response?.data?.error?.message || error.message}`);
        }
      },
      this.CACHE_TTL.INSIGHTS,
      params
    );
  }

  // Converter dados para formato do dashboard
  convertToMetricData(insights: MetaAdsInsight[], month: string, client?: string, product?: string, audience?: string): any[] {
    const result = insights.map(insight => {
      const messagingConversations = insight.actions?.find((action: any) => 
        action.action_type === 'messaging_conversations_started' || 
        action.action_type === 'onsite_conversion.messaging_conversation_started_7d'
      )?.value || '0';
      
      // Manter a lógica existente para outros tipos de leads (fallback)
      const leads = insight.actions?.find((action: any) => 
        action.action_type === 'lead' || action.action_type === 'complete_registration'
      )?.value || '0';

      // Buscar cost_per_action_type para messaging_conversations_started
      const costPerMessagingConversation = insight.cost_per_action_type?.find((cost: any) => 
        cost.action_type === 'messaging_conversations_started' || 
        cost.action_type === 'onsite_conversion.messaging_conversation_started_7d'
      )?.value || '0';

      // Fallback para cost_per_action_type de leads tradicionais
      const costPerLead = insight.cost_per_action_type?.find((cost: any) => 
        cost.action_type === 'lead' || cost.action_type === 'complete_registration'
      )?.value || '0';

      const investment = parseFloat(insight.spend || '0');
      const impressions = parseInt(insight.impressions || '0');
      
      // Buscar especificamente cliques no link (link_click) em vez de todos os cliques
      const linkClicks = insight.actions?.find((action: any) => 
        action.action_type === 'link_click' || 
        action.action_type === 'onsite_conversion.link_click'
      )?.value || '0';
      
      // Usar cliques no link para cálculos de CPC e CTR
      const clicks = parseInt(linkClicks);
      const totalClicks = parseInt(insight.clicks || '0'); // Todos os cliques para referência
      
      // Priorizar messaging_conversations_started, mas usar fallback se não disponível
      const leadsCount = parseInt(messagingConversations) > 0 ? parseInt(messagingConversations) : parseInt(leads);
      
      // Buscar métricas de compras (purchase) - se não houver, será 0
      const purchases = insight.actions?.find((action: any) => 
        action.action_type === 'purchase' || 
        action.action_type === 'onsite_conversion.purchase'
      )?.value || '0';
      
      const salesCount = parseInt(purchases);

      // Calcular CTR baseado em cliques no link em vez do CTR geral
      const ctr = clicks > 0 && impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpm = parseFloat(insight.cpm || '0');
      
      // Usar cost_per_action_type de messaging_conversations_started se disponível, senão calcular CPC manualmente
      let cpl = 0;
      if (parseInt(messagingConversations) > 0 && parseFloat(costPerMessagingConversation) > 0) {
        cpl = parseFloat(costPerMessagingConversation);
      } else if (parseInt(leads) > 0 && parseFloat(costPerLead) > 0) {
        cpl = parseFloat(costPerLead);
      } else {
        // Calcular CPC manualmente: investimento / cliques no link
        cpl = clicks > 0 ? investment / clicks : 0;
      }

      const estimatedRevenue = leadsCount * 200;
      const roas = investment > 0 ? estimatedRevenue / investment : 0;
      const roi = investment > 0 ? ((estimatedRevenue - investment) / investment) * 100 : 0;

      // Corrigir data: Meta Ads pode retornar datas com offset de timezone
      let correctedDate = insight.date_start;
      try {
        if (insight.date_start) {
          // Se a data está no formato YYYY-MM-DD, usar diretamente
          if (/^\d{4}-\d{2}-\d{2}$/.test(insight.date_start)) {
            correctedDate = insight.date_start;
          } else {
            // Se não, tentar converter
            const date = new Date(insight.date_start);
            
            if (!isNaN(date.getTime())) {
              // O problema é que o Meta Ads retorna datas em UTC
              // e quando convertemos para local, há um deslocamento de timezone
              // Vamos criar a data local diretamente para evitar o offset
              const [year, month, day] = insight.date_start.split('-').map(Number);
              const localDate = new Date(year, month - 1, day); // month - 1 porque Date usa 0-based months
              correctedDate = localDate.toISOString().split('T')[0];
            }
          }
        }
      } catch (error) {
        correctedDate = insight.date_start;
      }

      const metricData = {
        date: correctedDate,
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
        appointments: leadsCount,
        sales: salesCount
      };

      return metricData;
    });
    
    return result;
  }

  // Sincronizar dados
  async syncMetrics(month: string, startDate: string, endDate: string, campaignId?: string, client?: string, product?: string, audience?: string) {
    if (!this.isLoggedIn() || !this.hasSelectedAccount()) {
      throw new Error('Usuário não logado ou conta não selecionada');
    }

    try {
      let insights: MetaAdsInsight[];
      
      if (campaignId) {
        insights = await this.getCampaignInsights(campaignId, startDate, endDate);
      } else {
        insights = await this.getAccountInsights(startDate, endDate);
      }
      
      const metrics = this.convertToMetricData(insights, month, client, product, audience);
      
      // Log do total de leads encontrados
      const totalLeads = metrics.reduce((sum, metric) => sum + metric.leads, 0);
      console.log(`Total de leads encontrados: ${totalLeads}`);
      
      // Log do total de vendas encontradas
      const totalSales = metrics.reduce((sum, metric) => sum + metric.sales, 0);
      console.log(`Total de vendas encontradas: ${totalSales}`);
      
      return metrics;
    } catch (error: any) {
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

  // Limpar conta selecionada
  clearSelectedAccount(): void {
    this.selectedAccount = null;
  }

  // Método de debug para verificar estado da conexão
  debugConnectionStatus(): void {
    console.log('Debugging connection status...');
    console.log('User logged in:', this.isLoggedIn());
    console.log('User connected:', this.isConnected());
    console.log('User:', this.user);
    console.log('Selected Account:', this.selectedAccount);
    console.log('Access Token:', this.getAccessToken());
  }

  // Verificar status de login
  async getLoginStatus(): Promise<{ status: string; authResponse?: any }> {
    return new Promise((resolve, reject) => {
      if (!window.FB) {
        reject(new Error('Facebook SDK não carregado'));
        return;
      }

      window.FB.getLoginStatus((response: any) => {
        resolve(response);
      });
    });
  }

  // Callback para mudança de status
  private statusChangeCallback(response: any) {
    if (response.status === 'connected') {
      // O usuário está logado e autorizou o app
      const { accessToken, userID } = response.authResponse;
      
      // Buscar dados do usuário
      window.FB.api('/me', { fields: 'name,email' }, (userInfo: any) => {
        if (userInfo.error) {
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
        });
    } else if (response.status === 'not_authorized') {
      this.logout();
    } else {
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

  // Método específico para limpar cache de métricas
  clearMetricsCache(): void {
    // Limpar cache de métricas
    for (const key of this.cache.keys()) {
      if (key.includes('metrics') || key.includes('insights') || key.includes('messaging_conversations')) {
        this.cache.delete(key);
        }
    }
    
    // Limpar também dados de métricas do localStorage
    const keysToRemove = [
      'metaAds_metrics',
      'metaAds_insights',
      'metaAds_campaign_insights',
      'metaAds_adset_insights',
      'metaAds_account_insights',
      'metaAds_messaging_conversations_insights'
    ];
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        } catch (error) {
        }
    });
  }

  // Método para forçar atualização dos dados (ignorar cache)
  async forceRefreshData(type: 'campaigns' | 'adsets' | 'insights' | 'all'): Promise<void> {
    if (type === 'all' || type === 'campaigns') {
      this.clearCache('campaigns');
      this.clearCache('adsets'); // Limpar também ad sets pois dependem de campanhas
    }
    
    if (type === 'all' || type === 'adsets') {
      this.clearCache('adsets');
    }
    
    if (type === 'all' || type === 'insights') {
      this.clearMetricsCache();
    }
    
    // Disparar evento para notificar componentes sobre atualização
    window.dispatchEvent(new CustomEvent('metaAdsDataRefreshed', {
      detail: { type, timestamp: Date.now() }
    }));
    
    }

  // Forçar refresh completo de todos os dados
  forceCompleteRefresh(): void {
    this.clearAllCache();
    this.clearAllMetaAdsLocalStorage();
    // Disparar evento para notificar componentes
    window.dispatchEvent(new CustomEvent('metaAdsDataRefreshed', {
      detail: { type: 'all', timestamp: Date.now() }
    }));
  }

  // Método para testar a extração da métrica messaging_conversations_started
  async testMessagingConversationsExtraction(dateStart: string, dateEnd: string): Promise<any> {
    if (!this.selectedAccount || !this.isLoggedIn()) {
      throw new Error('Conta não selecionada ou usuário não logado');
    }

    try {
      // Buscar insights com a nova métrica
      const insights = await this.getAccountInsights(dateStart, dateEnd);
      
      if (insights.length > 0) {
        const firstInsight = insights[0];
        // Verificar se há messaging_conversations_started nas actions
          const messagingConversations = firstInsight.actions?.find((action: any) => 
            action.action_type === 'messaging_conversations_started' || 
            action.action_type === 'onsite_conversion.messaging_conversation_started_7d'
          );
          // Testar conversão
        const testMetrics = this.convertToMetricData(insights, 'Teste', 'Teste', 'Teste', 'Teste');
        return {
          success: true,
          insightsCount: insights.length,
          firstInsight,
          convertedMetrics: testMetrics,
          messagingConversationsAvailable: insights.some(i => {
            const action = i.actions?.find((a: any) => 
              a.action_type === 'messaging_conversations_started' || 
              a.action_type === 'onsite_conversion.messaging_conversation_started_7d'
            );
            return action && parseInt(action.value) > 0;
          })
        };
      }
      
      return {
        success: true,
        insightsCount: 0,
        message: 'Nenhum insight encontrado para o período'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Método para verificar se há atualizações nas campanhas
  async checkForUpdates(): Promise<boolean> {
    if (!this.selectedAccount || !this.isLoggedIn()) {
      return false;
    }

    try {
      // Buscar apenas informações básicas das campanhas para verificar atualizações
      const response = await axios.get(
        `${this.baseURL}/${this.selectedAccount.id}/campaigns`,
        {
          params: {
            access_token: this.user?.accessToken || this.getAccessToken(),
            fields: 'id,name,updated_time',
            limit: 10 // Apenas algumas campanhas para verificar
          }
        }
      );

      const currentCampaigns = response.data.data || [];
      const cachedCampaigns = this.getFromCache<MetaAdsCampaign[]>('campaigns');

      if (!cachedCampaigns || cachedCampaigns.length === 0) {
        return true; // Se não há cache, precisa atualizar
      }

      // Verificar se há diferenças nas campanhas
      for (const currentCampaign of currentCampaigns) {
        const cachedCampaign = cachedCampaigns.find(c => c.id === currentCampaign.id);
        if (!cachedCampaign || cachedCampaign.updated_time !== currentCampaign.updated_time) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  // Método para sincronização inteligente
  async smartSync(): Promise<void> {
    const hasUpdates = await this.checkForUpdates();
    
    if (hasUpdates) {
      await this.forceRefreshData('all');
    } else {
      }
  }

  clearCacheByClient(clientName: string): void {
    // Limpar cache que contém dados do cliente específico
    for (const key of this.cache.keys()) {
      if (key.includes(clientName)) {
        this.cache.delete(key);
        }
    }
    
    // Limpar também dados do localStorage relacionados
    this.clearLocalStorageByClient(clientName);
  }

  // Novo método para limpar localStorage por cliente
  private clearLocalStorageByClient(clientName: string): void {
    const keysToRemove = [
      'metaAds_campaigns',
      'metaAds_adsets',
      'metaAds_business_managers',
      'metaAds_ad_accounts_by_business'
    ];
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        } catch (error) {
        }
    });
  }

  // Método para invalidar cache específico sem limpar completamente
  invalidateCache(type: string, params: any = {}): void {
    const cacheKey = this.getCacheKey(type, params);
    if (this.cache.has(cacheKey)) {
      this.cache.delete(cacheKey);
      }
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Métodos para persistir dados no localStorage
  saveDataToStorage(type: string, data: any): void {
    try {
      const key = `metaAds_${type}`;
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      } catch (error) {
      }
  }

  getDataFromStorage(type: string): any | null {
    try {
      const key = `metaAds_${type}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Verificar se os dados não são muito antigos (7 dias)
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        if (parsed.timestamp > sevenDaysAgo) {
          return parsed.data;
        } else {
          localStorage.removeItem(key);
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  hasStoredData(type: string): boolean {
    return this.getDataFromStorage(type) !== null;
  }

  // Salvar dados automaticamente quando carregados
  private saveDataAfterLoad(type: string, data: any): void {
    this.saveDataToStorage(type, data);
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