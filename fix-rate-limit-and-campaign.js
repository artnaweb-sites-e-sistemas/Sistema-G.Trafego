// Script para resolver rate limit e problemas de campanha
console.log('🔧 RESOLVENDO RATE LIMIT E PROBLEMAS DE CAMPANHA...');

// 1. Limpar rate limit global
function clearRateLimit() {
  console.log('🧹 LIMPANDO RATE LIMIT...');
  
  // Limpar rate limit do localStorage
  const rateLimitKeys = [
    'metaAdsRateLimit',
    'metaAdsRateLimitTimestamp',
    'globalRateLimit',
    'globalRateLimitTimestamp'
  ];
  
  rateLimitKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`✅ Removido: ${key}`);
    }
  });
  
  // Limpar rate limit do serviço se disponível
  if (typeof window !== 'undefined' && window.metaAdsService) {
    try {
      if (window.metaAdsService.clearRateLimit) {
        window.metaAdsService.clearRateLimit();
        console.log('✅ Rate limit do serviço limpo');
      }
      if (window.metaAdsService.clearGlobalRateLimit) {
        window.metaAdsService.clearGlobalRateLimit();
        console.log('✅ Rate limit global do serviço limpo');
      }
    } catch (e) {
      console.log('⚠️ Erro ao limpar rate limit do serviço:', e);
    }
  }
}

// 2. Verificar e corrigir campaignId
function checkAndFixCampaignId() {
  console.log('\n🎯 VERIFICANDO CAMPAIGN ID...');
  
  const campaignId = localStorage.getItem('selectedCampaignId');
  console.log(`Campaign ID atual: ${campaignId || 'NULO'}`);
  
  if (!campaignId) {
    console.log('❌ Campaign ID não encontrado!');
    
    // Tentar obter do produto selecionado
    const selectedProduct = localStorage.getItem('currentSelectedProduct');
    console.log(`Produto selecionado: ${selectedProduct || 'NÃO ENCONTRADO'}`);
    
    // Verificar se há campanhas salvas
    const campaigns = localStorage.getItem('metaAdsData_campaigns');
    if (campaigns) {
      try {
        const parsedCampaigns = JSON.parse(campaigns);
        console.log(`Campanhas encontradas: ${parsedCampaigns.length}`);
        
        if (parsedCampaigns.length > 0) {
          // Usar a primeira campanha ativa
          const activeCampaign = parsedCampaigns.find(c => c.status === 'ACTIVE') || parsedCampaigns[0];
          console.log(`Usando campanha: ${activeCampaign.name} (${activeCampaign.id})`);
          
          localStorage.setItem('selectedCampaignId', activeCampaign.id);
          console.log('✅ Campaign ID definido!');
          return activeCampaign.id;
        }
      } catch (e) {
        console.log('❌ Erro ao parsear campanhas:', e);
      }
    }
    
    console.log('⚠️ Nenhuma campanha encontrada para usar como fallback');
    return null;
  }
  
  return campaignId;
}

// 3. Limpar cache de Ad Sets
function clearAdSetsCache() {
  console.log('\n💾 LIMPANDO CACHE DE AD SETS...');
  
  // Limpar cache específico de campanha
  const campaignId = localStorage.getItem('selectedCampaignId');
  if (campaignId) {
    const cacheKey = `adsets_campaign_${campaignId}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_timestamp`);
    console.log(`✅ Cache removido para campanha: ${campaignId}`);
  }
  
  // Limpar cache geral
  const generalCacheKeys = [
    'metaAdsData_adsets',
    'metaAdsData_adsets_timestamp',
    'adsets_cache',
    'adsets_cache_timestamp'
  ];
  
  generalCacheKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`✅ Removido: ${key}`);
    }
  });
  
  // Limpar cache do serviço
  if (typeof window !== 'undefined' && window.metaAdsService) {
    try {
      if (window.metaAdsService.clearCacheByType) {
        window.metaAdsService.clearCacheByType('adsets');
        console.log('✅ Cache do serviço limpo');
      }
    } catch (e) {
      console.log('⚠️ Erro ao limpar cache do serviço:', e);
    }
  }
}

// 4. Verificar mês futuro
function checkFutureMonth() {
  console.log('\n📅 VERIFICANDO MÊS SELECIONADO...');
  
  const selectedMonth = localStorage.getItem('selectedMonth');
  console.log(`Mês selecionado: ${selectedMonth || 'NÃO ENCONTRADO'}`);
  
  if (selectedMonth) {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const [monthName, yearStr] = selectedMonth.split(' ');
    const year = parseInt(yearStr);
    const monthIndex = months.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
    
    if (monthIndex !== -1) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      // Verificar se é realmente um mês futuro
      const isFutureMonth = year > currentYear || (year === currentYear && monthIndex > currentMonth);
      
      if (isFutureMonth) {
        console.log('❌ Mês futuro detectado! Corrigindo...');
        const currentMonthName = `${months[currentMonth]} ${currentYear}`;
        localStorage.setItem('selectedMonth', currentMonthName);
        console.log(`✅ Mês corrigido para: ${currentMonthName}`);
      } else {
        console.log('✅ Mês válido (passado ou atual)');
      }
    } else {
      console.log('⚠️ Formato de mês inválido, usando mês atual');
      const now = new Date();
      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                     'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const currentMonth = `${months[now.getMonth()]} ${now.getFullYear()}`;
      localStorage.setItem('selectedMonth', currentMonth);
    }
  } else {
    console.log('✅ Nenhum mês selecionado');
  }
}

// 5. Função principal para resolver tudo
async function fixAllIssues() {
  console.log('🚀 INICIANDO CORREÇÃO COMPLETA...\n');
  
  // 1. Limpar rate limit
  clearRateLimit();
  
  // 2. Verificar mês futuro
  checkFutureMonth();
  
  // 3. Verificar e corrigir campaign ID
  const campaignId = checkAndFixCampaignId();
  
  // 4. Limpar cache
  clearAdSetsCache();
  
  // 5. Aguardar um pouco para o rate limit ser resetado
  console.log('\n⏳ Aguardando 3 segundos para reset do rate limit...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 6. Testar conexão
  if (typeof window !== 'undefined' && window.metaAdsService) {
    try {
      console.log('\n🧪 TESTANDO CONEXÃO APÓS CORREÇÕES...');
      
      const isLoggedIn = window.metaAdsService.isLoggedIn();
      const hasAccount = window.metaAdsService.hasSelectedAccount();
      
      console.log(`Logado: ${isLoggedIn}`);
      console.log(`Conta selecionada: ${hasAccount}`);
      
      if (isLoggedIn && hasAccount) {
        console.log('🔍 Tentando buscar Ad Sets...');
        const adSets = await window.metaAdsService.getAdSets();
        console.log(`✅ Ad Sets encontrados: ${adSets.length}`);
        
        if (adSets.length > 0) {
          console.log('🎉 PROBLEMA RESOLVIDO! Ad Sets carregados com sucesso');
        } else {
          console.log('⚠️ Conexão OK, mas nenhum Ad Set encontrado');
        }
      }
    } catch (error) {
      console.error('❌ Erro no teste:', error);
    }
  }
  
  console.log('\n✅ CORREÇÃO CONCLUÍDA!');
  console.log('🔄 Recarregue a página para aplicar as correções');
}

// 6. Expor funções para uso manual
window.fixAudienceIssues = {
  clearRateLimit,
  checkAndFixCampaignId,
  clearAdSetsCache,
  checkFutureMonth,
  fixAllIssues
};

// Executar correção automática
fixAllIssues();
