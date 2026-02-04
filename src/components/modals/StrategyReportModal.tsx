import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Package, DollarSign, CheckCircle } from 'lucide-react';
import { AdStrategy } from '../../types/ad-strategy';
import { getRemarketingShare } from '../../utils/budget';

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
}

const StrategyReportModal: React.FC<StrategyReportModalProps> = ({
    isOpen,
    onClose,
    selectedReport,
    selectedStrategyType,
    saveSelectedStrategy,
    budgetItems,
    handleUpdateBudgetItem,
    handleRemoveBudgetItem,
    handleAddBudgetItem,
    handleSaveBudget,
    hasUnsavedChanges,
    extractDigits,
    formatBRLFromDigits
}) => {
    if (!isOpen || !selectedReport?.strategyReport) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-6xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col z-[9999]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700/50 flex-shrink-0 bg-gradient-to-r from-slate-800 to-slate-900 relative z-[9999]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                                <Target className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-200">Relatório Estratégico</h2>
                                <p className="text-sm text-slate-400">{selectedReport.product?.name}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-200 transition-colors text-2xl hover:bg-slate-700/50 rounded-lg p-2"
                        >
                            ×
                        </button>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-8">
                            {/* Dados da Campanha */}
                            <section className="bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-700/20 border border-slate-600/50 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-slate-300" />
                                    Dados da Campanha
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-700/30 border border-slate-600/40 rounded-lg p-4">
                                        <div className="text-sm text-slate-400 mb-1">Tipo de Campanha</div>
                                        <div className="text-white font-medium capitalize">{selectedReport.strategyReport.inputs.campaignType}</div>
                                    </div>
                                    <div className="bg-slate-700/30 border border-slate-600/40 rounded-lg p-4">
                                        <div className="text-sm text-slate-400 mb-1">Produto</div>
                                        <div className="text-white font-medium">{selectedReport.strategyReport.inputs.productType}</div>
                                    </div>
                                    <div className="bg-slate-700/30 border border-slate-600/40 rounded-lg p-4">
                                        <div className="text-sm text-slate-400 mb-1">Investimento Disponível</div>
                                        <div className="text-white font-medium">{selectedReport.strategyReport.inputs.investmentBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                                    </div>
                                    <div className="bg-slate-700/30 border border-slate-600/40 rounded-lg p-4">
                                        <div className="text-sm text-slate-400 mb-1">Ticket do Produto</div>
                                        <div className="text-white font-medium">{selectedReport.strategyReport.inputs.ticketBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                                    </div>
                                </div>
                            </section>

                            {/* Métricas Principais */}
                            <section className="bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-700/20 border border-slate-600/50 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                    <Target className="w-5 h-5 text-slate-300" />
                                    Resultados Esperados
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-slate-700/30 border border-slate-600/40 rounded-lg p-4 text-center">
                                        <div className="text-sm text-slate-400 mb-2">CPC Médio</div>
                                        <div className="text-lg font-bold text-slate-200">
                                            {selectedReport.strategyReport.metrics.cpcMax.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} - {selectedReport.strategyReport.metrics.cpcMin.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">Custo por Clique</div>
                                    </div>
                                    <div className="bg-slate-700/30 border border-slate-600/40 rounded-lg p-4 text-center">
                                        <div className="text-sm text-slate-400 mb-2">
                                            {selectedReport.strategyReport.metrics.strategyType === 'whatsapp_direto' ? 'Cliques Estimados' : 'Acessos à LP'}
                                        </div>
                                        <div className="text-lg font-bold text-slate-200">
                                            {selectedReport.strategyReport.metrics.strategyType === 'whatsapp_direto'
                                                ? `${(selectedReport.strategyReport.metrics.clicksMin || 0).toLocaleString('pt-BR')} - ${(selectedReport.strategyReport.metrics.clicksMax || 0).toLocaleString('pt-BR')}`
                                                : `${(selectedReport.strategyReport.metrics.accessesMin || 0).toLocaleString('pt-BR')} - ${(selectedReport.strategyReport.metrics.accessesMax || 0).toLocaleString('pt-BR')}`
                                            }
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {selectedReport.strategyReport.metrics.strategyType === 'whatsapp_direto' ? 'Cliques → Chats' : 'Acessos → Leads'}
                                        </div>
                                    </div>
                                    <div className={`bg-slate-700/30 border border-slate-600/40 rounded-lg p-4 text-center ${selectedReport.strategyReport.metrics.strategyType === 'lp_direto' ? 'opacity-40' : ''}`}>
                                        <div className="text-sm text-slate-400 mb-2">
                                            {selectedReport.strategyReport.metrics.strategyType === 'whatsapp_direto' ? 'Chats Estimados' :
                                                selectedReport.strategyReport.metrics.strategyType === 'lp_direto' ? 'Leads Estimados' : 'Leads Estimados'}
                                        </div>
                                        <div className="text-lg font-bold text-slate-200">
                                            {selectedReport.strategyReport.metrics.strategyType === 'whatsapp_direto'
                                                ? `${selectedReport.strategyReport.metrics.whatsappChatsMin || 0} - ${selectedReport.strategyReport.metrics.whatsappChatsMax || 0}`
                                                : selectedReport.strategyReport.metrics.strategyType === 'lp_direto'
                                                    ? `0 - 0`
                                                    : `${selectedReport.strategyReport.metrics.leadsMin || 0} - ${selectedReport.strategyReport.metrics.leadsMax || 0}`
                                            }
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {selectedReport.strategyReport.metrics.strategyType === 'whatsapp_direto' ?
                                                `${(selectedReport.strategyReport.metrics.conv.whatsappChatMin * 100).toFixed(1)}% - ${(selectedReport.strategyReport.metrics.conv.whatsappChatMax * 100).toFixed(1)}%` :
                                                selectedReport.strategyReport.metrics.strategyType === 'lp_direto' ? '0% - 0%' :
                                                    `${(selectedReport.strategyReport.metrics.conv.lpToLeadMin * 100).toFixed(1)}% - ${(selectedReport.strategyReport.metrics.conv.lpToLeadMax * 100).toFixed(1)}%`}
                                        </div>
                                    </div>
                                    <div className="bg-slate-700/30 border border-slate-600/40 rounded-lg p-4 text-center">
                                        <div className="text-sm text-slate-400 mb-2">
                                            {selectedReport.strategyReport.metrics.strategyType === 'lp_direto' ? 'Vendas Estimadas' : 'Vendas Finais'}
                                        </div>
                                        <div className="text-lg font-bold text-slate-200">
                                            {selectedReport.strategyReport.metrics.salesMin || 0} - {selectedReport.strategyReport.metrics.salesMax || 0}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {selectedReport.strategyReport.metrics.strategyType === 'whatsapp_direto' ?
                                                `${(selectedReport.strategyReport.metrics.conv.whatsappSaleMin * 100).toFixed(1)}% - ${(selectedReport.strategyReport.metrics.conv.whatsappSaleMax * 100).toFixed(1)}%` :
                                                selectedReport.strategyReport.metrics.strategyType === 'lp_direto' ?
                                                    `${(selectedReport.strategyReport.metrics.conv.directSaleMin * 100).toFixed(1)}% - ${(selectedReport.strategyReport.metrics.conv.directSaleMax * 100).toFixed(1)}%` :
                                                    `${(selectedReport.strategyReport.metrics.conv.leadToSaleMin * 100).toFixed(1)}% - ${(selectedReport.strategyReport.metrics.conv.leadToSaleMax * 100).toFixed(1)}%`}
                                        </div>
                                    </div>
                                </div>

                                {/* ROI e Receita - Destaque */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-slate-700/30 border border-slate-600/40 rounded-xl p-4">
                                        <div className="text-sm text-slate-400 mb-2">ROI Estimado</div>
                                        <div className="text-2xl font-bold text-slate-200">
                                            {(selectedReport.strategyReport.metrics.roiMin || 0).toFixed(1)}x - {(selectedReport.strategyReport.metrics.roiMax || 0).toFixed(1)}x
                                        </div>
                                    </div>
                                    <div className="bg-slate-700/30 border border-slate-600/40 rounded-xl p-4">
                                        <div className="text-sm text-slate-400 mb-2">Receita Potencial</div>
                                        <div className="text-2xl font-bold text-slate-200">
                                            {(selectedReport.strategyReport.metrics.revenueMin || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} - {(selectedReport.strategyReport.metrics.revenueMax || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Distribuição de Verba */}
                            <section className="bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-700/20 border border-slate-600/50 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-slate-300" />
                                    Distribuição de Verba Diária
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-slate-700/30 border border-slate-600/40 rounded-lg p-4">
                                        <div className="text-sm text-slate-400 mb-2">Prospecção ({Math.round((1 - getRemarketingShare(selectedReport.strategyReport.inputs.investmentBRL)) * 100)}%)</div>
                                        <div className="text-lg font-bold text-slate-200">
                                            {(selectedReport.strategyReport.metrics.dailyProspectionBRLMin || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / dia
                                        </div>
                                    </div>
                                    <div className="bg-slate-700/30 border border-slate-600/40 rounded-lg p-4">
                                        <div className="text-sm text-slate-400 mb-2">Remarketing ({Math.round(getRemarketingShare(selectedReport.strategyReport.inputs.investmentBRL) * 100)}%)</div>
                                        <div className="text-lg font-bold text-slate-200">
                                            {(selectedReport.strategyReport.metrics.dailyRemarketingBRLMin || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / dia
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Relatório Completo em Markdown */}
                            <section className="bg-gradient-to-br from-indigo-900/20 to-indigo-800/10 border border-indigo-500/30 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-indigo-200 mb-4 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    Análise Completa
                                </h3>
                                <div className="space-y-6">
                                    {/* Markdown Processing Logic */}
                                    {(() => {
                                        const markdown = selectedReport.strategyReport.markdown;
                                        const sections = markdown.split(/(?=^## )/gm)
                                            .filter((section: string) => section.trim())
                                            .filter((section: string) => !section.includes('Dados da Campanha'))
                                            .filter((section: string) => !section.includes('# Relatório Estratégico de Campanha'));

                                        return sections.map((section: string, index: number) => {
                                            const lines = section.trim().split('\n').filter((line: string) => line.trim());
                                            const title = lines[0]?.replace(/^##\s*/, '') || '';
                                            const content = lines.slice(1).filter((line: string) => line.trim() && !line.startsWith('#'));

                                            const isOpcoesEstrategia = title === 'Opções de Estratégia';

                                            return (
                                                <div key={index} className="bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-700/20 border border-slate-600/50 rounded-2xl p-6 backdrop-blur-sm hover:border-slate-500/60 transition-all duration-300">
                                                    {isOpcoesEstrategia && (
                                                        <div className="mb-6 p-4 bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border border-blue-500/30 rounded-xl">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full shadow-lg"></div>
                                                                <span className="text-sm font-bold text-blue-300 uppercase tracking-wider">
                                                                    Selecione a Estratégia
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                <button
                                                                    onClick={() => saveSelectedStrategy('lp_whatsapp')}
                                                                    className={`p-3 rounded-lg border transition-all duration-200 ${selectedStrategyType === 'lp_whatsapp'
                                                                        ? 'bg-blue-600/30 border-blue-400 text-blue-200'
                                                                        : 'bg-slate-700/30 border-slate-600 text-slate-300 hover:bg-slate-700/50'
                                                                        }`}
                                                                >
                                                                    <div className="font-semibold mb-1">LP → WhatsApp</div>
                                                                    <div className="text-xs opacity-80">Educação + Qualificação</div>
                                                                </button>
                                                                <button
                                                                    onClick={() => saveSelectedStrategy('whatsapp_direto')}
                                                                    className={`p-3 rounded-lg border transition-all duration-200 ${selectedStrategyType === 'whatsapp_direto'
                                                                        ? 'bg-blue-600/30 border-blue-400 text-blue-200'
                                                                        : 'bg-slate-700/30 border-slate-600 text-slate-300 hover:bg-slate-700/50'
                                                                        }`}
                                                                >
                                                                    <div className="font-semibold mb-1">WhatsApp Direto</div>
                                                                    <div className="text-xs opacity-80">Volume + Conversas</div>
                                                                </button>
                                                                <button
                                                                    onClick={() => saveSelectedStrategy('lp_direto')}
                                                                    className={`p-3 rounded-lg border transition-all duration-200 ${selectedStrategyType === 'lp_direto'
                                                                        ? 'bg-blue-600/30 border-blue-400 text-blue-200'
                                                                        : 'bg-slate-700/30 border-slate-600 text-slate-300 hover:bg-slate-700/50'
                                                                        }`}
                                                                >
                                                                    <div className="font-semibold mb-1">LP Direto</div>
                                                                    <div className="text-xs opacity-80">Checkout + Conversão</div>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {title && (
                                                        <div className="flex items-center gap-4 mb-6">
                                                            <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full shadow-lg"></div>
                                                            <h3 className="text-xl font-bold text-slate-100 tracking-wide">{title}</h3>
                                                        </div>
                                                    )}

                                                    <div className="space-y-4 text-slate-200 leading-relaxed">
                                                        {content.map((line: string, lineIndex: number) => (
                                                            <div key={lineIndex} dangerouslySetInnerHTML={{
                                                                __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                                                                    .replace(/^- /, '<span class="text-indigo-400 mr-2">•</span>')
                                                            }} />
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </section>

                            {/* Bloco Permanente de Orçamento */}
                            <section className="bg-gradient-to-br from-emerald-900/20 to-green-800/10 border border-emerald-500/30 rounded-xl p-6 mt-6">
                                <h3 className="text-lg font-semibold text-emerald-200 mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                    Orçamento de Serviços
                                </h3>

                                <div className="space-y-4">
                                    <p className="text-sm text-emerald-300/80 mb-4">
                                        Adicione os serviços e valores para criar um orçamento detalhado
                                    </p>

                                    {/* Lista de itens */}
                                    <div className="space-y-3">
                                        {budgetItems.map((item, index) => (
                                            <div key={index} className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <input
                                                        type="text"
                                                        placeholder="Nome do serviço"
                                                        value={item.service}
                                                        onChange={(e) => handleUpdateBudgetItem(index, 'service', e.target.value)}
                                                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/30 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                                                    />
                                                </div>
                                                <div className="w-32">
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400 font-semibold text-sm">R$</span>
                                                        <input
                                                            type="text"
                                                            value={item.value.replace('R$ ', '')}
                                                            onChange={(e) => {
                                                                const digits = extractDigits(e.target.value);
                                                                const formatted = formatBRLFromDigits(digits);
                                                                handleUpdateBudgetItem(index, 'value', formatted);
                                                            }}
                                                            className="w-full pl-8 pr-4 py-3 bg-slate-700/50 border border-slate-600/30 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-right font-mono transition-all duration-200"
                                                        />
                                                    </div>
                                                </div>
                                                {budgetItems.length > 1 && (
                                                    <button
                                                        onClick={() => handleRemoveBudgetItem(index)}
                                                        className="p-3 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                                                        title="Remover item"
                                                    >
                                                        <span className="text-xl leading-none">×</span>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                                        <button
                                            onClick={handleAddBudgetItem}
                                            className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium transition-colors hover:bg-emerald-500/10 px-4 py-2 rounded-lg border border-transparent hover:border-emerald-500/20"
                                        >
                                            <span className="text-xl leading-none">+</span> Adicionar Serviço
                                        </button>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-sm text-slate-400">Total do Orçamento</div>
                                                <div className="text-xl font-bold text-emerald-400">
                                                    {(() => {
                                                        const total = budgetItems.reduce((acc, item) => {
                                                            const value = parseInt(extractDigits(item.value)) / 100;
                                                            return acc + value;
                                                        }, 0);
                                                        return total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                                                    })()}
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleSaveBudget}
                                                disabled={!hasUnsavedChanges}
                                                className={`px-6 py-3 rounded-xl font-bold shadow-lg transition-all duration-300 flex items-center gap-2 ${hasUnsavedChanges
                                                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:scale-105 hover:shadow-emerald-500/25 cursor-pointer'
                                                    : 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                                                    }`}
                                            >
                                                <CheckCircle className={`w-5 h-5 ${hasUnsavedChanges ? 'animate-bounce' : ''}`} />
                                                {hasUnsavedChanges ? 'Salvar Orçamento' : 'Salvo'}
                                            </button>
                                        </div>
                                    </div>
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
