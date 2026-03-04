/**
 * AureaDecisionPanel - Painel de Decisão do Método Áurea
 * 
 * Camada A do Dashboard: Decisão Rápida (Above the Fold)
 * - Contexto (Cliente, Mês, Produto, Objetivo)
 * - Budget Plan e Pacing
 * - Placar ACQ vs RMD
 * - Alertas de Decisão (máx 6)
 * - Ações Recomendadas
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    Target,
    AlertTriangle,
    CheckCircle,
    Zap,
    Calendar,
    AlertCircle,
    Info,
    Edit2,
    Check
} from 'lucide-react';
import {
    decisionRulesService,
    type DecisionAlert,
    type CampaignIntention
} from '../services/decisionRulesService';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface AureaDecisionPanelProps {
    // Contexto
    selectedClient: string;
    selectedMonth: string;
    selectedProduct?: string;

    // Configurações do usuário (editáveis)
    cpaTarget?: number;
    alertCpaTarget?: number; // Target coming strictly from spreadsheet for alert calculation
    monthlyBudget?: number;
    acqRmdSplit?: { acq: number; rmd: number }; // Ex: { acq: 80, rmd: 20 }

    // Dados de métricas (do Meta Ads)
    currentSpend?: number;
    conversions?: number;
    platformConversions?: number;
    realConversions?: number;

    // Dados de conjuntos de anúncios
    adSets?: Array<{
        id: string;
        name: string;
        spend: number;
        conversions: number;
        cpa?: number;
        ctr: number;
        connectRate?: number;
        pageConversion?: number;
        intention?: CampaignIntention;
        reach?: number;
        frequency?: number;
    }>;

    // Callbacks
    onSettingsChange?: (settings: AureaSettings) => void;
    onActionClick?: (action: string, alertId: string) => void;
}

export interface AureaSettings {
    cpaTarget: number;
    monthlyBudget: number;
    acqRmdSplit: { acq: number; rmd: number };
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const StatusBadge: React.FC<{ status: 'excellent' | 'good' | 'warning' | 'critical' }> = ({ status }) => {
    const config = {
        excellent: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Excelente' },
        good: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Bom' },
        warning: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Atenção' },
        critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'Crítico' }
    };

    const c = config[status];

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}>
            {c.label}
        </span>
    );
};

const AlertCard: React.FC<{
    alert: DecisionAlert;
}> = ({ alert }) => {
    const severityConfig = {
        critical: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
        warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
        info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }
    };

    const config = severityConfig[alert.severity];
    const Icon = config.icon;

    return (
        <div className="relative overflow-hidden p-4 rounded-xl bg-slate-800/20 border border-slate-700/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.bg} ${config.border} border-r`}></div>
            <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0 pl-1">
                <div className={`w-8 h-8 rounded-full flex flex-shrink-0 items-center justify-center ${config.bg}`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="flex flex-col">
                    <span className="font-medium text-slate-200 text-[15px] tracking-wide">{alert.title}</span>
                    <span className="text-slate-400/90 text-sm mt-0.5 leading-relaxed">{alert.message}</span>
                </div>
            </div>
            {alert.action !== 'none' && (
                <div className="flex-shrink-0 self-start sm:self-center mt-2 sm:mt-0 pl-11 sm:pl-0 pointer-events-none">
                    <span className={`inline-flex items-center px-2.5 py-1.5 rounded-md ${config.bg} border ${config.border} ${config.color} text-xs font-semibold uppercase tracking-wider`}>
                        {alert.actionLabel}
                    </span>
                </div>
            )}
        </div>
    );
};

const PacingBar: React.FC<{
    percentSpent: number;
    status: 'good' | 'warning' | 'critical' | 'excellent';
    monthlyBudget?: number;
    totalDaysInMonth?: number;
}> = ({ percentSpent, status, monthlyBudget, totalDaysInMonth }) => {
    const statusColors = {
        excellent: 'bg-emerald-500',
        good: 'bg-blue-500',
        warning: 'bg-amber-500',
        critical: 'bg-red-500'
    };

    const dailyBudget = monthlyBudget && totalDaysInMonth ? monthlyBudget / totalDaysInMonth : 0;

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
                <span>Gasto: {percentSpent.toFixed(1)}%</span>
                {monthlyBudget !== undefined && (
                    <div className="flex flex-col items-end">
                        <span className="text-gray-400 font-medium">Orçamento: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyBudget)}</span>
                        {dailyBudget > 0 && (
                            <span className="text-slate-500 text-[11px] mt-0.5">Orçamento diário: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dailyBudget)}</span>
                        )}
                    </div>
                )}
            </div>
            <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
                {/* Barra do gasto (atual) */}
                <div
                    className={`absolute top-0 left-0 h-full ${statusColors[status]} transition-all duration-500`}
                    style={{ width: `${Math.min(percentSpent, 100)}%` }}
                />
            </div>
        </div>
    );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const AureaDecisionPanel: React.FC<AureaDecisionPanelProps> = ({
    selectedClient,
    selectedMonth,
    selectedProduct,
    cpaTarget: initialCpaTarget = 50,
    alertCpaTarget,
    monthlyBudget: initialMonthlyBudget = 3000,
    acqRmdSplit: initialSplit = { acq: 80, rmd: 20 },
    currentSpend = 0,
    platformConversions,
    realConversions,
    adSets = [],
    onSettingsChange
}) => {
    // Estados sincronizados das props (read-only, vindos da planilha)
    const cpaTarget = initialCpaTarget;
    const monthlyBudget = initialMonthlyBudget;
    const acqRmdSplit = initialSplit;

    const [isEditingCpa, setIsEditingCpa] = useState(false);
    const [isEditingBudget, setIsEditingBudget] = useState(false);
    const [localCpa, setLocalCpa] = useState(cpaTarget.toString());
    const [localBudget, setLocalBudget] = useState(monthlyBudget.toString());

    useEffect(() => {
        if (!isEditingCpa) setLocalCpa(initialCpaTarget.toString());
    }, [initialCpaTarget, isEditingCpa]);

    useEffect(() => {
        if (!isEditingBudget) setLocalBudget(initialMonthlyBudget.toString());
    }, [initialMonthlyBudget, isEditingBudget]);

    const handleSaveCpa = () => {
        setIsEditingCpa(false);
        const newCpa = parseFloat(localCpa) || 0;
        if (newCpa !== initialCpaTarget && onSettingsChange) {
            onSettingsChange({
                cpaTarget: newCpa,
                monthlyBudget: initialMonthlyBudget,
                acqRmdSplit: initialSplit
            });
        }
    };

    const handleSaveBudget = () => {
        setIsEditingBudget(false);
        const newBudget = parseFloat(localBudget) || 0;
        if (newBudget !== initialMonthlyBudget && onSettingsChange) {
            onSettingsChange({
                cpaTarget: initialCpaTarget,
                monthlyBudget: newBudget,
                acqRmdSplit: initialSplit
            });
        }
    };

    // Calcular dados do mês
    const monthData = useMemo(() => {
        const monthNames: Record<string, number> = {
            'Janeiro': 0, 'Fevereiro': 1, 'Março': 2, 'Abril': 3, 'Maio': 4, 'Junho': 5,
            'Julho': 6, 'Agosto': 7, 'Setembro': 8, 'Outubro': 9, 'Novembro': 10, 'Dezembro': 11
        };

        const parts = selectedMonth.split(' ');
        const monthName = parts[0];
        const year = parseInt(parts[1]) || new Date().getFullYear();
        const monthIndex = monthNames[monthName] ?? new Date().getMonth();

        const now = new Date();
        const isCurrentMonth = now.getMonth() === monthIndex && now.getFullYear() === year;
        const dayOfMonth = isCurrentMonth ? now.getDate() : new Date(year, monthIndex + 1, 0).getDate();
        const totalDaysInMonth = new Date(year, monthIndex + 1, 0).getDate();

        return { dayOfMonth, totalDaysInMonth, isCurrentMonth };
    }, [selectedMonth]);

    // Calcular pacing
    const pacing = useMemo(() => {
        return decisionRulesService.calculatePacing({
            monthlyBudget,
            currentSpend,
            dayOfMonth: monthData.dayOfMonth,
            totalDaysInMonth: monthData.totalDaysInMonth,
            intention: 'ACQ' // Default, será separado por tipo depois
        });
    }, [monthlyBudget, currentSpend, monthData]);

    // Executar análise Áurea
    const alerts = useMemo(() => {
        return decisionRulesService.runAureaAnalysis({
            adSets: adSets.map(a => ({
                ...a,
                ctr: a.ctr || 0
            })),
            cpaTarget: alertCpaTarget !== undefined ? alertCpaTarget : cpaTarget,
            monthlyBudget,
            currentSpend,
            dayOfMonth: monthData.dayOfMonth,
            totalDaysInMonth: monthData.totalDaysInMonth,
            intention: 'ACQ',
            platformConversions,
            realConversions,
            productName: selectedProduct
        });
    }, [adSets, cpaTarget, monthlyBudget, currentSpend, monthData, platformConversions, realConversions, selectedProduct]);


    // Formatar moeda
    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Se não tem cliente selecionado, não renderiza
    if (!selectedClient || selectedClient === 'Selecione um cliente') {
        return null;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Linha 1: Pacing & Metas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Bloco Pacing */}
                <div className="lg:col-span-5 bg-slate-800/20 rounded-xl p-5 border border-slate-700/30 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 group relative">
                            <Calendar className="w-4 h-4 text-blue-400" />
                            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-1 cursor-help">
                                Pacing do Mês
                                <Info className="w-3.5 h-3.5 text-gray-500" />
                            </h3>
                            <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-xs text-gray-400">
                                <p className="mb-2"><strong className="text-white">Gasto:</strong> Indica quantos % do orçamento total mensal você já gastou até agora.</p>
                                <p><strong className="text-white">Mês:</strong> Indica quantos % dos dias do mês já se passaram (Ritmo Ideal). Se o Gasto estiver muito acima do Mês, você está gastando rápido demais.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">
                                Dia {monthData.dayOfMonth}/{monthData.totalDaysInMonth}
                            </span>
                            <StatusBadge status={pacing.status} />
                        </div>
                    </div>

                    <PacingBar
                        percentSpent={pacing.percentSpent}
                        status={pacing.status}
                        monthlyBudget={monthlyBudget}
                        totalDaysInMonth={monthData.totalDaysInMonth}
                    />

                    <div className="mt-4 text-xs">
                        <div>
                            <span className="text-gray-500">Gasto Atual: </span>
                            <span className="text-white font-medium">{formatCurrency(currentSpend)}</span>
                        </div>
                    </div>
                </div>

                {/* Bloco Metas */}
                <div className="lg:col-span-7 bg-slate-800/20 rounded-xl p-5 border border-slate-700/30 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-purple-400" />
                            <h3 className="text-sm font-medium text-gray-300">Metas do Mês</h3>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6">
                        <div className="flex-1 bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 flex flex-col justify-center relative group">
                            <span className="text-[10px] text-gray-400 block mb-1 uppercase tracking-wide">CPA Alvo</span>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-lg text-white font-semibold">{formatCurrency(cpaTarget)}</span>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 flex flex-col justify-center relative group">
                            <span className="text-[10px] text-gray-400 block mb-1 uppercase tracking-wide">Orçamento Mensal</span>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-lg text-white font-semibold">{formatCurrency(monthlyBudget)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Linha 3: Alertas de Decisão */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <h3 className="text-sm font-medium text-gray-300">Alertas de Decisão</h3>
                        {alerts.length > 0 && (
                            <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">
                                {alerts.length}
                            </span>
                        )}
                    </div>
                </div>

                {alerts.length > 0 ? (
                    <div className="space-y-3">
                        {alerts.map((alert) => (
                            <AlertCard
                                key={alert.id}
                                alert={alert}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center">
                        <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                        <p className="text-emerald-400 font-medium">Tudo certo!</p>
                        <p className="text-gray-400 text-sm">Nenhum alerta de decisão no momento.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AureaDecisionPanel;
