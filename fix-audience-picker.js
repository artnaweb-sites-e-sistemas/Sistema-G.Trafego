// Script para diagnosticar e resolver o problema dos Ad Sets não encontrados
console.log('🔍 DIAGNÓSTICO DO PROBLEMA DOS AD SETS...');

// Função para verificar o estado atual
function checkCurrentState() {
  console.log('📋 ESTADO ATUAL:');
  
  // Verificar localStorage
  const keys = ['selectedCampaignId', 'currentSelectedProduct', 'currentSelectedAudience', 'selectedClient'];
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`${key}: ${value || 'NÃO ENCONTRADO'}`);
  });
  
  // Verificar se o Meta Ads está conectado
  if (typeof window !== 'undefined' && window.metaAdsService) {
    console.log('\n🔗 CONEXÃO META ADS:');
    console.log('Logado:', window.metaAdsService.isLoggedIn());
    console.log('Conta selecionada:', window.metaAdsService.hasSelectedAccount());
    
    if (window.metaAdsService.selectedAccount) {
      console.log('Conta atual:', window.metaAdsService.selectedAccount);
    }
  }
  
  // Verificar cache
  const campaignId = localStorage.getItem('selectedCampaignId');
  if (campaignId) {
    const cacheKey = `adsets_campaign_${campaignId}`;
    const cachedData = localStorage.getItem(cacheKey);
    console.log(`\n💾 CACHE: ${cachedData ? 'ENCONTRADO' : 'NÃO ENCONTRADO'}`);
  }
}

// Função para limpar cache e tentar recarregar
async function clearCacheAndReload() {
  console.log('\n🧹 LIMPANDO CACHE E RECARREGANDO...');
  
  // Limpar cache de Ad Sets
  const campaignId = localStorage.getItem('selectedCampaignId');
  if (campaignId) {
    const cacheKey = `adsets_campaign_${campaignId}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_timestamp`);
    console.log(`✅ Cache removido para campanha: ${campaignId}`);
  }
  
  // Limpar cache geral
  localStorage.removeItem('metaAdsData_adsets');
  console.log('✅ Cache geral removido');
  
  // Limpar rate limit se existir
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
  
  console.log('🔄 Recarregue a página para tentar novamente');
}

// Função para testar conexão com Meta Ads
async function testMetaAdsConnection() {
  console.log('\n🧪 TESTANDO CONEXÃO META ADS...');
  
  if (typeof window !== 'undefined' && window.metaAdsService) {
    try {
      // Testar se está logado
      const isLoggedIn = window.metaAdsService.isLoggedIn();
      console.log('Logado:', isLoggedIn);
      
      if (isLoggedIn) {
        // Testar se tem conta selecionada
        const hasAccount = window.metaAdsService.hasSelectedAccount();
        console.log('Conta selecionada:', hasAccount);
        
        if (hasAccount) {
          // Tentar buscar Ad Sets
          console.log('🔍 Tentando buscar Ad Sets...');
          const adSets = await window.metaAdsService.getAdSets();
          console.log(`Ad Sets encontrados: ${adSets.length}`);
          
          if (adSets.length > 0) {
            console.log('✅ Conexão funcionando! Ad Sets encontrados');
            console.log('Primeiro Ad Set:', adSets[0]);
          } else {
            console.log('⚠️ Conexão OK, mas nenhum Ad Set encontrado');
          }
        } else {
          console.log('❌ Nenhuma conta selecionada');
        }
      } else {
        console.log('❌ Não está logado no Meta Ads');
      }
    } catch (error) {
      console.error('❌ Erro ao testar conexão:', error);
    }
  } else {
    console.log('❌ metaAdsService não encontrado');
  }
}

// Função para sugerir soluções
function suggestSolutions() {
  console.log('\n💡 SUGESTÕES DE SOLUÇÃO:');
  console.log('1. Verifique se está logado no Meta Ads');
  console.log('2. Verifique se selecionou uma conta válida');
  console.log('3. Verifique se a campanha selecionada existe');
  console.log('4. Verifique se a campanha tem Ad Sets ativos');
  console.log('5. Tente selecionar uma campanha diferente');
  console.log('6. Verifique as permissões da conta do Meta Ads');
  console.log('7. Tente reconectar a conta do Meta Ads');
}

// Executar diagnóstico completo
console.log('🚀 INICIANDO DIAGNÓSTICO COMPLETO...\n');
checkCurrentState();
suggestSolutions();

// Expor funções para uso manual
window.debugAudiencePicker = {
  checkState: checkCurrentState,
  clearCache: clearCacheAndReload,
  testConnection: testMetaAdsConnection,
  suggestSolutions: suggestSolutions
};

console.log('\n✅ DIAGNÓSTICO CONCLUÍDO!');
console.log('💡 Use window.debugAudiencePicker.clearCache() para limpar cache');
console.log('💡 Use window.debugAudiencePicker.testConnection() para testar conexão');
