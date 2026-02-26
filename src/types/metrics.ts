export interface MetricData {
    id?: string;
    date: string;
    month: string;
    service: string;
    client: string;
    product: string;
    audience: string;
    adSetId?: string;
    campaignId?: string;
    // Resultado primário para CPR (mensagens/leads/vendas conforme objetivo)
    resultCount?: number;
    resultType?: 'messages' | 'leads' | 'sales';
    leads: number;
    revenue: number;
    investment: number;
    impressions: number;
    reach?: number;
    clicks: number;
    ctr: number;
    landingPageViews?: number;
    cpm: number;
    cpl: number;
    cpr?: number; // Custo por resultado (dinâmico baseado no objetivo da campanha)
    roas: number;
    roi: number;
    appointments: number;
    sales: number;
    createdAt?: Date;
    updatedAt?: Date;
}
