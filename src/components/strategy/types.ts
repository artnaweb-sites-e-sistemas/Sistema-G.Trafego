/**
 * Types para o módulo AdStrategySection
 * Centraliza todas as interfaces utilizadas no sistema de estratégias
 */

export interface AdStrategySectionProps {
    selectedClient: string;
    selectedMonth: string;
    onStrategyCreated: (strategy: AdStrategy) => void;
}

export interface AdStrategy {
    id: string;
    product: {
        name: string;
        campaignType: 'recorrente' | 'lancamento' | 'perpetuo';
        type: 'curso online' | 'servico local' | 'ecommerce' | 'infoproduto' | 'consultoria' | 'saas';
        objective: 'trafico' | 'mensagens' | 'compras' | 'captura_leads';
        ticket: number;
    };
    audience: {
        gender: 'masculino' | 'feminino' | 'ambos';
        ageRange: string;
        locations: string[];
        interests: string[];
        remarketing: string[];
        scaleType: 'vertical' | 'horizontal' | null;
    };
    budget: {
        planned: number;
        current: number;
        // Suporte a orçamentos por período
        byPeriod?: Record<string, {
            planned: number;
            current: number;
            isSynchronized?: boolean;
        }>;
    };
    generatedNames: {
        product: string;
        audience: string;
    };
    isSynchronized: boolean;
    client?: string;
    month?: string;

    // Campos de remarketing
    remarketing1?: RemarketingConfig;
    remarketing2?: RemarketingConfig;
    remarketing3?: RemarketingConfig;

    // Campos de serviços/orçamento
    services?: Array<{ service: string; value: string }>;
    savedStrategyType?: 'lp_whatsapp' | 'whatsapp_direto' | 'lp_direto';
}

export interface RemarketingConfig {
    name: string;
    budget: number;
    isSynchronized?: boolean;
    byPeriod?: Record<string, {
        budget: number;
        isSynchronized?: boolean;
    }>;
}

export interface StrategyRecommendation {
    type: 'vertical' | 'horizontal' | 'wait';
    tooltip: string;
    stats: StrategyStats;
}

export interface StrategyStats {
    spend: number;
    ctr: number;
    cpl: number;
    cpr: number;
    clicks: number;
    impressions: number;
    leads: number;
    sales: number;
    frequency?: number;
    roas?: number;
    lpvRate?: number;
    objective: 'trafico' | 'mensagens' | 'compras' | 'captura_leads';
    adSetsCount: number;
    periodStart: string;
    periodEnd: string;
}

export interface BudgetItem {
    service: string;
    value: string;
}

export type AdSetStatus = 'ACTIVE' | 'PAUSED' | 'UNKNOWN';
