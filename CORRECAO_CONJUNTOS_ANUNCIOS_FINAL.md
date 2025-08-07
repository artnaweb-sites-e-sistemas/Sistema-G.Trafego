# Correção: Conjuntos de Anúncios Não Aparecem

## Problema Identificado
Ao selecionar um produto (campanha) que possui conjuntos de anúncios disponíveis, a aba público mostrava "Nenhum conjunto de anúncios ativo encontrado para esta campanha", mesmo quando havia conjuntos de anúncios disponíveis.

## Causa Raiz
O problema estava relacionado a:
1. **Erro 400 da API do Facebook**: A API estava retornando erro 400 (Bad Request) ao tentar buscar Ad Sets
2. **Validação inadequada do Campaign ID**: Não havia validação adequada do ID da campanha
3. **Tratamento insuficiente de erros**: O sistema não lidava adequadamente com diferentes tipos de erro da API
4. **Falta de fallback para dados em cache**: Quando a API falhava, não havia estratégia adequada de fallback

## Correções Implementadas

### 1. Melhorias no `metaAdsService.ts`

#### Validação do Campaign ID
```typescript
// Verificar se o campaignId é válido (deve ser um número)
if (!/^\d+$/.test(campaignId)) {
  console.error(`Campaign ID inválido: ${campaignId}`);
  throw new Error(`Campaign ID inválido: ${campaignId}`);
}
```

#### Verificação de Permissões
```typescript
// Verificar se o token tem as permissões necessárias
const permissions = await this.checkUserPermissions();
if (!permissions.includes('ads_read')) {
  console.warn('Token não tem permissão ads_read');
}
```

#### Estratégia de Fallback
```typescript
// Se for erro de permissão ou campanha não encontrada, tentar buscar todos os Ad Sets da conta
if ((errorCode === 100 || errorCode === 1487654) && campaignId) {
  // Buscar todos os Ad Sets da conta e filtrar por campanha
  const allAdSets = await this.getAllAdSetsFromAccount();
  const campaignAdSets = allAdSets.filter(adSet => adSet.campaign_id === campaignId);
  return campaignAdSets;
}
```

#### Melhor Tratamento de Rate Limit
```typescript
// Detectar rate limit por código de erro também
if ((errorMessage.includes('User request limit reached') || errorCode === 4 || errorCode === 17) && attempt < maxRetries) {
  // Aguardar e tentar novamente
}
```

### 2. Melhorias no `AudiencePicker.tsx`

#### Validação Robusta do Campaign ID
```typescript
if (!campaignId || campaignId.trim() === '') {
  console.log('Nenhum campaign ID válido encontrado no localStorage');
  setAudiences([]);
  return;
}

if (!/^\d+$/.test(campaignId)) {
  console.error(`Campaign ID inválido: ${campaignId}`);
  setAudiences([]);
  return;
}
```

#### Estratégia de Cache Melhorada
```typescript
// Se não há Ad Sets, tentar usar dados em cache
if (facebookAudiences.length === 0) {
  const cachedData = metaAdsService.getDataFromStorage('adsets');
  if (cachedData && cachedData.length > 0) {
    // Usar dados em cache
  }
}
```

#### Botão de Atualização Melhorado
```typescript
onClick={() => {
  console.log('Forçando atualização dos Ad Sets...');
  metaAdsService.clearCacheByType('adsets');
  metaAdsService.clearCacheByType('campaigns');
  setTimeout(() => {
    loadMetaAdsAdSets();
  }, 500);
}}
```

### 3. Melhorias no `ProductPicker.tsx`

#### Logs de Debug para Campaign ID
```typescript
if (product.source === 'facebook' && product.campaign) {
  console.log('Salvando campaign ID:', product.campaign.id);
  localStorage.setItem('selectedCampaignId', product.campaign.id);
  console.log('Campaign ID salvo no localStorage:', localStorage.getItem('selectedCampaignId'));
}
```

## Logs de Debug Adicionados

### Verificação de Permissões
- Log das permissões do token
- Aviso quando falta permissão `ads_read`

### Validação de Dados
- Log do Campaign ID salvo
- Validação do formato do Campaign ID
- Log da URL completa da requisição

### Tratamento de Erros
- Log detalhado dos erros da API
- Log dos códigos de erro específicos
- Log da estratégia de fallback utilizada

## Estratégias de Fallback Implementadas

1. **Cache Local**: Usar dados salvos no localStorage quando a API falha
2. **Busca Alternativa**: Buscar todos os Ad Sets da conta e filtrar por campanha
3. **Retry com Delay**: Tentar novamente após rate limit com delay progressivo
4. **Limpeza de Cache**: Limpar cache quando necessário para forçar atualização

## Como Testar

1. **Login no Meta Ads**: Conectar conta do Facebook
2. **Selecionar Cliente**: Escolher um cliente
3. **Selecionar Produto**: Escolher uma campanha do Meta Ads
4. **Verificar Públicos**: Os conjuntos de anúncios devem aparecer na aba público
5. **Testar Rate Limit**: Se houver rate limit, o sistema deve usar dados em cache
6. **Testar Atualização**: Clicar em "Tentar Novamente" deve forçar atualização

## Monitoramento

### Logs Importantes
- `Campaign ID do localStorage`: Verificar se o ID está sendo salvo corretamente
- `Permissões do usuário`: Verificar se o token tem as permissões necessárias
- `Ad Sets retornados`: Verificar quantos Ad Sets foram encontrados
- `Públicos convertidos`: Verificar se a conversão está funcionando

### Indicadores de Sucesso
- Conjuntos de anúncios aparecem na lista
- Status dos Ad Sets é exibido corretamente (Ativo/Pausado)
- Dados em cache são usados quando necessário
- Botão "Tentar Novamente" funciona corretamente

## Próximos Passos

1. **Monitorar logs** para identificar padrões de erro
2. **Ajustar timeouts** se necessário
3. **Implementar métricas** de sucesso/falha das requisições
4. **Considerar implementar** retry automático para erros específicos 