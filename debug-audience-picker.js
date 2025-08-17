// Script para investigar o problema dos Ad Sets não encontrados
console.log('🔍 INVESTIGANDO PROBLEMA DOS AD SETS...');

// Verificar localStorage
console.log('📋 VERIFICANDO LOCALSTORAGE:');
const keys = ['selectedCampaignId', 'currentSelectedProduct', 'currentSelectedAudience', 'selectedClient'];
keys.forEach(key => {
  const value = localStorage.getItem(key);
  console.log(`${key}: ${value || 'NÃO ENCONTRADO'}`);
});

// Verificar se o Meta Ads está conectado
console.log('\n🔗 VERIFICANDO CONEXÃO META ADS:');
if (typeof window !== 'undefined' && window.metaAdsService) {
  console.log('✅ metaAdsService encontrado');
  console.log('Logado:', window.metaAdsService.isLoggedIn());
  console.log('Conta selecionada:', window.metaAdsService.hasSelectedAccount());
  
  if (window.metaAdsService.selectedAccount) {
    console.log('Conta atual:', window.metaAdsService.selectedAccount);
  }
} else {
  console.log('❌ metaAdsService não encontrado');
}

// Verificar cache de Ad Sets
console.log('\n💾 VERIFICANDO CACHE DE AD SETS:');
const campaignId = localStorage.getItem('selectedCampaignId');
if (campaignId) {
  const cacheKey = `adsets_campaign_${campaignId}`;
  const cachedData = localStorage.getItem(cacheKey);
  const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
  
  console.log(`Cache key: ${cacheKey}`);
  console.log(`Cache data: ${cachedData ? 'ENCONTRADO' : 'NÃO ENCONTRADO'}`);
  console.log(`Cache timestamp: ${cacheTimestamp || 'NÃO ENCONTRADO'}`);
  
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      console.log(`Ad Sets em cache: ${parsed.length}`);
      if (parsed.length > 0) {
        console.log('Primeiro Ad Set:', parsed[0]);
      }
    } catch (e) {
      console.log('❌ Erro ao parsear cache:', e);
    }
  }
} else {
  console.log('❌ Nenhum campaignId encontrado no localStorage');
}

// Verificar dados salvos gerais
console.log('\n📊 VERIFICANDO DADOS SALVOS GERAIS:');
const savedAdSets = localStorage.getItem('metaAdsData_adsets');
if (savedAdSets) {
  try {
    const parsed = JSON.parse(savedAdSets);
    console.log(`Ad Sets salvos: ${parsed.length}`);
    if (parsed.length > 0) {
      console.log('Primeiro Ad Set salvo:', parsed[0]);
    }
  } catch (e) {
    console.log('❌ Erro ao parsear dados salvos:', e);
  }
} else {
  console.log('❌ Nenhum dado salvo encontrado');
}

console.log('\n✅ INVESTIGAÇÃO CONCLUÍDA');
