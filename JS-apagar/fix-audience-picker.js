// Script para diagnosticar e resolver o problema dos Ad Sets não encontrados


// Função para verificar o estado atual
function checkCurrentState() {
  
  
  // Verificar localStorage
  const keys = ['selectedCampaignId', 'currentSelectedProduct', 'currentSelectedAudience', 'selectedClient'];
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    
  });
  
  // Verificar se o Meta Ads está conectado
  if (typeof window !== 'undefined' && window.metaAdsService) {
    
    
    
    
    if (window.metaAdsService.selectedAccount) {
      
    }
  }
  
  // Verificar cache
  const campaignId = localStorage.getItem('selectedCampaignId');
  if (campaignId) {
    const cacheKey = `adsets_campaign_${campaignId}`;
    const cachedData = localStorage.getItem(cacheKey);
    
  }
}

// Função para limpar cache e tentar recarregar
async function clearCacheAndReload() {
  
  
  // Limpar cache de Ad Sets
  const campaignId = localStorage.getItem('selectedCampaignId');
  if (campaignId) {
    const cacheKey = `adsets_campaign_${campaignId}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_timestamp`);
    
  }
  
  // Limpar cache geral
  localStorage.removeItem('metaAdsData_adsets');
  
  
  // Limpar rate limit se existir
  if (typeof window !== 'undefined' && window.metaAdsService) {
    try {
      if (window.metaAdsService.clearCacheByType) {
        window.metaAdsService.clearCacheByType('adsets');
        
      }
    } catch (e) {
      
    }
  }
  
  
}

// Função para testar conexão com Meta Ads
async function testMetaAdsConnection() {
  
  
  if (typeof window !== 'undefined' && window.metaAdsService) {
    try {
      // Testar se está logado
      const isLoggedIn = window.metaAdsService.isLoggedIn();
      
      
      if (isLoggedIn) {
        // Testar se tem conta selecionada
        const hasAccount = window.metaAdsService.hasSelectedAccount();
        
        
        if (hasAccount) {
          // Tentar buscar Ad Sets
          
          const adSets = await window.metaAdsService.getAdSets();
          
          
          if (adSets.length > 0) {
            
            
          } else {
            
          }
        } else {
          
        }
      } else {
        
      }
    } catch (error) {
      console.error('❌ Erro ao testar conexão:', error);
    }
  } else {
    
  }
}

// Função para sugerir soluções
function suggestSolutions() {
  
  
  
  
  
  
  
  
}

// Executar diagnóstico completo

checkCurrentState();
suggestSolutions();

// Expor funções para uso manual
window.debugAudiencePicker = {
  checkState: checkCurrentState,
  clearCache: clearCacheAndReload,
  testConnection: testMetaAdsConnection,
  suggestSolutions: suggestSolutions
};




