/**
 * Testes Unitários - DecisionRulesService
 * 
 * Cobertura das regras do Método Áurea:
 * - tiriricaRule: pausar quando gasto >= 3x CPA sem conversão
 * - bonanzaRule: escalar quando CPA abaixo da meta
 * - discrepancyRule: alertar diferença entre conversões
 * - benchmarkRule: identificar gargalos no funil
 * - calculatePacing: verificar ritmo de gasto
 * - runAureaAnalysis: análise completa
 */

import { describe, it, expect } from 'vitest';
import {
    tiriricaRule,
    bonanzaRule,
    discrepancyRule,
    benchmarkRule,
    calculatePacing,
    runAureaAnalysis,
    type TiriricaInput,
    type BonanzaInput,
    type DiscrepancyInput,
    type BenchmarkInput,
    type PacingInput,
    type AureaAnalysisInput
} from '../decisionRulesService';

// ============================================================================
// TESTES - LEI DA TIRIRICA
// ============================================================================

describe('tiriricaRule', () => {
    it('deve retornar alerta crítico quando gasto >= 3x CPA sem conversão', () => {
        const input: TiriricaInput = {
            spend: 180,
            cpaTarget: 50,
            conversions: 0,
            adSetName: 'Público Teste'
        };

        const result = tiriricaRule(input);

        expect(result).not.toBeNull();
        expect(result?.rule).toBe('tiririca');
        expect(result?.severity).toBe('critical');
        expect(result?.action).toBe('pause');
        expect(result?.message).toContain('3.6x');
    });

    it('deve retornar null quando há conversões', () => {
        const input: TiriricaInput = {
            spend: 180,
            cpaTarget: 50,
            conversions: 3
        };

        const result = tiriricaRule(input);

        expect(result).toBeNull();
    });

    it('deve retornar null quando gasto < 3x CPA', () => {
        const input: TiriricaInput = {
            spend: 100,
            cpaTarget: 50,
            conversions: 0
        };

        const result = tiriricaRule(input);

        expect(result).toBeNull();
    });

    it('deve retornar null para valores inválidos', () => {
        expect(tiriricaRule({ spend: 0, cpaTarget: 50, conversions: 0 })).toBeNull();
        expect(tiriricaRule({ spend: 100, cpaTarget: 0, conversions: 0 })).toBeNull();
        expect(tiriricaRule({ spend: -50, cpaTarget: 50, conversions: 0 })).toBeNull();
    });

    it('deve retornar alerta exatamente no limite de 3x', () => {
        const input: TiriricaInput = {
            spend: 150,
            cpaTarget: 50,
            conversions: 0
        };

        const result = tiriricaRule(input);

        expect(result).not.toBeNull();
        expect(result?.message).toContain('3.0x');
    });
});

// ============================================================================
// TESTES - LEI DA BONANÇA
// ============================================================================

describe('bonanzaRule', () => {
    it('deve retornar alerta success quando CPA >= 30% abaixo da meta', () => {
        const input: BonanzaInput = {
            cpa: 35,
            cpaTarget: 50,
            adSetName: 'Público Campeão'
        };

        const result = bonanzaRule(input);

        expect(result).not.toBeNull();
        expect(result?.rule).toBe('bonanza');
        expect(result?.severity).toBe('success');
        expect(result?.action).toBe('scale_vertical');
        expect(result?.message).toContain('30%');
    });

    it('deve retornar null quando CPA está próximo da meta', () => {
        const input: BonanzaInput = {
            cpa: 45,
            cpaTarget: 50
        };

        const result = bonanzaRule(input);

        expect(result).toBeNull();
    });

    it('deve respeitar threshold customizado', () => {
        const input: BonanzaInput = {
            cpa: 40,
            cpaTarget: 50,
            threshold: 20
        };

        const result = bonanzaRule(input);

        expect(result).not.toBeNull();
    });

    it('deve retornar null quando CPA acima da meta', () => {
        const input: BonanzaInput = {
            cpa: 70,
            cpaTarget: 50
        };

        const result = bonanzaRule(input);

        expect(result).toBeNull();
    });

    it('deve retornar null para valores inválidos', () => {
        expect(bonanzaRule({ cpa: 0, cpaTarget: 50 })).toBeNull();
        expect(bonanzaRule({ cpa: 35, cpaTarget: 0 })).toBeNull();
    });
});

// ============================================================================
// TESTES - REGRA DE DISCREPÂNCIA
// ============================================================================

describe('discrepancyRule', () => {
    it('deve retornar alerta quando diferença > 10%', () => {
        const input: DiscrepancyInput = {
            platformConversions: 50,
            realConversions: 30,
            productName: 'Produto X'
        };

        const result = discrepancyRule(input);

        expect(result).not.toBeNull();
        expect(result?.rule).toBe('discrepancy');
        expect(result?.severity).toBe('warning');
        expect(result?.action).toBe('check_tracking');
        expect(result?.message).toContain('40%');
    });

    it('deve retornar null quando diferença <= 10%', () => {
        const input: DiscrepancyInput = {
            platformConversions: 100,
            realConversions: 95
        };

        const result = discrepancyRule(input);

        expect(result).toBeNull();
    });

    it('deve respeitar threshold customizado', () => {
        const input: DiscrepancyInput = {
            platformConversions: 100,
            realConversions: 80,
            threshold: 25
        };

        const result = discrepancyRule(input);

        expect(result).toBeNull();
    });

    it('deve funcionar quando real > plataforma', () => {
        const input: DiscrepancyInput = {
            platformConversions: 30,
            realConversions: 50
        };

        const result = discrepancyRule(input);

        expect(result).not.toBeNull();
        expect(result?.metadata?.direction).toBe('Real maior que a plataforma');
    });

    it('deve retornar null para valores zerados', () => {
        expect(discrepancyRule({ platformConversions: 0, realConversions: 0 })).toBeNull();
    });
});

// ============================================================================
// TESTES - REGRA DE BENCHMARKS
// ============================================================================

describe('benchmarkRule', () => {
    it('deve identificar gargalo de criativo quando CTR < 1%', () => {
        const input: BenchmarkInput = {
            ctr: 0.5,
            connectRate: 50,
            pageConversion: 15
        };

        const result = benchmarkRule(input);

        expect(result).not.toBeNull();
        expect(result?.rule).toBe('benchmark');
        expect(result?.metadata?.gargalo).toBe('criativo');
        expect(result?.action).toBe('new_creative');
    });

    it('deve identificar gargalo de página quando Connect Rate < 40%', () => {
        const input: BenchmarkInput = {
            ctr: 2.0,
            connectRate: 25,
            pageConversion: 15
        };

        const result = benchmarkRule(input);

        expect(result).not.toBeNull();
        expect(result?.metadata?.gargalo).toBe('pagina');
    });

    it('deve identificar gargalo de follow-up quando Conversão < 10%', () => {
        const input: BenchmarkInput = {
            ctr: 2.0,
            connectRate: 50,
            pageConversion: 5
        };

        const result = benchmarkRule(input);

        expect(result).not.toBeNull();
        expect(result?.metadata?.gargalo).toBe('followup');
    });

    it('deve retornar null quando todos benchmarks OK', () => {
        const input: BenchmarkInput = {
            ctr: 2.0,
            connectRate: 50,
            pageConversion: 15
        };

        const result = benchmarkRule(input);

        expect(result).toBeNull();
    });

    it('deve priorizar gargalo de criativo sobre outros', () => {
        const input: BenchmarkInput = {
            ctr: 0.5,
            connectRate: 25, // Também baixo
            pageConversion: 5 // Também baixo
        };

        const result = benchmarkRule(input);

        expect(result?.metadata?.gargalo).toBe('criativo');
    });

    it('deve respeitar benchmarks customizados', () => {
        const input: BenchmarkInput = {
            ctr: 0.8,
            ctrBenchmark: 0.5 // Benchmark menor
        };

        const result = benchmarkRule(input);

        expect(result).toBeNull();
    });
});

// ============================================================================
// TESTES - CÁLCULO DE PACING
// ============================================================================

describe('calculatePacing', () => {
    it('deve retornar status excellent quando pacing perfeito', () => {
        const input: PacingInput = {
            monthlyBudget: 3000,
            currentSpend: 1000,
            dayOfMonth: 10,
            totalDaysInMonth: 30,
            intention: 'ACQ'
        };

        const result = calculatePacing(input);

        expect(result.status).toBe('excellent');
        expect(result.percentSpent).toBeCloseTo(33.33);
        expect(result.percentMonth).toBeCloseTo(33.33);
        expect(result.alert).toBeUndefined();
    });

    it('deve retornar status warning quando desvio entre 10-20%', () => {
        const input: PacingInput = {
            monthlyBudget: 3000,
            currentSpend: 1500, // 50% gasto
            dayOfMonth: 10,     // 33% do mês
            totalDaysInMonth: 30,
            intention: 'ACQ'
        };

        const result = calculatePacing(input);

        expect(result.status).toBe('warning');
        expect(result.alert).not.toBeUndefined();
        expect(result.alert?.severity).toBe('warning');
    });

    it('deve retornar status critical quando desvio > 20%', () => {
        const input: PacingInput = {
            monthlyBudget: 3000,
            currentSpend: 2500, // 83% gasto
            dayOfMonth: 10,     // 33% do mês
            totalDaysInMonth: 30,
            intention: 'ACQ'
        };

        const result = calculatePacing(input);

        expect(result.status).toBe('critical');
        expect(result.alert?.severity).toBe('critical');
        expect(result.alert?.message).toContain('acima');
    });

    it('deve calcular orçamento diário corretamente', () => {
        const input: PacingInput = {
            monthlyBudget: 3000,
            currentSpend: 1000,
            dayOfMonth: 10,
            totalDaysInMonth: 30,
            intention: 'ACQ'
        };

        const result = calculatePacing(input);

        expect(result.dailyBudget).toBe(100);
        expect(result.remainingDailyBudget).toBe(100); // (3000-1000)/20 = 100
    });

    it('deve lidar com orçamento zerado', () => {
        const input: PacingInput = {
            monthlyBudget: 0,
            currentSpend: 0,
            dayOfMonth: 10,
            totalDaysInMonth: 30,
            intention: 'ACQ'
        };

        const result = calculatePacing(input);

        expect(result.percentSpent).toBe(0);
    });
});

// ============================================================================
// TESTES - ANÁLISE COMPLETA ÁUREA
// ============================================================================

describe('runAureaAnalysis', () => {
    it('deve retornar alertas ordenados por severidade', () => {
        const input: AureaAnalysisInput = {
            adSets: [
                { id: '1', name: 'Set A', spend: 180, conversions: 0, ctr: 0.5 },
                { id: '2', name: 'Set B', spend: 100, conversions: 5, cpa: 20, ctr: 2.0 }
            ],
            cpaTarget: 50,
            monthlyBudget: 3000,
            currentSpend: 280,
            dayOfMonth: 10,
            totalDaysInMonth: 30,
            intention: 'ACQ'
        };

        const alerts = runAureaAnalysis(input);

        expect(alerts.length).toBeGreaterThan(0);
        // Verifica ordenação (critical < warning < info < success)
        for (let i = 0; i < alerts.length - 1; i++) {
            const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 };
            expect(severityOrder[alerts[i].severity]).toBeLessThanOrEqual(
                severityOrder[alerts[i + 1].severity]
            );
        }
    });

    it('deve limitar a 6 alertas', () => {
        const input: AureaAnalysisInput = {
            adSets: Array(10).fill(null).map((_, i) => ({
                id: String(i),
                name: `Set ${i}`,
                spend: 200,
                conversions: 0,
                ctr: 0.3
            })),
            cpaTarget: 50,
            monthlyBudget: 3000,
            currentSpend: 2000,
            dayOfMonth: 5,
            totalDaysInMonth: 30,
            intention: 'ACQ'
        };

        const alerts = runAureaAnalysis(input);

        expect(alerts.length).toBeLessThanOrEqual(6);
    });

    it('deve incluir alerta de discrepância quando dados informados', () => {
        const input: AureaAnalysisInput = {
            adSets: [],
            cpaTarget: 50,
            monthlyBudget: 3000,
            currentSpend: 1000,
            dayOfMonth: 10,
            totalDaysInMonth: 30,
            intention: 'ACQ',
            platformConversions: 50,
            realConversions: 30,
            productName: 'Produto Teste'
        };

        const alerts = runAureaAnalysis(input);
        const discrepancyAlert = alerts.find(a => a.rule === 'discrepancy');

        expect(discrepancyAlert).not.toBeUndefined();
    });

    it('deve identificar conjunto para escalar (Bonança)', () => {
        const input: AureaAnalysisInput = {
            adSets: [
                { id: '1', name: 'Público Top', spend: 500, conversions: 20, cpa: 25, ctr: 2.5 }
            ],
            cpaTarget: 50,
            monthlyBudget: 3000,
            currentSpend: 500,
            dayOfMonth: 10,
            totalDaysInMonth: 30,
            intention: 'ACQ'
        };

        const alerts = runAureaAnalysis(input);
        const bonanzaAlert = alerts.find(a => a.rule === 'bonanza');

        expect(bonanzaAlert).not.toBeUndefined();
        expect(bonanzaAlert?.action).toBe('scale_vertical');
    });
});
