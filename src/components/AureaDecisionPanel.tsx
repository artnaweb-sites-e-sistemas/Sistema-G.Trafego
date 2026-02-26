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
    ChevronDown,
    ChevronUp,
    Calendar,
    Users,
    AlertCircle,
    Info
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
        critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertCircle, iconColor: 'text-red-400' },
        warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: AlertTriangle, iconColor: 'text-amber-400' },
        info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Info, iconColor: 'text-blue-400' },
        success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircle, iconColor: 'text-emerald-400' }
    };

    const config = severityConfig[alert.severity];
    const Icon = config.icon;

    return (
        <div className={`p-3 rounded-lg border ${config.bg} ${config.border} flex items-start gap-3`}>
            <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white text-sm">{alert.title}</span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">{alert.message}</p>
            </div>
            {alert.action !== 'none' && (
                <div className="px-3 py-1.5 bg-slate-700/50 text-slate-300 border border-slate-600/50 text-xs font-medium rounded-lg flex-shrink-0 cursor-default">
                    {alert.actionLabel}
                </div>
            )}
        </div>
    );
};

const PacingBar: React.FC<{
    percentSpent: number;
    status: 'good' | 'warning' | 'critical' | 'excellent';
    monthlyBudget?: number;
}> = ({ percentSpent, status, monthlyBudget }) => {
    const statusColors = {
        excellent: 'bg-emerald-500',
        good: 'bg-blue-500',
        warning: 'bg-amber-500',
        critical: 'bg-red-500'
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
                <span>Gasto: {percentSpent.toFixed(1)}%</span>
                {monthlyBudget !== undefined && (
                    <span className="text-gray-400 font-medium">Orçamento: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyBudget)}</span>
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
    monthlyBudget: initialMonthlyBudget = 3000,
    acqRmdSplit: initialSplit = { acq: 80, rmd: 20 },
    currentSpend = 0,
    platformConversions,
    realConversions,
    adSets = [],
    onSettingsChange
}) => {
    // Estados editáveis
    const [cpaTarget, setCpaTarget] = useState(initialCpaTarget);
    const [monthlyBudget, setMonthlyBudget] = useState(initialMonthlyBudget);
    const [acqRmdSplit, setAcqRmdSplit] = useState(initialSplit);
    const [isEditing, setIsEditing] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);

    // Atualizar estados quando props mudam (apenas se não estiver editando)
    useEffect(() => {
        if (!isEditing) {
            setCpaTarget(initialCpaTarget);
            setMonthlyBudget(initialMonthlyBudget);
            setAcqRmdSplit(initialSplit);
        }
    }, [initialCpaTarget, initialMonthlyBudget, initialSplit, isEditing]);

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
            cpaTarget,
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



    // Handler para salvar configurações
    const handleSaveSettings = () => {
        setIsEditing(false);
        onSettingsChange?.({ cpaTarget, monthlyBudget, acqRmdSplit });
    };

    // Formatar moeda
    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Se não tem cliente selecionado, não renderiza
    if (!selectedClient || selectedClient === 'Selecione um cliente') {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl shadow-xl backdrop-blur-sm overflow-hidden">
            {/* Header do Painel */}
            <div
                className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/20 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
                        <Target className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Modo Áurea</h2>
                        <p className="text-sm text-gray-400">Decisão rápida do dia</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <StatusBadge status={pacing.status} />
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="p-6 space-y-8">
                    {/* Linha 1: Contexto + Pacing */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Bloco Contexto */}
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
                            <div className="flex items-center gap-2 mb-3">
                                <Users className="w-4 h-4 text-purple-400" />
                                <h3 className="text-sm font-medium text-gray-300">Contexto</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-gray-500">Cliente</span>
                                    <p className="text-white font-medium truncate">{selectedClient}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Período</span>
                                    <p className="text-white font-medium">{selectedMonth}</p>
                                </div>
                                {selectedProduct && (
                                    <div className="col-span-2">
                                        <span className="text-gray-500">Produto</span>
                                        <p className="text-white font-medium truncate">{selectedProduct}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bloco Pacing */}
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
                            <div className="flex items-center justify-between mb-3">
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
                                <span className="text-xs text-gray-500">
                                    Dia {monthData.dayOfMonth}/{monthData.totalDaysInMonth}
                                </span>
                            </div>

                            <PacingBar
                                percentSpent={pacing.percentSpent}
                                status={pacing.status}
                                monthlyBudget={monthlyBudget}
                            />

                            <div className="mt-3 text-xs">
                                <div>
                                    <span className="text-gray-500">Gasto Atual</span>
                                    <p className="text-white font-medium">{formatCurrency(currentSpend)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Linha 2: Metas do Mês */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-purple-400" />
                                <h3 className="text-sm font-medium text-gray-300">Metas do Mês</h3>
                            </div>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                            >
                                {isEditing ? 'Cancelar' : 'Editar Metas'}
                            </button>
                        </div>

                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">CPA Alvo</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                                        <input
                                            type="number"
                                            value={cpaTarget}
                                            onChange={(e) => setCpaTarget(Number(e.target.value))}
                                            className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-8 pr-3 py-2 text-white text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Orçamento Mensal</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                                        <input
                                            type="number"
                                            value={monthlyBudget}
                                            onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                                            className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-8 pr-3 py-2 text-white text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-full pt-2">
                                    <button
                                        onClick={handleSaveSettings}
                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                                    >
                                        Salvar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-700/30 rounded-lg p-4">
                                    <span className="text-xs text-gray-400 block mb-1 uppercase tracking-wide">CPA Alvo</span>
                                    <span className="text-lg text-white font-semibold">{formatCurrency(cpaTarget)}</span>
                                </div>
                                <div className="bg-slate-700/30 rounded-lg p-4">
                                    <span className="text-xs text-gray-400 block mb-1 uppercase tracking-wide">Orçamento Mensal</span>
                                    <span className="text-lg text-white font-semibold">{formatCurrency(monthlyBudget)}</span>
                                </div>
                            </div>
                        )}
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
                            <div className="space-y-2">
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
            )}
        </div>
    );
};

export default AureaDecisionPanel;
