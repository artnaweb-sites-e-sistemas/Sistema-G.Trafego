import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download } from 'lucide-react';
import { AdStrategy } from '../../types/ad-strategy';
import { getRemarketingShare } from '../../utils/budget';
import { buildStrategyReport } from '../../services/strategyReportService';

interface StrategyReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedReport: AdStrategy | null;
    selectedStrategyType: 'lp_whatsapp' | 'whatsapp_direto' | 'lp_direto';
    saveSelectedStrategy: (type: 'lp_whatsapp' | 'whatsapp_direto' | 'lp_direto') => void;
    budgetItems: Array<{ service: string; value: string }>;
    handleUpdateBudgetItem: (index: number, field: 'service' | 'value', value: string) => void;
    handleRemoveBudgetItem: (index: number) => void;
    handleAddBudgetItem: () => void;
    handleSaveBudget: () => void;
    hasUnsavedChanges: boolean;
    extractDigits: (value: string) => string;
    formatBRLFromDigits: (value: string) => string;
    onExportPDF: (strategy: AdStrategy) => void;
}

const StrategyReportModal: React.FC<StrategyReportModalProps> = ({
    isOpen,
    onClose,
    selectedReport,
    selectedStrategyType,
    saveSelectedStrategy,
    onExportPDF
}) => {
    if (!isOpen || !selectedReport?.strategyReport) return null;

    // Recalcula o relatorio dinamicamente para garantir as fórmulas mais recentes
    const dynamicReport = buildStrategyReport({
        ...selectedReport.strategyReport.inputs,
        strategyType: selectedStrategyType,
        forceStrategy: true
    });

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-inter"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 10 }}
                    className="relative bg-[#0f172a] border border-slate-700/50 rounded-3xl w-full max-w-5xl max-h-[92vh] shadow-[0_0_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col z-[9999]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header — Estilo Ultra Clean & Executive */}
                    <div className="flex items-center justify-between px-8 py-7 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-[100]">
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight leading-tight">Relatório Estratégico</h2>
                            <div className="flex items-center gap-2 mt-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest leading-none">{selectedReport.product?.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => selectedReport && onExportPDF(selectedReport)}
                                className="flex items-center gap-2.5 bg-white/[0.03] hover:bg-white/[0.08] text-slate-200 border border-white/10 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Exportar PDF
                            </button>
                            <button
                                onClick={onClose}
                                className="text-slate-500 hover:text-white transition-all hover:bg-white/5 rounded-xl w-10 h-10 flex items-center justify-center border border-transparent hover:border-white/5"
                            >
                                <span className="text-3xl font-light">×</span>
                            </button>
                        </div>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar-slim bg-[#0f172a]">
                        <div className="space-y-12">

                            {/* Grid Superior: Dados + Verba */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Dados da Campanha */}
                                <section className="relative">
                                    <div className="bg-slate-900/20 border border-slate-800/60 rounded-3xl overflow-hidden h-full backdrop-blur-sm">
                                        <div className="px-7 py-5 bg-[#151e31] border-b border-slate-800/60 flex items-center justify-between">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em]">Dados Gerais</h3>
                                            <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-300 text-[9px] font-black rounded-full border border-indigo-500/20 uppercase tracking-widest">Parâmetros</span>
                                        </div>
                                        <div className="p-8 grid grid-cols-2 gap-8">
                                            <div>
                                                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Natureza</div>
                                                <div className="text-slate-200 font-bold text-lg leading-tight capitalize">{selectedReport.strategyReport.inputs.campaignType}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Investimento</div>
                                                <div className="text-blue-400 font-black text-xl leading-tight">{selectedReport.strategyReport.inputs.investmentBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Objetivo</div>
                                                <div className="text-slate-200 font-bold text-lg leading-tight">{selectedReport.strategyReport.inputs.productType.replace(/\b\w/g, (l: string) => l.toUpperCase())}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Ticket Médio</div>
                                                <div className="text-slate-200 font-bold text-lg leading-tight">{selectedReport.strategyReport.inputs.ticketBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Distribuição de Verba */}
                                <section className="relative">
                                    <div className="bg-slate-900/20 border border-slate-800/60 rounded-3xl overflow-hidden h-full backdrop-blur-sm">
                                        <div className="px-7 py-5 bg-[#151e31] border-b border-slate-800/60 flex items-center justify-between">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em]">Budget Diário</h3>
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-black rounded-full border border-emerald-500/20 uppercase tracking-widest">
                                                <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></div>
                                                Recomendado
                                            </div>
                                        </div>
                                        <div className="p-8 space-y-5">
                                            <div className="flex items-center gap-5 bg-slate-800/20 p-5 rounded-[1.25rem] border border-slate-800/40">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prospecção</span>
                                                        <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] font-black rounded tracking-normal">{dynamicReport.metrics.strategyType === 'impulsionar_post' ? '100' : Math.round((1 - getRemarketingShare(selectedReport.strategyReport.inputs.investmentBRL)) * 100)}%</span>
                                                    </div>
                                                    <div className="text-2xl font-black text-white tracking-tight">{(dynamicReport.metrics.dailyProspectionBRLMin || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                                                </div>
                                            </div>
                                            {dynamicReport.metrics.strategyType !== 'impulsionar_post' && (
                                                <div className="flex items-center gap-5 bg-slate-800/20 p-5 rounded-[1.25rem] border border-slate-800/40">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remarketing</span>
                                                            <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 text-[9px] font-black rounded tracking-normal">{Math.round(getRemarketingShare(selectedReport.strategyReport.inputs.investmentBRL) * 100)}%</span>
                                                        </div>
                                                        <div className="text-2xl font-black text-white tracking-tight">{(dynamicReport.metrics.dailyRemarketingBRLMin || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Análise Completa — Executive Refinement */}
                            <section className="space-y-8">
                                <div className="flex items-center gap-5 px-1">
                                    <h3 className="text-xl font-bold text-white tracking-tight">Análise Estratégica Completa</h3>
                                    <div className="flex-1 h-[1px] bg-slate-900"></div>
                                </div>

                                <div className="space-y-8">
                                    {(() => {
                                        const markdown = dynamicReport.markdown;
                                        const sections = markdown.split(/(?=^## )/gm)
                                            .filter((section: string) => section.trim())
                                            .filter((section: string) => !section.includes('Dados da Campanha'))
                                            .filter((section: string) => !section.includes('# Relatório Estratégico de Campanha'));

                                        return sections.map((section: string, index: number) => {
                                            const lines = section.trim().split('\n').filter((line: string) => line.trim());
                                            const title = lines[0]?.replace(/^##\s*/, '') || '';
                                            const content = lines.slice(1).filter((line: string) => line.trim() && !line.startsWith('#'));

                                            const isOpcoesEstrategia = title === 'Opções de Estratégia';

                                            // Paleta vibrante e harmonizada por seção
                                            const sectionStyles = [
                                                { border: 'border-blue-500/20', bg: 'bg-blue-500/5', bar: 'bg-blue-500', text: 'text-blue-400' },      // Opções
                                                { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', bar: 'bg-emerald-500', text: 'text-emerald-400' }, // Recomendada
                                                { border: 'border-amber-500/20', bg: 'bg-amber-500/5', bar: 'bg-amber-500', text: 'text-amber-400' },    // Risco
                                                { border: 'border-indigo-500/20', bg: 'bg-indigo-500/5', bar: 'bg-indigo-500', text: 'text-indigo-400' }, // Próximos Passos
                                            ];
                                            const style = sectionStyles[index % sectionStyles.length];

                                            return (
                                                <motion.div
                                                    key={index}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.06 }}
                                                    className={`border ${style.border} border-l-[6px] ${style.bar.replace('bg-', 'border-')} ${style.bg} rounded-[2rem] p-10 relative overflow-hidden`}
                                                >
                                                    {/* O indicador agora é a própria borda lateral para acompanhar o radius */}

                                                    {/* Seletor Especial */}
                                                    {isOpcoesEstrategia && dynamicReport.metrics.strategyType !== 'impulsionar_post' && (() => {
                                                        const objective = selectedReport?.product?.objective;
                                                        const isCapturaLeads = objective === 'captura_leads';

                                                        return (
                                                            <div className="mb-10 p-8 bg-slate-900/30 rounded-3xl border border-slate-800/50">
                                                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-6">Modelo de Funil Selecionado</h4>
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                                    {isCapturaLeads ? (
                                                                        <div className="p-5 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 col-span-full">
                                                                            <div className="font-bold text-indigo-300 text-base">LP → Formulário</div>
                                                                            <div className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed">Configurado para máxima qualificação e geração de base de dados.</div>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                onClick={() => saveSelectedStrategy('lp_whatsapp')}
                                                                                className={`p-5 rounded-2xl border-2 transition-all duration-300 text-left ${selectedStrategyType === 'lp_whatsapp' ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'border-slate-800 bg-slate-900/40 opacity-40 hover:opacity-100'}`}
                                                                            >
                                                                                <div className={`font-bold text-sm ${selectedStrategyType === 'lp_whatsapp' ? 'text-white' : 'text-slate-400'}`}>LP → WhatsApp</div>
                                                                                <div className="text-[10px] mt-2 font-semibold text-slate-500 uppercase tracking-wider">Qualificação</div>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => saveSelectedStrategy('whatsapp_direto')}
                                                                                className={`p-5 rounded-2xl border-2 transition-all duration-300 text-left ${selectedStrategyType === 'whatsapp_direto' ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'border-slate-800 bg-slate-900/40 opacity-40 hover:opacity-100'}`}
                                                                            >
                                                                                <div className={`font-bold text-sm ${selectedStrategyType === 'whatsapp_direto' ? 'text-white' : 'text-slate-400'}`}>WhatsApp Direto</div>
                                                                                <div className="text-[10px] mt-2 font-semibold text-slate-500 uppercase tracking-wider">Velocidade</div>
                                                                            </button>
                                                                            {objective !== 'mensagens' && (
                                                                                <button
                                                                                    onClick={() => saveSelectedStrategy('lp_direto')}
                                                                                    className={`p-5 rounded-2xl border-2 transition-all duration-300 text-left ${selectedStrategyType === 'lp_direto' ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'border-slate-800 bg-slate-900/40 opacity-40 hover:opacity-100'}`}
                                                                                >
                                                                                    <div className={`font-bold text-sm ${selectedStrategyType === 'lp_direto' ? 'text-white' : 'text-slate-400'}`}>Venda Direta</div>
                                                                                    <div className="text-[10px] mt-2 font-semibold text-slate-500 uppercase tracking-wider">Automática</div>
                                                                                </button>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Título de Seção Refinado — Matched with Indicator Color */}
                                                    {title && (
                                                        <h4 className={`text-xl font-bold tracking-tight mb-7 ${style.text}`}>{title}</h4>
                                                    )}

                                                    {/* Lista com Marcadores Alinhados Precisamente */}
                                                    <div className="space-y-5 text-[15px] leading-relaxed text-slate-400">
                                                        {content.map((line: string, lineIndex: number) => (
                                                            <div key={lineIndex} className="flex gap-4">
                                                                <div className="flex-shrink-0 mt-[0.6em]">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40"></div>
                                                                </div>
                                                                <div
                                                                    className="flex-1 tracking-normal"
                                                                    dangerouslySetInnerHTML={{
                                                                        __html: line
                                                                            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-200 font-bold">$1</strong>')
                                                                            .replace(/^- /, '')
                                                                    }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            );
                                        });
                                    })()}
                                </div>
                            </section>

                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default StrategyReportModal;
