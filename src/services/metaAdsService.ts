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
  private appId = import.meta.env.VITE_FACEBOOK_APP_ID || '1829212554641028'; // Usar import.meta.env para Vite

  // Verificar se o serviço está configurado
  isConfigured(): boolean {
    return this.isLoggedIn() && this.hasSelectedAccount();
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

      // Verificar se estamos em desenvolvimento local
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isLocalhost) {
        // Para desenvolvimento local, vamos usar uma abordagem diferente
        console.log('Executando em localhost - usando configuração de desenvolvimento');
      }

      // Primeiro fazer login com permissões básicas
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
            resolve(user);
          });
        } else {
          console.error('Login falhou:', response);
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
    this.user = null;
    this.selectedAccount = null;
    localStorage.removeItem('facebookUser');
    localStorage.removeItem('selectedAdAccount');
    
    if (window.FB) {
      window.FB.logout();
    }
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
    if (!this.user) {
      throw new Error('Usuário não está logado. Faça login primeiro.');
    }

    try {
      console.log('Buscando Business Managers...');
      
      const response = await axios.get(
        `${this.baseURL}/me/businesses`,
        {
          params: {
            access_token: this.user.accessToken,
            fields: 'id,name,account_type'
          }
        }
      );

      console.log('Business Managers encontrados:', response.data);
      return response.data.data || [];
    } catch (error: any) {
      console.error('Erro ao buscar Business Managers:', error.response?.data || error.message);
      // Se não conseguir buscar Business Managers, retorna array vazio
      return [];
    }
  }

  // Buscar contas de anúncios de um Business Manager específico
  async getAdAccountsByBusiness(businessId: string): Promise<AdAccount[]> {
    if (!this.user) {
      throw new Error('Usuário não está logado. Faça login primeiro.');
    }

    try {
      console.log(`Buscando contas de anúncios do Business Manager ${businessId}...`);
      
      const response = await axios.get(
        `${this.baseURL}/${businessId}/adaccounts`,
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

      console.log('Contas de anúncios encontradas:', accounts);
      return accounts;
    } catch (error: any) {
      console.error('Erro ao buscar contas de anúncios:', error.response?.data || error.message);
      throw new Error(`Erro ao buscar contas: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Buscar contas de anúncios do usuário (método original - mantido para compatibilidade)
  async getAdAccounts(): Promise<AdAccount[]> {
    if (!this.user) {
      throw new Error('Usuário não está logado. Faça login primeiro.');
    }

    try {
      console.log('Buscando contas de anúncios...');
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
      if (error.response?.data?.error?.code === 190) {
        throw new Error('Token de acesso expirado. Faça login novamente.');
      }
      
      // Se o erro for sobre permissões, dar uma mensagem mais amigável
      if (error.response?.data?.error?.code === 200) {
        throw new Error('Permissões de anúncios não concedidas. Para acessar contas de anúncios, você precisa conceder permissões adicionais.');
      }
      
      console.error('Erro ao buscar contas de anúncios:', error.response?.data || error.message);
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

  // Buscar campanhas da conta selecionada
  async getCampaigns(): Promise<MetaAdsCampaign[]> {
    if (!this.user || !this.selectedAccount) {
      throw new Error('Usuário não logado ou conta não selecionada');
    }

    try {
      const response = await axios.get(
        `${this.baseURL}/${this.selectedAccount.id}/campaigns`,
        {
          params: {
            access_token: this.user.accessToken,
            fields: 'id,name,status,objective,created_time,updated_time',
            limit: 100
          }
        }
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao buscar campanhas:', error.response?.data || error.message);
      throw new Error(`Erro ao buscar campanhas: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Buscar insights da conta selecionada
  async getAccountInsights(dateStart: string, dateEnd: string): Promise<MetaAdsInsight[]> {
    if (!this.user || !this.selectedAccount) {
      throw new Error('Usuário não logado ou conta não selecionada');
    }

    try {
      const response = await axios.get(
        `${this.baseURL}/${this.selectedAccount.id}/insights`,
        {
          params: {
            access_token: this.user.accessToken,
            time_range: JSON.stringify({
              since: dateStart,
              until: dateEnd
            }),
            fields: [
              'impressions',
              'clicks',
              'spend',
              'ctr',
              'cpm',
              'cpp',
              'reach',
              'frequency',
              'actions',
              'cost_per_action_type'
            ].join(','),
            time_increment: 1,
            level: 'account'
          }
        }
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao buscar insights:', error.response?.data || error.message);
      throw new Error(`Erro ao buscar insights: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Buscar insights de uma campanha específica
  async getCampaignInsights(campaignId: string, dateStart: string, dateEnd: string): Promise<MetaAdsInsight[]> {
    if (!this.user || !this.selectedAccount) {
      throw new Error('Usuário não logado ou conta não selecionada');
    }

    try {
      const response = await axios.get(
        `${this.baseURL}/${campaignId}/insights`,
        {
          params: {
            access_token: this.user.accessToken,
            time_range: JSON.stringify({
              since: dateStart,
              until: dateEnd
            }),
            fields: [
              'impressions',
              'clicks',
              'spend',
              'ctr',
              'cpm',
              'cpp',
              'reach',
              'frequency',
              'actions',
              'cost_per_action_type'
            ].join(','),
            time_increment: 1,
            level: 'campaign'
          }
        }
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao buscar insights da campanha:', error.response?.data || error.message);
      throw new Error(`Erro ao buscar insights da campanha: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Converter dados para formato do dashboard
  convertToMetricData(insights: MetaAdsInsight[], month: string): any[] {
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
  async syncMetrics(month: string, startDate: string, endDate: string, campaignId?: string) {
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
      
      const metrics = this.convertToMetricData(insights, month);
      
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
}

// Declarar tipos para Facebook SDK
declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export const metaAdsService = new MetaAdsService();