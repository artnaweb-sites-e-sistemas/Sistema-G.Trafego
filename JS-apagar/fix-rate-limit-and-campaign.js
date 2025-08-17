// Script para resolver rate limit e problemas de campanha


// 1. Limpar rate limit global
function clearRateLimit() {
  
  
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
      
    }
  });
  
  // Limpar rate limit do serviço se disponível
  if (typeof window !== 'undefined' && window.metaAdsService) {
    try {
      if (window.metaAdsService.clearRateLimit) {
        window.metaAdsService.clearRateLimit();
        
      }
      if (window.metaAdsService.clearGlobalRateLimit) {
        window.metaAdsService.clearGlobalRateLimit();
        
      }
    } catch (e) {
      
    }
  }
}

// 2. Verificar e corrigir campaignId
function checkAndFixCampaignId() {
  
  
  const campaignId = localStorage.getItem('selectedCampaignId');
  
  
  if (!campaignId) {
    
    
    // Tentar obter do produto selecionado
    const selectedProduct = localStorage.getItem('currentSelectedProduct');
    
    
    // Verificar se há campanhas salvas
    const campaigns = localStorage.getItem('metaAdsData_campaigns');
    if (campaigns) {
      try {
        const parsedCampaigns = JSON.parse(campaigns);
        
        
        if (parsedCampaigns.length > 0) {
          // Usar a primeira campanha ativa
          const activeCampaign = parsedCampaigns.find(c => c.status === 'ACTIVE') || parsedCampaigns[0];
          
          
          localStorage.setItem('selectedCampaignId', activeCampaign.id);
          
          return activeCampaign.id;
        }
      } catch (e) {
        
      }
    }
    
    
    return null;
  }
  
  return campaignId;
}

// 3. Limpar cache de Ad Sets
function clearAdSetsCache() {
  
  
  // Limpar cache específico de campanha
  const campaignId = localStorage.getItem('selectedCampaignId');
  if (campaignId) {
    const cacheKey = `adsets_campaign_${campaignId}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_timestamp`);
    
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
      
    }
  });
  
  // Limpar cache do serviço
  if (typeof window !== 'undefined' && window.metaAdsService) {
    try {
      if (window.metaAdsService.clearCacheByType) {
        window.metaAdsService.clearCacheByType('adsets');
        
      }
    } catch (e) {
      
    }
  }
}

// 4. Verificar mês futuro
function checkFutureMonth() {
  
  
  const selectedMonth = localStorage.getItem('selectedMonth');
  
  
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
        
        const currentMonthName = `${months[currentMonth]} ${currentYear}`;
        localStorage.setItem('selectedMonth', currentMonthName);
        
      } else {
        
      }
    } else {
      
      const now = new Date();
      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                     'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const currentMonth = `${months[now.getMonth()]} ${now.getFullYear()}`;
      localStorage.setItem('selectedMonth', currentMonth);
    }
  } else {
    
  }
}

// 5. Função principal para resolver tudo
async function fixAllIssues() {
  
  
  // 1. Limpar rate limit
  clearRateLimit();
  
  // 2. Verificar mês futuro
  checkFutureMonth();
  
  // 3. Verificar e corrigir campaign ID
  const campaignId = checkAndFixCampaignId();
  
  // 4. Limpar cache
  clearAdSetsCache();
  
  // 5. Aguardar um pouco para o rate limit ser resetado
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 6. Testar conexão
  if (typeof window !== 'undefined' && window.metaAdsService) {
    try {
      
      
      const isLoggedIn = window.metaAdsService.isLoggedIn();
      const hasAccount = window.metaAdsService.hasSelectedAccount();
      
      
      
      
      if (isLoggedIn && hasAccount) {
        
        const adSets = await window.metaAdsService.getAdSets();
        
        
        if (adSets.length > 0) {
          
        } else {
          
        }
      }
    } catch (error) {
      console.error('❌ Erro no teste:', error);
    }
  }
  
  
  
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
