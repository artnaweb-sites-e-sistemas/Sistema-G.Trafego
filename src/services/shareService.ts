import { firestoreShareService } from './firestoreShareService';
import { authService } from './authService';

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
    this.loadFromStorage();
    // Atualiza em background com Firestore, sem bloquear a UI
    this.refreshFromFirestoreInBackground();
  }

  public static getInstance(): ShareService {
    if (!ShareService.instance) {
      ShareService.instance = new ShareService();
    }
    return ShareService.instance;
  }

  private isUserAuthenticated(): boolean {
    const user = authService.getCurrentUser();
    return !!user?.uid;
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem('shareLinks');
      if (saved) {
        const entries = Object.entries(JSON.parse(saved) as Record<string, ShareLink>);
        this.shareLinks = new Map(
          entries.map(([code, link]) => [
            code,
            {
              ...link,
              createdAt: new Date(link.createdAt),
              updatedAt: link.updatedAt ? new Date(link.updatedAt) : undefined,
              expiresAt: link.expiresAt ? new Date(link.expiresAt) : undefined,
            },
          ]),
        );
      }
    } catch {}
  }

  private saveToStorage(): void {
    try {
      const obj = Object.fromEntries(this.shareLinks);
      localStorage.setItem('shareLinks', JSON.stringify(obj));
    } catch {}
  }

  private async refreshFromFirestoreInBackground(): Promise<void> {
    if (!this.isUserAuthenticated()) return;
    try {
      const links = await firestoreShareService.getAllShareLinks();
      if (links && links.length > 0) {
        for (const link of links) {
          this.shareLinks.set(link.shortCode, link);
        }
        this.saveToStorage();
      }
    } catch {}
  }

  private generateShortCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateUniqueShortCode(): string {
    let code = '';
    do {
      code = this.generateShortCode();
    } while (this.shareLinks.has(code));
    return code;
  }

  // Mantém API síncrona existente para não quebrar os componentes
  createShareLink(params: {
    audience?: string;
    product: string;
    client: string;
    month: string;
    monthlyDetails?: { agendamentos: number; vendas: number };
  }): ShareLink {
    const shortCode = this.generateUniqueShortCode();
    const baseUrl = window.location.origin;
    const searchParams = new URLSearchParams({
      audience: params.audience || '',
      product: params.product,
      client: params.client,
      month: params.month,
      shared: 'true',
    });
    if (params.monthlyDetails) {
      searchParams.set('agendamentos', String(params.monthlyDetails.agendamentos));
      searchParams.set('vendas', String(params.monthlyDetails.vendas));
    }

    const shareLink: ShareLink = {
      id: shortCode,
      shortCode,
      originalUrl: `${baseUrl}/shared-report?${searchParams.toString()}`,
      createdAt: new Date(),
      isActive: true,
    };

    this.shareLinks.set(shortCode, shareLink);
    this.saveToStorage();

    // Persistir em Firestore em background
    if (this.isUserAuthenticated()) {
      firestoreShareService.saveShareLink(shareLink).catch(() => {});
    }

    return shareLink;
  }

  updateShareLink(
    shortCode: string,
    newParams: {
      audience?: string;
      product: string;
      client: string;
      month: string;
      monthlyDetails?: { agendamentos: number; vendas: number };
    },
  ): ShareLink | null {
    const link = this.shareLinks.get(shortCode);
    if (!link || !link.isActive) return null;

    const baseUrl = window.location.origin;
    const searchParams = new URLSearchParams({
      audience: newParams.audience || '',
      product: newParams.product,
      client: newParams.client,
      month: newParams.month,
      shared: 'true',
    });
    if (newParams.monthlyDetails) {
      searchParams.set('agendamentos', String(newParams.monthlyDetails.agendamentos));
      searchParams.set('vendas', String(newParams.monthlyDetails.vendas));
    }

    link.originalUrl = `${baseUrl}/shared-report?${searchParams.toString()}`;
    link.updatedAt = new Date();
    this.saveToStorage();

    if (this.isUserAuthenticated()) {
      firestoreShareService.updateShareLink(link).catch(() => {});
    }

    return link;
  }

  getShareLink(shortCode: string): ShareLink | null {
    const local = this.shareLinks.get(shortCode) || null;
    if (this.isUserAuthenticated()) {
      // Atualiza em background a versão local
      firestoreShareService
        .getShareLink(shortCode)
        .then((remote) => {
          if (remote) {
            this.shareLinks.set(shortCode, remote);
            this.saveToStorage();
          }
        })
        .catch(() => {});
    }
    return local;
  }

  getShortUrl(shortCode: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/r/${shortCode}`;
  }

  getAllShareLinks(): ShareLink[] {
    // Em background, tenta atualizar a partir do Firestore
    this.refreshFromFirestoreInBackground();
    return Array.from(this.shareLinks.values())
      .filter((l) => l.isActive)
      .sort((a, b) => {
        const da = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const db = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return db.getTime() - da.getTime();
      });
  }

  deactivateLink(shortCode: string): boolean {
    const link = this.shareLinks.get(shortCode);
    if (!link) return false;
    link.isActive = false;
    this.saveToStorage();
    if (this.isUserAuthenticated()) {
      firestoreShareService.deactivateLink(shortCode).catch(() => {});
    }
    return true;
  }

  deleteLink(shortCode: string): boolean {
    const deleted = this.shareLinks.delete(shortCode);
    if (deleted) {
      this.saveToStorage();
      if (this.isUserAuthenticated()) {
        firestoreShareService.deleteLink(shortCode).catch(() => {});
      }
    }
    return deleted;
  }

  cleanupExpiredLinks(): void {
    const now = new Date();
    let changed = false;
    for (const [code, link] of this.shareLinks.entries()) {
      if (link.expiresAt && now > link.expiresAt) {
        this.shareLinks.delete(code);
        changed = true;
      }
    }
    if (changed) this.saveToStorage();
    if (this.isUserAuthenticated()) {
      firestoreShareService.cleanupExpiredLinks().catch(() => {});
    }
  }
}

export const shareService = ShareService.getInstance();


