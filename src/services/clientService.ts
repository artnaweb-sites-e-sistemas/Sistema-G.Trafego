interface RemovedClient {
  id: string;
  name: string;
  source: 'manual' | 'facebook';
  removedAt: Date;
  businessManagerId?: string; // Para clientes do Facebook
}

class ClientService {
  private static instance: ClientService;
  private removedClients: Map<string, RemovedClient> = new Map();
  private readonly STORAGE_KEY = 'removedClients';

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): ClientService {
    if (!ClientService.instance) {
      ClientService.instance = new ClientService();
    }
    return ClientService.instance;
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const removedClients = JSON.parse(saved);
        this.removedClients = new Map(Object.entries(removedClients));
        
        // Converter strings de data de volta para objetos Date
        this.removedClients.forEach((client, key) => {
          if (typeof client.removedAt === 'string') {
            client.removedAt = new Date(client.removedAt);
          }
        });
        
        console.log('ClientService: Clientes removidos carregados:', this.removedClients.size);
      }
    } catch (error) {
      console.error('Erro ao carregar clientes removidos:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const removedClientsObj = Object.fromEntries(this.removedClients);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(removedClientsObj));
    } catch (error) {
      console.error('Erro ao salvar clientes removidos:', error);
    }
  }

  public removeClient(client: { id: string; name: string; source: 'manual' | 'facebook'; businessManager?: any }): void {
    const removedClient: RemovedClient = {
      id: client.id,
      name: client.name,
      source: client.source,
      removedAt: new Date(),
      businessManagerId: client.businessManager?.id
    };

    this.removedClients.set(client.id, removedClient);
    this.saveToStorage();
    
    console.log(`ClientService: Cliente removido: ${client.name} (${client.id})`);
  }

  public isClientRemoved(clientId: string): boolean {
    return this.removedClients.has(clientId);
  }

  public getRemovedClients(): RemovedClient[] {
    return Array.from(this.removedClients.values());
  }

  public restoreClient(clientId: string): void {
    if (this.removedClients.has(clientId)) {
      this.removedClients.delete(clientId);
      this.saveToStorage();
      console.log(`ClientService: Cliente restaurado: ${clientId}`);
    }
  }

  public clearRemovedClients(): void {
    this.removedClients.clear();
    this.saveToStorage();
    console.log('ClientService: Todos os clientes removidos foram limpos');
  }

  public filterRemovedClients(clients: any[]): any[] {
    return clients.filter(client => !this.isClientRemoved(client.id));
  }

  // Método para limpar clientes removidos antigos (mais de 30 dias)
  public cleanupOldRemovedClients(): void {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let removedCount = 0;
    for (const [clientId, client] of this.removedClients.entries()) {
      if (client.removedAt < thirtyDaysAgo) {
        this.removedClients.delete(clientId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.saveToStorage();
      console.log(`ClientService: ${removedCount} clientes removidos antigos foram limpos`);
    }
  }
}

export const clientService = ClientService.getInstance(); 