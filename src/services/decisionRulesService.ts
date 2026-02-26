/**
 * DecisionRulesService - Regras de Decisão Automática do Método Áurea
 * 
 * Este serviço implementa as regras de decisão baseadas no Método Áurea:
 * - Lei da Tiririca: pausar quando gasto ≥ 3x CPA alvo sem conversão
 * - Lei da Bonança: escalar quando CPA está significativamente abaixo da meta
 * - Discrepância: alertar quando há diferença entre conversões da plataforma e reais
 * - Benchmarks: classificar gargalos (CTR, Connect Rate, Conversão)
 */

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';
export type AlertAction = 'pause' | 'scale_vertical' | 'scale_horizontal' | 'dolly' | 'new_creative' | 'check_tracking' | 'adjust_pacing' | 'none';
export type CampaignIntention = 'ACQ' | 'RMD';
export type GargaloType = 'criativo' | 'pagina' | 'followup' | 'none';

export interface DecisionAlert {
    id: string;
    rule: 'tiririca' | 'bonanza' | 'discrepancy' | 'benchmark' | 'pacing';
    severity: AlertSeverity;
    title: string;
    message: string;
    action: AlertAction;
    actionLabel: string;
    metadata?: Record<string, any>;
    timestamp: Date;
}

export interface TiriricaInput {
    spend: number;          // Gasto atual
    cpaTarget: number;      // CPA alvo
    conversions: number;    // Conversões realizadas
    adSetName?: string;     // Nome do conjunto para exibição
    adSetId?: string;       // ID do conjunto
}

export interface BonanzaInput {
    cpa: number;            // CPA atual
    cpaTarget: number;      // CPA alvo
    threshold?: number;     // Percentual abaixo da meta (default: 30%)
    adSetName?: string;
    adSetId?: string;
}

export interface DiscrepancyInput {
    platformConversions: number;  // Conversões reportadas pela plataforma
    realConversions: number;      // Conversões reais (input manual)
    threshold?: number;           // Percentual de diferença aceitável (default: 10%)
    productName?: string;
}

export interface BenchmarkInput {
    ctr: number;                  // Click-through rate (%)
    connectRate?: number;         // Taxa de mensagens/conexão (%)
    pageConversion?: number;      // Taxa de conversão da página (%)
    ctrBenchmark?: number;        // Benchmark CTR (default: 1%)
    connectBenchmark?: number;    // Benchmark Connect Rate (default: 40%)
    conversionBenchmark?: number; // Benchmark Conversão (default: 10%)
    adName?: string;
    adSetName?: string;
}

export interface PacingInput {
    monthlyBudget: number;        // Orçamento mensal planejado
    currentSpend: number;         // Gasto atual
    dayOfMonth: number;           // Dia atual do mês
    totalDaysInMonth: number;     // Total de dias no mês
    intention: CampaignIntention; // ACQ ou RMD
}

export interface PacingResult {
    percentSpent: number;         // % do orçamento gasto
    percentMonth: number;         // % do mês transcorrido
    status: 'excellent' | 'good' | 'warning' | 'critical';
    difference: number;           // Diferença (pode ser positiva ou negativa)
    dailyBudget: number;          // Orçamento diário ideal
    remainingDailyBudget: number; // Orçamento diário restante ideal
    alert?: DecisionAlert;
}

// ============================================================================
// REGRAS DE DECISÃO
// ============================================================================

/**
 * Lei da Tiririca
 * Se gastou >= 3x o CPA alvo sem conversão, sugerir pausar.
 * 
 * @example
 * tiriricaRule({ spend: 180, cpaTarget: 50, conversions: 0 })
 * // Retorna alerta crítico: gastou 3.6x o CPA sem conversão
 */
export function tiriricaRule(input: TiriricaInput): DecisionAlert | null {
    const { spend, cpaTarget, conversions, adSetName, adSetId } = input;

    // Validações
    if (cpaTarget <= 0 || spend <= 0) return null;

    // Só aplica quando não há conversões
    if (conversions > 0) return null;

    const multiplier = spend / cpaTarget;

    // Gatilho: gastou >= 3x o CPA alvo
    if (multiplier >= 3) {
        return {
            id: `tiririca-${adSetId || Date.now()}`,
            rule: 'tiririca',
            severity: 'critical',
            title: '🚨 Lei da Tiririca',
            message: adSetName
                ? `[${adSetName}] gastou ${multiplier.toFixed(1)}x o CPA alvo (R$${spend.toFixed(2)}) sem conversões.`
                : `Conjunto gastou ${multiplier.toFixed(1)}x o CPA alvo sem conversões.`,
            action: 'pause',
            actionLabel: 'Pausar Conjunto',
            metadata: { spend, cpaTarget, multiplier, adSetId },
            timestamp: new Date()
        };
    }

    return null;
}

/**
 * Lei da Bonança
 * Se CPA está significativamente abaixo da meta, sugerir escalar agressivamente.
 * 
 * @example
 * bonanzaRule({ cpa: 35, cpaTarget: 50, threshold: 30 })
 * // Retorna alerta success: CPA 30% abaixo da meta → escalar
 */
export function bonanzaRule(input: BonanzaInput): DecisionAlert | null {
    const { cpa, cpaTarget, threshold = 30, adSetName, adSetId } = input;

    // Validações
    if (cpaTarget <= 0 || cpa <= 0) return null;

    const percentBelow = ((cpaTarget - cpa) / cpaTarget) * 100;

    // Gatilho: CPA está X% abaixo da meta
    if (percentBelow >= threshold) {
        return {
            id: `bonanza-${adSetId || Date.now()}`,
            rule: 'bonanza',
            severity: 'success',
            title: '🎯 Lei da Bonança',
            message: adSetName
                ? `[${adSetName}] CPA ${percentBelow.toFixed(0)}% abaixo da meta (R$${cpa.toFixed(2)} vs R$${cpaTarget.toFixed(2)}).`
                : `CPA ${percentBelow.toFixed(0)}% abaixo da meta. Escalar agressivamente!`,
            action: 'scale_vertical',
            actionLabel: 'Escalar Orçamento',
            metadata: { cpa, cpaTarget, percentBelow, adSetId },
            timestamp: new Date()
        };
    }

    return null;
}

/**
 * Regra de Discrepância
 * Alerta quando há diferença significativa entre conversões da plataforma e conversões reais.
 * 
 * @example
 * discrepancyRule({ platformConversions: 50, realConversions: 30, threshold: 10 })
 * // Retorna alerta warning: diferença de 40% → verificar tracking
 */
export function discrepancyRule(input: DiscrepancyInput): DecisionAlert | null {
    const { platformConversions, realConversions, threshold = 10, productName } = input;

    // Validações - precisa de pelo menos um valor > 0
    if (platformConversions <= 0 && realConversions <= 0) return null;

    // Calcula diferença percentual
    const maxVal = Math.max(platformConversions, realConversions);
    const difference = Math.abs(platformConversions - realConversions);
    const percentDiff = (difference / maxVal) * 100;

    // Gatilho: diferença > threshold%
    if (percentDiff > threshold) {
        const direction = platformConversions > realConversions
            ? 'Plataforma reporta mais que o real'
            : 'Real maior que a plataforma';

        return {
            id: `discrepancy-${productName || Date.now()}`,
            rule: 'discrepancy',
            severity: 'warning',
            title: '⚠️ Discrepância de Conversões',
            message: productName
                ? `[${productName}] Diferença de ${percentDiff.toFixed(0)}% entre conversões. ${direction}.`
                : `Diferença de ${percentDiff.toFixed(0)}% entre conversões da plataforma (${platformConversions}) e reais (${realConversions}).`,
            action: 'check_tracking',
            actionLabel: 'Verificar Pixel/Tracking',
            metadata: { platformConversions, realConversions, percentDiff, direction },
            timestamp: new Date()
        };
    }

    return null;
}

/**
 * Regra de Benchmarks (Diagnóstico de Gargalos)
 * Classifica onde está o problema no funil: criativo, página ou follow-up.
 * 
 * @example
 * benchmarkRule({ ctr: 0.5, connectRate: 60, pageConversion: 15 })
 * // Retorna alerta warning: CTR baixo → gargalo no criativo
 */
export function benchmarkRule(input: BenchmarkInput): DecisionAlert | null {
    const {
        ctr,
        connectRate,
        pageConversion,
        ctrBenchmark = 1,
        connectBenchmark = 40,
        conversionBenchmark = 10,
        adName,
        adSetName
    } = input;

    // Identifica o gargalo mais crítico (em ordem de funil)
    let gargalo: GargaloType = 'none';
    let message = '';
    let action: AlertAction = 'none';
    let actionLabel = '';

    // 1. Verifica CTR (topo do funil)
    if (ctr < ctrBenchmark) {
        gargalo = 'criativo';
        message = `CTR em ${ctr.toFixed(2)}% (benchmark: ${ctrBenchmark}%). Problema no criativo/copy.`;
        action = 'new_creative';
        actionLabel = 'Trocar Criativo';
    }
    // 2. Verifica Connect Rate (meio do funil)
    else if (connectRate !== undefined && connectRate < connectBenchmark) {
        gargalo = 'pagina';
        message = `Taxa de mensagens em ${connectRate.toFixed(1)}% (benchmark: ${connectBenchmark}%). Problema na página/LP.`;
        action = 'none'; // Requer análise manual
        actionLabel = 'Analisar Página';
    }
    // 3. Verifica Conversão (fundo do funil)
    else if (pageConversion !== undefined && pageConversion < conversionBenchmark) {
        gargalo = 'followup';
        message = `Conversão em ${pageConversion.toFixed(1)}% (benchmark: ${conversionBenchmark}%). Problema no follow-up/vendas.`;
        action = 'none'; // Requer análise manual
        actionLabel = 'Otimizar Follow-up';
    }

    if (gargalo === 'none') return null;

    const context = adName || adSetName;

    return {
        id: `benchmark-${gargalo}-${Date.now()}`,
        rule: 'benchmark',
        severity: gargalo === 'criativo' ? 'warning' : 'info',
        title: `🔍 Gargalo: ${gargalo.charAt(0).toUpperCase() + gargalo.slice(1)}`,
        message: context ? `[${context}] ${message}` : message,
        action,
        actionLabel,
        metadata: { gargalo, ctr, connectRate, pageConversion },
        timestamp: new Date()
    };
}

/**
 * Cálculo de Pacing
 * Verifica se o ritmo de gasto está alinhado com o planejamento do mês.
 * 
 * @example
 * calculatePacing({ monthlyBudget: 3000, currentSpend: 1000, dayOfMonth: 10, totalDaysInMonth: 30 })
 * // Status: 33% gasto vs 33% do mês → bom
 */
export function calculatePacing(input: PacingInput): PacingResult {
    const { monthlyBudget, currentSpend, dayOfMonth, totalDaysInMonth, intention } = input;

    // Cálculos básicos
    const percentMonth = (dayOfMonth / totalDaysInMonth) * 100;
    const percentSpent = monthlyBudget > 0 ? (currentSpend / monthlyBudget) * 100 : 0;
    const difference = percentSpent - percentMonth;
    const dailyBudget = monthlyBudget / totalDaysInMonth;
    const remainingDays = totalDaysInMonth - dayOfMonth;
    const remainingBudget = monthlyBudget - currentSpend;
    const remainingDailyBudget = remainingDays > 0 ? remainingBudget / remainingDays : 0;

    // Define status com base na diferença
    // Para ACQ: queremos gastar de forma equilibrada
    // Para RMD: pode ser mais flexível com frequência
    let status: PacingResult['status'];
    let alert: DecisionAlert | undefined;

    const absD = Math.abs(difference);

    if (absD <= 5) {
        status = 'excellent';
    } else if (absD <= 10) {
        status = 'good';
    } else if (absD <= 20) {
        status = 'warning';
        alert = {
            id: `pacing-${Date.now()}`,
            rule: 'pacing',
            severity: 'warning',
            title: '⏱️ Pacing Desalinhado',
            message: difference > 0
                ? `Gasto ${absD.toFixed(0)}% acima do ritmo ideal. Considere reduzir.`
                : `Gasto ${absD.toFixed(0)}% abaixo do ritmo ideal. Considere acelerar.`,
            action: 'adjust_pacing',
            actionLabel: difference > 0 ? 'Reduzir Ritmo' : 'Acelerar Gasto',
            metadata: { percentSpent, percentMonth, difference, intention },
            timestamp: new Date()
        };
    } else {
        status = 'critical';
        alert = {
            id: `pacing-${Date.now()}`,
            rule: 'pacing',
            severity: 'critical',
            title: '🚨 Pacing Crítico',
            message: difference > 0
                ? `Gasto ${absD.toFixed(0)}% acima do planejado! Orçamento pode acabar antes do fim do mês.`
                : `Gasto ${absD.toFixed(0)}% abaixo do planejado. Riscos de não investir o budget.`,
            action: 'adjust_pacing',
            actionLabel: difference > 0 ? 'Reduzir Urgente' : 'Acelerar Urgente',
            metadata: { percentSpent, percentMonth, difference, intention },
            timestamp: new Date()
        };
    }

    return {
        percentSpent,
        percentMonth,
        status,
        difference,
        dailyBudget,
        remainingDailyBudget,
        alert
    };
}

// ============================================================================
// FUNÇÕES DE AGREGAÇÃO
// ============================================================================

export interface AureaAnalysisInput {
    // Dados de custo/conversão
    adSets: Array<{
        id: string;
        name: string;
        spend: number;
        conversions: number;
        cpa?: number;
        ctr: number;
        connectRate?: number;
        pageConversion?: number;
    }>;

    // Configurações do usuário
    cpaTarget: number;
    monthlyBudget: number;
    currentSpend: number;
    dayOfMonth: number;
    totalDaysInMonth: number;
    intention: CampaignIntention;

    // Conversões reais (input manual)
    realConversions?: number;
    platformConversions?: number;
    productName?: string;
}

/**
 * Análise completa do Método Áurea
 * Executa todas as regras e retorna lista priorizada de alertas.
 */
export function runAureaAnalysis(input: AureaAnalysisInput): DecisionAlert[] {
    const alerts: DecisionAlert[] = [];

    const {
        adSets,
        cpaTarget,
        monthlyBudget,
        currentSpend,
        dayOfMonth,
        totalDaysInMonth,
        intention,
        realConversions,
        platformConversions,
        productName
    } = input;

    // 1. Verifica pacing
    const pacing = calculatePacing({
        monthlyBudget,
        currentSpend,
        dayOfMonth,
        totalDaysInMonth,
        intention
    });
    if (pacing.alert) {
        alerts.push(pacing.alert);
    }

    // 2. Verifica discrepância de conversões
    if (platformConversions !== undefined && realConversions !== undefined) {
        const discrepancy = discrepancyRule({
            platformConversions,
            realConversions,
            productName
        });
        if (discrepancy) {
            alerts.push(discrepancy);
        }
    }

    const tiriricaAlerts: DecisionAlert[] = [];
    const bonanzaAlerts: DecisionAlert[] = [];
    const benchmarkAlerts: DecisionAlert[] = [];

    // 3. Analisa cada conjunto de anúncios
    for (const adSet of adSets) {
        // Tiririca (gasto sem conversão)
        const tiririca = tiriricaRule({
            spend: adSet.spend,
            cpaTarget,
            conversions: adSet.conversions,
            adSetName: adSet.name,
            adSetId: adSet.id
        });
        if (tiririca) {
            tiriricaAlerts.push({ ...tiririca, metadata: { ...tiririca.metadata, adSetName: adSet.name } });
        }

        // Bonança (CPA abaixo da meta)
        if (adSet.cpa && adSet.cpa > 0) {
            const bonanza = bonanzaRule({
                cpa: adSet.cpa,
                cpaTarget,
                adSetName: adSet.name,
                adSetId: adSet.id
            });
            if (bonanza) {
                bonanzaAlerts.push({ ...bonanza, metadata: { ...bonanza.metadata, adSetName: adSet.name } });
            }
        }

        // Benchmarks (gargalos)
        const benchmark = benchmarkRule({
            ctr: adSet.ctr,
            connectRate: adSet.connectRate,
            pageConversion: adSet.pageConversion,
            adSetName: adSet.name
        });
        if (benchmark) {
            benchmarkAlerts.push({ ...benchmark, metadata: { ...benchmark.metadata, adSetName: adSet.name } });
        }
    }

    // Agregar Tiririca
    if (tiriricaAlerts.length > 0) {
        if (tiriricaAlerts.length === 1) {
            alerts.push(tiriricaAlerts[0]);
        } else {
            const adSetNames = tiriricaAlerts.map(a => a.metadata?.adSetName).filter(Boolean).join(', ');
            alerts.push({
                id: `tiririca-agg-${Date.now()}`,
                rule: 'tiririca',
                severity: 'critical',
                title: '🚨 Lei da Tiririca (Múltiplos)',
                message: `${tiriricaAlerts.length} conjuntos gastaram mais de 3x o CPA alvo sem conversões: ${adSetNames}.`,
                action: 'pause',
                actionLabel: 'Revisar Conjuntos',
                timestamp: new Date()
            });
        }
    }

    // Agregar Bonança
    if (bonanzaAlerts.length > 0) {
        if (bonanzaAlerts.length === 1) {
            alerts.push(bonanzaAlerts[0]);
        } else {
            const adSetNames = bonanzaAlerts.map(a => a.metadata?.adSetName).filter(Boolean).join(', ');
            alerts.push({
                id: `bonanza-agg-${Date.now()}`,
                rule: 'bonanza',
                severity: 'success',
                title: '🎯 Lei da Bonança (Múltiplos)',
                message: `${bonanzaAlerts.length} conjuntos com CPA abaixo da meta: ${adSetNames}. Escalar agressivamente!`,
                action: 'scale_vertical',
                actionLabel: 'Escalar Orçamentos',
                timestamp: new Date()
            });
        }
    }

    // Agregar Benchmarks
    if (benchmarkAlerts.length > 0) {
        if (benchmarkAlerts.length === 1) {
            alerts.push(benchmarkAlerts[0]);
        } else {
            // Conta por gargalo
            const gargalos = benchmarkAlerts.reduce((acc, a) => {
                const g = a.metadata?.gargalo as string;
                if (!acc[g]) acc[g] = [];
                acc[g].push(a.metadata?.adSetName);
                return acc;
            }, {} as Record<string, string[]>);

            Object.entries(gargalos).forEach(([gargalo, nomes]) => {
                const isCriativo = gargalo === 'criativo';
                alerts.push({
                    id: `bench-agg-${gargalo}-${Date.now()}`,
                    rule: 'benchmark',
                    severity: isCriativo ? 'warning' : 'info',
                    title: `🔍 Gargalo: ${gargalo.charAt(0).toUpperCase() + gargalo.slice(1)} (Múltiplos)`,
                    message: `${nomes.length} conjuntos com problema de ${gargalo}: ${nomes.filter(Boolean).join(', ')}.`,
                    action: isCriativo ? 'new_creative' : 'none',
                    actionLabel: isCriativo ? 'Trocar Criativos' : 'Analisar Funil',
                    timestamp: new Date()
                });
            });
        }
    }

    // 4. Ordenar por severidade (critical > warning > info > success)
    const severityOrder: Record<AlertSeverity, number> = {
        critical: 0,
        warning: 1,
        info: 2,
        success: 3
    };

    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // 5. Limitar a 6 alertas para não poluir a UI
    return alerts.slice(0, 6);
}

// ============================================================================
// EXPORTAÇÃO DO SERVIÇO
// ============================================================================

export const decisionRulesService = {
    tiriricaRule,
    bonanzaRule,
    discrepancyRule,
    benchmarkRule,
    calculatePacing,
    runAureaAnalysis
};

export default decisionRulesService;
