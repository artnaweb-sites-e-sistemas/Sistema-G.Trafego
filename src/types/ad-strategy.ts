export interface AdStrategy {
    id: string;
    product: {
        name: string;
        campaignType: 'sazonal' | 'recorrente';
        type: string;
        objective: 'trafico' | 'mensagens' | 'compras' | 'captura_leads';
        ticket: number;
        niche?: string; // Adicionado opcional para compatibilidade
    };
    audience: {
        gender: 'homem' | 'mulher' | 'ambos';
        ageRange: string;
        locations: string[];
        interests: string[];
        remarketing: string[];
        scaleType?: 'vertical' | 'horizontal' | null;
    };
    budget: {
        planned: number;
        current: number;
    };
    generatedNames: {
        product: string;
        audience: string;
    };
    client: string;
    month: string;
    createdAt: Date;
    isSynchronized: boolean; // Agora obrigatório
    strategyReport?: any;
    remarketing1?: {
        audienceName: string;
        budget: {
            planned: number;
            current: number;
        };
        keywords: string;
        isSynchronized: boolean;
    };
    remarketing2?: {
        audienceName: string;
        budget: {
            planned: number;
            current: number;
        };
        keywords: string;
        isSynchronized: boolean;
    };
    remarketing3?: {
        audienceName: string;
        budget: {
            planned: number;
            current: number;
        };
        keywords: string;
        isSynchronized: boolean;
    };
    budgetItems?: Array<{
        service: string;
        value: string;
    }>;
}
