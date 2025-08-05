// Serviço para geração de links de compartilhamento
export interface ShareLink {
  id: string;
  shortCode: string;
  originalUrl: string;
  createdAt: Date;
  updatedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
}

class ShareService {
  private static instance: ShareService;
  private shareLinks: Map<string, ShareLink> = new Map();

  private constructor() {
    // Carregar links salvos do localStorage
    this.loadFromStorage();
  }

  public static getInstance(): ShareService {
    if (!ShareService.instance) {
      ShareService.instance = new ShareService();
    }
    return ShareService.instance;
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem('shareLinks');
      if (saved) {
        const links = JSON.parse(saved);
        
        // Converter strings de data de volta para objetos Date
        const processedLinks = Object.entries(links).reduce((acc, [key, value]: [string, any]) => {
          if (value && typeof value === 'object') {
            // Converter createdAt de string para Date
            if (value.createdAt && typeof value.createdAt === 'string') {
              value.createdAt = new Date(value.createdAt);
            }
            
            // Converter updatedAt de string para Date (se existir)
            if (value.updatedAt && typeof value.updatedAt === 'string') {
              value.updatedAt = new Date(value.updatedAt);
            }
            
            // Converter expiresAt de string para Date (se existir)
            if (value.expiresAt && typeof value.expiresAt === 'string') {
              value.expiresAt = new Date(value.expiresAt);
            }
          }
          acc[key] = value;
          return acc;
        }, {} as any);
        
        this.shareLinks = new Map(Object.entries(processedLinks));
      }
    } catch (error) {
      }
  }

  private saveToStorage(): void {
    try {
      const linksObj = Object.fromEntries(this.shareLinks);
      localStorage.setItem('shareLinks', JSON.stringify(linksObj));
    } catch (error) {
      }
  }

  private generateShortCode(): string {
    // Gerar código curto de 6 caracteres
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateUniqueShortCode(): string {
    let shortCode: string;
    do {
      shortCode = this.generateShortCode();
    } while (this.shareLinks.has(shortCode));
    return shortCode;
  }

  public createShareLink(params: {
    audience?: string;
    product: string;
    client: string;
    month: string;
    monthlyDetails?: {
      agendamentos: number;
      vendas: number;
    };
  }): ShareLink {
    const shortCode = this.generateUniqueShortCode();
    const baseUrl = window.location.origin;
    
    // Criar URL com parâmetros
    const searchParams = new URLSearchParams({
      audience: params.audience || '', // Make audience optional
      product: params.product,
      client: params.client,
      month: params.month,
      shared: 'true'
    });

    // Adicionar dados dos detalhes mensais se fornecidos
    if (params.monthlyDetails) {
      searchParams.set('agendamentos', params.monthlyDetails.agendamentos.toString());
      searchParams.set('vendas', params.monthlyDetails.vendas.toString());
    }
    
    const originalUrl = `${baseUrl}/shared-report?${searchParams.toString()}`;
    
    const shareLink: ShareLink = {
      id: shortCode,
      shortCode,
      originalUrl,
      createdAt: new Date(),
      isActive: true
    };

    this.shareLinks.set(shortCode, shareLink);
    this.saveToStorage();

    return shareLink;
  }

  public updateShareLink(shortCode: string, newParams: {
    audience?: string;
    product: string;
    client: string;
    month: string;
    monthlyDetails?: {
      agendamentos: number;
      vendas: number;
    };
  }): ShareLink | null {
    const link = this.shareLinks.get(shortCode);
    
    if (!link || !link.isActive) {
      return null;
    }

    // Criar nova URL com parâmetros atualizados
    const baseUrl = window.location.origin;
    const searchParams = new URLSearchParams({
      audience: newParams.audience || '', // Make audience optional
      product: newParams.product,
      client: newParams.client,
      month: newParams.month,
      shared: 'true'
    });

    // Adicionar dados dos detalhes mensais se fornecidos
    if (newParams.monthlyDetails) {
      searchParams.set('agendamentos', newParams.monthlyDetails.agendamentos.toString());
      searchParams.set('vendas', newParams.monthlyDetails.vendas.toString());
    }
    
    const newOriginalUrl = `${baseUrl}/shared-report?${searchParams.toString()}`;
    
    // Atualizar o link
    link.originalUrl = newOriginalUrl;
    link.updatedAt = new Date();
    
    this.saveToStorage();
    
    return link;
  }

  public getShareLink(shortCode: string): ShareLink | null {
    const link = this.shareLinks.get(shortCode);
    
    if (!link || !link.isActive) {
      return null;
    }

    // Verificar se o link expirou
    if (link.expiresAt && new Date() > link.expiresAt) {
      link.isActive = false;
      this.saveToStorage();
      return null;
    }

    return link;
  }

  public getShortUrl(shortCode: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/r/${shortCode}`;
  }

  public getAllShareLinks(): ShareLink[] {
    return Array.from(this.shareLinks.values())
      .filter(link => link.isActive)
      .sort((a, b) => {
        // Garantir que createdAt seja um objeto Date válido
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
  }

  public deactivateLink(shortCode: string): boolean {
    const link = this.shareLinks.get(shortCode);
    if (link) {
      link.isActive = false;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public deleteLink(shortCode: string): boolean {
    const deleted = this.shareLinks.delete(shortCode);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  public cleanupExpiredLinks(): void {
    const now = new Date();
    let hasChanges = false;

    for (const [shortCode, link] of this.shareLinks.entries()) {
      if (link.expiresAt && now > link.expiresAt) {
        this.shareLinks.delete(shortCode);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.saveToStorage();
    }
  }
}

export const shareService = ShareService.getInstance(); 