// Script para investigar o problema dos Ad Sets não encontrados


// Verificar localStorage

const keys = ['selectedCampaignId', 'currentSelectedProduct', 'currentSelectedAudience', 'selectedClient'];
keys.forEach(key => {
  const value = localStorage.getItem(key);
  
});

// Verificar se o Meta Ads está conectado

if (typeof window !== 'undefined' && window.metaAdsService) {
  
  
  
  
  if (window.metaAdsService.selectedAccount) {
    
  }
} else {
  
}

// Verificar cache de Ad Sets

const campaignId = localStorage.getItem('selectedCampaignId');
if (campaignId) {
  const cacheKey = `adsets_campaign_${campaignId}`;
  const cachedData = localStorage.getItem(cacheKey);
  const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
  
  
  
  
  
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      
      if (parsed.length > 0) {
        
      }
    } catch (e) {
      
    }
  }
} else {
  
}

// Verificar dados salvos gerais

const savedAdSets = localStorage.getItem('metaAdsData_adsets');
if (savedAdSets) {
  try {
    const parsed = JSON.parse(savedAdSets);
    
    if (parsed.length > 0) {
      
    }
  } catch (e) {
    
  }
} else {
  
}


