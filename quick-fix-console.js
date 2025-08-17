// SCRIPT RÁPIDO PARA RESOLVER PROBLEMAS - COPIAR E COLAR NO CONSOLE
console.log('🚀 CORREÇÃO RÁPIDA INICIADA...');

// 1. Limpar rate limit
const rateLimitKeys = ['metaAdsRateLimit', 'metaAdsRateLimitTimestamp', 'globalRateLimit', 'globalRateLimitTimestamp'];
rateLimitKeys.forEach(key => localStorage.removeItem(key));
console.log('✅ Rate limit limpo');

// 2. Limpar cache de Ad Sets
const cacheKeys = ['metaAdsData_adsets', 'metaAdsData_adsets_timestamp', 'adsets_cache', 'adsets_cache_timestamp'];
cacheKeys.forEach(key => localStorage.removeItem(key));
console.log('✅ Cache limpo');

// 3. Verificar campaign ID
const campaignId = localStorage.getItem('selectedCampaignId');
if (!campaignId) {
  console.log('❌ Campaign ID não encontrado - tentando encontrar campanha...');
  const campaigns = localStorage.getItem('metaAdsData_campaigns');
  if (campaigns) {
    try {
      const parsedCampaigns = JSON.parse(campaigns);
      if (parsedCampaigns.length > 0) {
        const activeCampaign = parsedCampaigns.find(c => c.status === 'ACTIVE') || parsedCampaigns[0];
        localStorage.setItem('selectedCampaignId', activeCampaign.id);
        console.log(`✅ Campaign ID definido: ${activeCampaign.id}`);
      }
    } catch (e) {
      console.log('❌ Erro ao processar campanhas');
    }
  }
} else {
  console.log(`✅ Campaign ID encontrado: ${campaignId}`);
}

// 4. Verificar mês
const selectedMonth = localStorage.getItem('selectedMonth');
if (selectedMonth) {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const [monthName, yearStr] = selectedMonth.split(' ');
  const year = parseInt(yearStr);
  const monthIndex = months.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
  
  if (monthIndex !== -1) {
    const now = new Date();
    const isFutureMonth = year > now.getFullYear() || (year === now.getFullYear() && monthIndex > now.getMonth());
    
    if (isFutureMonth) {
      const currentMonth = `${months[now.getMonth()]} ${now.getFullYear()}`;
      localStorage.setItem('selectedMonth', currentMonth);
      console.log(`✅ Mês corrigido para: ${currentMonth}`);
    } else {
      console.log(`✅ Mês válido: ${selectedMonth}`);
    }
  }
}

// 5. Limpar cache do serviço se disponível
if (window.metaAdsService && window.metaAdsService.clearCacheByType) {
  try {
    window.metaAdsService.clearCacheByType('adsets');
    console.log('✅ Cache do serviço limpo');
  } catch (e) {
    console.log('⚠️ Erro ao limpar cache do serviço');
  }
}

console.log('✅ CORREÇÃO RÁPIDA CONCLUÍDA!');
console.log('🔄 Recarregue a página e tente novamente');
