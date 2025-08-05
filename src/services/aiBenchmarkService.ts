import OpenAI from 'openai';

export interface BenchmarkData {
  productNiche: string;
  targetAudience: {
    ageRange: string;
    gender: string;
    interests: string[];
    location: string;
  };
  productValue: number;
  productType: string;
  campaignObjective: string;
  salesProcess: {
    requiresScheduling: boolean; // Se o produto requer agendamento
    salesMethod: 'direct' | 'consultation' | 'demo' | 'trial'; // Método de venda
    avgSalesTime: string; // Tempo médio para fechar venda
  };
  leadQuality: 'high' | 'medium' | 'low'; // Qualidade esperada dos leads
  competitionLevel: 'low' | 'medium' | 'high'; // Nível de competição no nicho
  additionalInfo?: string;
  // NOVO: Dados históricos para melhorar precisão
  useHistoricalData?: boolean;
  selectedProduct?: string;
  selectedCampaign?: string;
}

export interface BenchmarkResults {
  cpm: number;
  cpc: number;
  ctr: number;
  txMensagens: number; // Taxa de Mensagens (Leads/Cliques) em %
  txAgendamento: number; // Taxa de Agendamento em %
  txConversaoVendas: number; // Taxa de Conversão de Vendas em %
  confidence: number; // Nível de confiança da previsão (0-100)
  insights: string[];
}

export class AIBenchmarkService {
  private openai: OpenAI;
  private isQuotaExhausted: boolean = false;
  private lastQuotaCheck: number = 0;
  private readonly QUOTA_CHECK_INTERVAL = 60000; // 1 minuto

  constructor() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('VITE_OPENAI_API_KEY não encontrada nas variáveis de ambiente. Funcionalidade de IA será limitada.');
      // Não lançar erro, apenas marcar como não configurado
      this.openai = null as any;
      return;
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Para uso no frontend - em produção considere usar proxy
    });
  }

  async generateBenchmark(data: BenchmarkData): Promise<BenchmarkResults> {
    // 🚀 NOVA FUNCIONALIDADE: Integrar dados históricos reais
    let historicalData = null;
    let confidence = 60; // Base: simulado
    
    try {
      // Tentar buscar dados históricos reais se conectado ao Meta Ads
      if (data.useHistoricalData && data.selectedProduct) {
        historicalData = await this.getHistoricalData(data.selectedProduct, data.selectedCampaign);
        if (historicalData) {
          confidence = 95; // Alta confiança com dados reais
          console.info('🎯 Usando dados históricos reais para benchmark');
        }
      }
    } catch (error) {
      console.warn('Erro ao buscar dados históricos:', error);
    }

    // Verificar se o OpenAI está configurado
    if (!this.openai) {
      console.info('OpenAI não configurado, usando valores simulados');
      return this.generateSimulatedBenchmark(data, historicalData, confidence);
    }

    // Verificar se já sabemos que a quota está esgotada
    const now = Date.now();
    if (this.isQuotaExhausted && (now - this.lastQuotaCheck) < this.QUOTA_CHECK_INTERVAL) {
      console.info('Quota da OpenAI esgotada, usando valores simulados (cache)');
      return this.generateSimulatedBenchmark(data, historicalData, confidence);
    }

    try {
      const prompt = this.buildPrompt(data, historicalData);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em marketing digital e Facebook Ads com vasta experiência em benchmarks de diferentes nichos e produtos. Quando dados históricos reais são fornecidos, use-os como base principal para as estimativas. Sempre responda em formato JSON válido conforme solicitado."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: historicalData ? 0.1 : 0.3, // Menor temperatura com dados reais
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('Resposta vazia da OpenAI');
      }

      // Se chegou até aqui, a quota não está esgotada
      this.isQuotaExhausted = false;
      
      const result = this.parseAIResponse(response);
      // Ajustar confiança baseada na fonte dos dados
      result.confidence = historicalData ? Math.min(95, result.confidence + 20) : result.confidence;
      
      return result;
    } catch (error: any) {
      // Verificar se é erro de quota ou rate limit
      if (error?.status === 429 || error?.message?.includes('quota') || error?.message?.includes('rate limit')) {
        this.isQuotaExhausted = true;
        this.lastQuotaCheck = now;
        console.info('Quota da OpenAI esgotada, usando valores simulados');
        return this.generateSimulatedBenchmark(data, historicalData, confidence);
      }
      
      // Outros erros da API
      if (error?.status >= 400 && error?.status < 500) {
        console.warn('Erro de API, usando valores simulados');
        return this.generateSimulatedBenchmark(data, historicalData, confidence);
      }
      
      console.error('Erro ao gerar benchmark com IA:', error);
      throw new Error('Erro ao gerar benchmark. Tente novamente.');
    }
  }

  // Método para gerar benchmark simulado quando a API não está disponível
  private generateSimulatedBenchmark(data: BenchmarkData, historicalData?: any, confidence?: number): BenchmarkResults {
    // 🚀 PRIORIZAR DADOS HISTÓRICOS REAIS se disponíveis
    if (historicalData && historicalData.dataQuality === 'real') {
      return {
        cpm: Number(historicalData.avgCPM.toFixed(2)),
        cpc: Number(historicalData.avgCPC.toFixed(2)),
        ctr: Number(historicalData.avgCTR.toFixed(2)),
        txMensagens: Number(historicalData.avgLeadRate.toFixed(2)),
        txAgendamento: this.calculateSchedulingRate(data.salesProcess.salesMethod, historicalData.avgLeadRate), // Baseado no método de vendas
        txConversaoVendas: Number(historicalData.avgConversionRate.toFixed(2)),
        confidence: confidence || 95, // Alta confiança com dados reais
        insights: [
          `🎯 Baseado em ${historicalData.totalPeriods} períodos de dados REAIS da sua conta`,
          `CPM médio atual: R$ ${historicalData.avgCPM.toFixed(2)} - mantenha este patamar`,
          `CTR de ${historicalData.avgCTR.toFixed(2)}% demonstra boa relevância do público`,
          `Taxa de conversão real de ${historicalData.avgConversionRate.toFixed(2)}% é sua baseline atual`
        ]
      };
    }

    // Algoritmo básico para simular valores baseados nos dados do produto
    const baseMultiplier = this.getBaseMultiplierByNiche(data.productNiche);
    const valueMultiplier = this.getValueMultiplier(data.productValue);
    const audienceMultiplier = this.getAudienceMultiplier(data.targetAudience);
    
    const baseCPM = 15 + (Math.random() * 10); // 15-25
    const baseCPC = 0.8 + (Math.random() * 1.2); // 0.8-2.0
    const baseCTR = 0.8 + (Math.random() * 1.5); // 0.8-2.3
    
    // Calcular taxas baseadas no processo de venda e qualidade dos leads
    const salesMultiplier = this.getSalesProcessMultiplier(data.salesProcess);
    const qualityMultiplier = this.getLeadQualityMultiplier(data.leadQuality);
    const competitionMultiplier = this.getCompetitionMultiplier(data.competitionLevel);

    // Taxas base para o mercado brasileiro
    const baseTxMensagens = 15 + (Math.random() * 10); // 15-25%
    
    // 🎯 CORRIGIDO: Taxa de agendamento baseada no MÉTODO DE VENDAS, não no boolean
    let baseTxAgendamento = 0;
    switch (data.salesProcess.salesMethod) {
      case 'consultation': // Consultoria/mentoria
        baseTxAgendamento = 35 + (Math.random() * 15); // 35-50%
        break;
      case 'demo': // Demonstração/apresentação
        baseTxAgendamento = 25 + (Math.random() * 15); // 25-40%
        break;
      case 'trial': // Teste grátis/aula experimental
        baseTxAgendamento = 20 + (Math.random() * 15); // 20-35%
        break;
      case 'direct': // Venda direta
      default:
        baseTxAgendamento = 0; // Não tem agendamento
        break;
    }
    
    const baseTxConversao = 8 + (Math.random() * 12); // 8-20%

    return {
      cpm: Number((baseCPM * baseMultiplier * competitionMultiplier).toFixed(2)),
      cpc: Number((baseCPC * baseMultiplier * valueMultiplier * competitionMultiplier).toFixed(2)),
      ctr: Number((baseCTR / baseMultiplier).toFixed(2)),
      txMensagens: Number((baseTxMensagens * qualityMultiplier).toFixed(2)),
      txAgendamento: Number((baseTxAgendamento * salesMultiplier * qualityMultiplier).toFixed(2)),
      txConversaoVendas: Number((baseTxConversao * salesMultiplier * qualityMultiplier).toFixed(2)),
      confidence: confidence || 60, // Usar confiança fornecida ou padrão baixo para simulado
      insights: [
        `🤖 Dados simulados para ${data.productNiche} - conecte Meta Ads para dados reais`,
        `CPM estimado entre R$ ${(baseCPM * baseMultiplier * competitionMultiplier * 0.8).toFixed(2)} e R$ ${(baseCPM * baseMultiplier * competitionMultiplier * 1.2).toFixed(2)}`,
        `Com ${this.getSalesMethodName(data.salesProcess.salesMethod)}, taxa de conversão estimada: ${(baseTxConversao * salesMultiplier * qualityMultiplier).toFixed(1)}%`,
        baseTxAgendamento > 0 ? 
          `Taxa de agendamento estimada: ${(baseTxAgendamento * salesMultiplier * qualityMultiplier).toFixed(1)}% (leads que agendam ${this.getSchedulingAction(data.salesProcess.salesMethod)})` :
          `Venda direta: foque em conversões imediatas - otimize landing page e checkout`
      ]
    };
  }

  private getBaseMultiplierByNiche(niche: string): number {
    const lowerNiche = niche.toLowerCase();
    
    if (lowerNiche.includes('fitness') || lowerNiche.includes('saúde')) return 1.3;
    if (lowerNiche.includes('educação') || lowerNiche.includes('curso')) return 0.9;
    if (lowerNiche.includes('tecnologia') || lowerNiche.includes('software')) return 1.4;
    if (lowerNiche.includes('beleza') || lowerNiche.includes('cosmético')) return 1.2;
    if (lowerNiche.includes('financeiro') || lowerNiche.includes('investimento')) return 1.6;
    if (lowerNiche.includes('imóveis') || lowerNiche.includes('construção')) return 1.5;
    if (lowerNiche.includes('alimentação') || lowerNiche.includes('restaurante')) return 1.1;
    
    return 1.0; // Padrão
  }

  private getValueMultiplier(value: number): number {
    if (value < 100) return 0.8;
    if (value < 500) return 1.0;
    if (value < 1000) return 1.1;
    if (value < 5000) return 1.2;
    return 1.4;
  }

  private getAudienceMultiplier(audience: BenchmarkData['targetAudience']): number {
    let multiplier = 1.0;
    
    // Ajuste por idade
    if (audience.ageRange.includes('18-25')) multiplier *= 0.9;
    if (audience.ageRange.includes('45-') || audience.ageRange.includes('55-')) multiplier *= 1.1;
    
    // Ajuste por localização
    if (audience.location.toLowerCase().includes('são paulo') || 
        audience.location.toLowerCase().includes('rio de janeiro')) {
      multiplier *= 1.3;
    }
    
    return multiplier;
  }

  private getSalesProcessMultiplier(salesProcess: BenchmarkData['salesProcess']): number {
    let multiplier = 1.0;
    
    switch (salesProcess.salesMethod) {
      case 'consultation':
        multiplier *= 1.4; // Consultorias têm taxa maior
        break;
      case 'demo':
        multiplier *= 1.2; // Demos são eficazes
        break;
      case 'trial':
        multiplier *= 1.1; // Trials convertem bem
        break;
      case 'direct':
        multiplier *= 0.9; // Vendas diretas têm taxa menor
        break;
    }

    // Ajuste por tempo de venda
    if (salesProcess.avgSalesTime.includes('imediato') || salesProcess.avgSalesTime.includes('1 dia')) {
      multiplier *= 1.2;
    } else if (salesProcess.avgSalesTime.includes('semana')) {
      multiplier *= 1.0;
    } else if (salesProcess.avgSalesTime.includes('mês')) {
      multiplier *= 0.8;
    }

    return multiplier;
  }

  private getLeadQualityMultiplier(quality: BenchmarkData['leadQuality']): number {
    switch (quality) {
      case 'high': return 1.3;
      case 'medium': return 1.0;
      case 'low': return 0.7;
      default: return 1.0;
    }
  }

  private getCompetitionMultiplier(competition: BenchmarkData['competitionLevel']): number {
    switch (competition) {
      case 'high': return 1.4; // Alta competição = CPM/CPC mais altos
      case 'medium': return 1.0;
      case 'low': return 0.8; // Baixa competição = custos menores
      default: return 1.0;
    }
  }



  private parseAIResponse(response: string): BenchmarkResults {
    try {
      // Limpar response case tenha caracteres extras
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON não encontrado na resposta');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validar se todos os campos obrigatórios estão presentes
      const requiredFields = ['cpm', 'cpc', 'ctr', 'txMensagens', 'txAgendamento', 'txConversaoVendas', 'confidence', 'insights'];
      
      for (const field of requiredFields) {
        if (!(field in parsed)) {
          throw new Error(`Campo obrigatório '${field}' não encontrado na resposta`);
        }
      }

      return {
        cpm: Number(parsed.cpm),
        cpc: Number(parsed.cpc),
        ctr: Number(parsed.ctr),
        txMensagens: Number(parsed.txMensagens),
        txAgendamento: Number(parsed.txAgendamento),
        txConversaoVendas: Number(parsed.txConversaoVendas),
        confidence: Number(parsed.confidence),
        insights: Array.isArray(parsed.insights) ? parsed.insights : []
      };
    } catch (error) {
      console.error('Erro ao fazer parse da resposta da IA:', error);
      
      // Retorna valores padrão em caso de erro
      return {
        cpm: 20.0,
        cpc: 1.50,
        ctr: 1.0,
        txMensagens: 15.0,
        txAgendamento: 25.0,
        txConversaoVendas: 10.0,
        confidence: 50,
        insights: [
          'Não foi possível gerar insights específicos',
          'Considere refinar as informações do produto',
          'Tente novamente para obter dados mais precisos',
          'Valores padrão aplicados para demonstração'
        ]
      };
    }
  }

  // 🚀 NOVO: Buscar dados históricos reais do Meta Ads
  private async getHistoricalData(selectedProduct: string, selectedCampaign?: string) {
    try {
      // Importar serviços dinamicamente para evitar dependência circular
      const { metricsService } = await import('./metricsService');
      const { metaAdsService } = await import('./metaAdsService');

      // Verificar se Meta Ads está conectado
      if (!metaAdsService.isConnected()) {
        return null;
      }

      // Buscar métricas dos últimos 3 meses para o produto
      const now = new Date();
      const months = [];
      for (let i = 0; i < 3; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        months.push(monthName);
      }

      let allMetrics = [];
      for (const month of months) {
        try {
          const metrics = await metricsService.getMetrics(month, 'Todos os Clientes', selectedProduct);
          allMetrics.push(...metrics);
        } catch (error) {
          console.warn(`Erro ao buscar métricas para ${month}:`, error);
        }
      }

      if (allMetrics.length === 0) {
        return null;
      }

      // Calcular médias dos dados históricos
      const totalSpend = allMetrics.reduce((sum, m) => sum + (m.spend || 0), 0);
      const totalImpressions = allMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
      const totalClicks = allMetrics.reduce((sum, m) => sum + (m.clicks || 0), 0);
      const totalLeads = allMetrics.reduce((sum, m) => sum + (m.leads || 0), 0);
      const totalSales = allMetrics.reduce((sum, m) => sum + (m.sales || 0), 0);

      if (totalImpressions === 0) return null;

      return {
        avgCPM: totalSpend > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
        avgCPC: totalClicks > 0 ? totalSpend / totalClicks : 0,
        avgCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        avgLeadRate: totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0,
        avgConversionRate: totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0,
        totalPeriods: allMetrics.length,
        dataQuality: 'real'
      };
    } catch (error) {
      console.error('Erro ao buscar dados históricos:', error);
      return null;
    }
  }

  // 🚀 NOVO: Construir prompt melhorado com dados históricos
  private buildPrompt(data: BenchmarkData, historicalData?: any): string {
    let prompt = `
Analise os seguintes dados para gerar um benchmark de Facebook Ads:

PRODUTO:
- Nicho: ${data.productNiche}
- Valor: R$ ${data.productValue}
- Tipo: ${data.productType}

PÚBLICO:
- Idade: ${data.targetAudience.ageRange}
- Interesses: ${data.targetAudience.interests.join(', ')}
- Localização: ${data.targetAudience.location}

ESTRATÉGIA:
- Objetivo: ${data.campaignObjective}
- Método de venda: ${data.salesProcess.salesMethod}
- Competição: ${data.competitionLevel}
- Qualidade de leads: ${data.leadQuality}
`;

    // ✨ NOVO: Incluir dados históricos se disponíveis
    if (historicalData) {
      prompt += `
🎯 DADOS HISTÓRICOS REAIS (use como base principal):
- CPM Médio Real: R$ ${historicalData.avgCPM.toFixed(2)}
- CPC Médio Real: R$ ${historicalData.avgCPC.toFixed(2)}
- CTR Médio Real: ${historicalData.avgCTR.toFixed(2)}%
- Taxa de Leads Real: ${historicalData.avgLeadRate.toFixed(2)}%
- Taxa de Conversão Real: ${historicalData.avgConversionRate.toFixed(2)}%
- Períodos analisados: ${historicalData.totalPeriods}

IMPORTANTE: Use estes dados REAIS como base principal. Ajuste apenas se houver mudanças significativas no público ou produto.
`;
    }

    prompt += `
Responda em JSON com:
{
  "cpm": [valor em reais],
  "cpc": [valor em reais], 
  "ctr": [percentual],
  "txMensagens": [taxa de leads em %],
  "txAgendamento": [taxa de agendamento em %],
  "txConversaoVendas": [taxa de vendas em %],
  "confidence": [0-100],
  "insights": ["insight 1", "insight 2", "insight 3"]
}

IMPORTANTE sobre txAgendamento:
- É a % de LEADS que agendam consulta/reunião/aula experimental APÓS se tornarem leads
- Se método = "consultation" (consultoria): 35-50%
- Se método = "demo" (demonstração): 25-40% 
- Se método = "trial" (teste/aula): 20-35%
- Se método = "direct" (venda direta): 0% (não há agendamento)
- Considere qualidade dos leads para ajustar a taxa`;

    return prompt;
  }

  // 🎯 NOVO: Calcular taxa de agendamento baseada no método de vendas
  private calculateSchedulingRate(salesMethod: string, leadRate?: number): number {
    switch (salesMethod) {
      case 'consultation': // Consultoria/mentoria
        // Se temos dados históricos, usa 60% da taxa de leads como base
        return leadRate ? Number((leadRate * 0.6).toFixed(2)) : 42; // 35-50% padrão
      case 'demo': // Demonstração/apresentação  
        return leadRate ? Number((leadRate * 0.5).toFixed(2)) : 32; // 25-40% padrão
      case 'trial': // Teste grátis/aula experimental
        return leadRate ? Number((leadRate * 0.4).toFixed(2)) : 28; // 20-35% padrão
      case 'direct': // Venda direta
      default:
        return 0; // Não tem agendamento
    }
  }

  // 🎯 NOVO: Obter nome legível do método de vendas  
  private getSalesMethodName(salesMethod: string): string {
    switch (salesMethod) {
      case 'consultation': return 'vendas consultivas';
      case 'demo': return 'vendas com demonstração';
      case 'trial': return 'vendas com teste/aula experimental';
      case 'direct': return 'vendas diretas';
      default: return 'vendas diretas';
    }
  }

  // 🎯 NOVO: Obter ação de agendamento específica
  private getSchedulingAction(salesMethod: string): string {
    switch (salesMethod) {
      case 'consultation': return 'consultorias/reuniões';
      case 'demo': return 'demonstrações';
      case 'trial': return 'aulas experimentais/testes';
      default: return 'reuniões';
    }
  }

  // Método para validar se a API key está configurada
  static validateConfiguration(): boolean {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    return !!apiKey && apiKey.trim() !== '';
  }
}

export const aiBenchmarkService = new AIBenchmarkService();