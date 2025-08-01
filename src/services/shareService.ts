// Serviço para geração de links de compartilhamento
export interface ShareLink {
  id: string;
  shortCode: string;
  originalUrl: string;
  createdAt: Date;
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
      console.error('Erro ao carregar links salvos:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const linksObj = Object.fromEntries(this.shareLinks);
      localStorage.setItem('shareLinks', JSON.stringify(linksObj));
    } catch (error) {
      console.error('Erro ao salvar links:', error);
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
    audience: string;
    product: string;
    client: string;
    month: string;
  }): ShareLink {
    const shortCode = this.generateUniqueShortCode();
    const baseUrl = window.location.origin;
    
    // Criar URL com parâmetros
    const searchParams = new URLSearchParams({
      audience: params.audience,
      product: params.product,
      client: params.client,
      month: params.month,
      shared: 'true'
    });
    
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