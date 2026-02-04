/**
 * Utility functions for AdStrategySection
 * Funções utilitárias extraídas para melhor organização
 */

/**
 * Formata um número em formato de moeda BRL
 */
export const formatCurrencyNumber = (num: number | undefined): string => {
    if (num === undefined || isNaN(num)) return 'R$ 0,00';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

/**
 * Formata valor monetário com separadores de milhares
 */
export const formatCurrencyWithSeparators = (value: number): string => {
    if (isNaN(value) || value === undefined) return '0,00';
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

/**
 * Formata moeda a partir de dígitos
 */
export const formatBRLFromDigits = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    const number = parseInt(digits || '0', 10) / 100;
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(number);
};

/**
 * Extrai apenas dígitos de uma string
 */
export const extractDigits = (value: string): string => {
    return value.replace(/\D/g, '');
};

/**
 * Calcula o número de dias em um período baseado no label do mês
 */
export const getDaysInPeriod = (monthLabel: string): number => {
    const months: Record<string, number> = {
        'Janeiro': 31, 'Fevereiro': 28, 'Março': 31, 'Abril': 30,
        'Maio': 31, 'Junho': 30, 'Julho': 31, 'Agosto': 31,
        'Setembro': 30, 'Outubro': 31, 'Novembro': 30, 'Dezembro': 31
    };
    const monthName = monthLabel.split(' ')[0];
    return months[monthName] || 30;
};

/**
 * Formata o valor por dia
 */
export const formatValuePerDay = (value: number, days: number): string => {
    if (days === 0) return 'R$ 0,00';
    const perDay = value / days;
    return formatCurrencyNumber(perDay);
};

/**
 * Normaliza um nome removendo caracteres especiais e espaços extras
 */
export const normalizeName = (value: string): string => {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Verifica se dois nomes correspondem de forma exata
 */
export const namesExactlyMatch = (adSetName: string, strategyAudienceName: string): boolean => {
    const normalizedAdSet = normalizeName(adSetName);
    const normalizedStrategy = normalizeName(strategyAudienceName);
    return normalizedAdSet === normalizedStrategy;
};

/**
 * Verifica correspondência flexível entre nomes (mínimo 2 palavras iguais)
 */
export const namesFlexiblyMatch = (adSetName: string, strategyAudienceName: string): boolean => {
    const normalizedAdSet = normalizeName(adSetName);
    const normalizedStrategy = normalizeName(strategyAudienceName);

    const stratWords = normalizedStrategy.split(' ').filter(w => w.length >= 3);
    const matchingWords = stratWords.filter(word => normalizedAdSet.includes(word));

    return matchingWords.length >= Math.min(2, stratWords.length);
};

/**
 * Extrai localização de um nome de estratégia (texto entre colchetes)
 */
export const extractLocation = (name: string): string => {
    const match = name.match(/\[([^\]]+)\]/);
    return match ? match[1].toLowerCase().trim() : '';
};

/**
 * Calcula frequência (impressões / alcance único)
 */
export const calculateFrequency = (impressions: number, reach: number): number => {
    if (reach === 0) return 0;
    return impressions / reach;
};

/**
 * Calcula ROAS (Return on Ad Spend)
 */
export const calculateROAS = (revenue: number, spend: number): number => {
    if (spend === 0) return 0;
    return revenue / spend;
};

/**
 * Calcula taxa de visualização de página de destino
 */
export const calculateLPVRate = (lpv: number, linkClicks: number): number => {
    if (linkClicks === 0) return 0;
    return (lpv / linkClicks) * 100;
};
