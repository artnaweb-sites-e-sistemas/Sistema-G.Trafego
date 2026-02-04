/**
 * TabNavigation - Sistema de Navegação por Abas do Modo Áurea
 * 
 * Organiza o Dashboard em seções lógicas:
 * - Hoje: Visão geral com métricas e alertas
 * - Dia: Controle diário granular
 * - Mês: Detalhes e benchmarks mensais
 * - Assets: Públicos, criativos e histórico
 * - Estratégia: Planejamento de campanhas
 * - Cliente: Relatórios e compartilhamento
 */

import React from 'react';
import {
    Zap,
    Calendar,
    BarChart3,
    Layers,
    Target,
    Users,
    LucideIcon
} from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

export type TabId = 'hoje' | 'dia' | 'mes' | 'assets' | 'estrategia' | 'cliente';

export interface Tab {
    id: TabId;
    label: string;
    icon: LucideIcon;
    description?: string;
}

export interface TabNavigationProps {
    activeTab: TabId;
    onTabChange: (tabId: TabId) => void;
    // Contadores opcionais para badges
    alertCount?: number;
    hasNewData?: boolean;
}

// ============================================================================
// CONFIGURAÇÃO DAS TABS
// ============================================================================

export const TABS: Tab[] = [
    {
        id: 'hoje',
        label: 'Hoje',
        icon: Zap,
        description: 'Decisões do dia'
    },
    {
        id: 'dia',
        label: 'Dia',
        icon: Calendar,
        description: 'Controle diário'
    },
    {
        id: 'mes',
        label: 'Mês',
        icon: BarChart3,
        description: 'Detalhes mensais'
    },
    {
        id: 'assets',
        label: 'Assets',
        icon: Layers,
        description: 'Públicos e criativos'
    },
    {
        id: 'estrategia',
        label: 'Estratégia',
        icon: Target,
        description: 'Planejamento'
    },
    {
        id: 'cliente',
        label: 'Cliente',
        icon: Users,
        description: 'Relatórios'
    }
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const TabNavigation: React.FC<TabNavigationProps> = ({
    activeTab,
    onTabChange,
    alertCount = 0
}) => {
    return (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-1.5 mb-6">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const showBadge = tab.id === 'hoje' && alertCount > 0;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium 
                transition-all duration-200 whitespace-nowrap
                ${isActive
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                                }
              `}
                            title={tab.description}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                            <span>{tab.label}</span>

                            {/* Badge de alertas */}
                            {showBadge && (
                                <span className={`
                  absolute -top-1 -right-1 min-w-[18px] h-[18px] 
                  flex items-center justify-center 
                  text-[10px] font-bold rounded-full
                  ${isActive
                                        ? 'bg-amber-400 text-slate-900'
                                        : 'bg-amber-500 text-white'
                                    }
                `}>
                                    {alertCount > 9 ? '9+' : alertCount}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// ============================================================================
// COMPONENTE DE CONTEÚDO DA TAB
// ============================================================================

export interface TabContentProps {
    activeTab: TabId;
    children: React.ReactNode;
    tabId: TabId;
}

export const TabContent: React.FC<TabContentProps> = ({
    activeTab,
    children,
    tabId
}) => {
    if (activeTab !== tabId) return null;

    return (
        <div className="animate-fadeIn">
            {children}
        </div>
    );
};

// ============================================================================
// HOOK PARA GERENCIAR ESTADO DA TAB
// ============================================================================

export const useTabNavigation = (initialTab: TabId = 'hoje') => {
    const [activeTab, setActiveTab] = React.useState<TabId>(initialTab);

    // Persistir tab ativa no localStorage
    React.useEffect(() => {
        const saved = localStorage.getItem('aurea_active_tab') as TabId | null;
        if (saved && TABS.some(t => t.id === saved)) {
            setActiveTab(saved);
        }
    }, []);

    const handleTabChange = React.useCallback((tabId: TabId) => {
        setActiveTab(tabId);
        localStorage.setItem('aurea_active_tab', tabId);
    }, []);

    return {
        activeTab,
        setActiveTab: handleTabChange
    };
};

export default TabNavigation;
