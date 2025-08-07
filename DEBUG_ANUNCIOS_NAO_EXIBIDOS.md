# Debug: Anúncios não exibidos na Performance Analytics

## Problema Identificado

O usuário reportou que os anúncios do Meta Ads não estão sendo exibidos na seção Performance Analytics, mesmo sendo encontrados pelo sistema. Os logs mostram:

```
Buscando anúncios do Meta Ads...
Anúncios encontrados: 7
Nenhum anúncio com dados válidos encontrado, usando dados mockados
```

## Análise do Problema

### Possíveis Causas

1. **Filtro muito restritivo**: O código estava filtrando apenas anúncios com `cpa > 0`, mas muitos anúncios podem ter CPA = 0
2. **Insights não encontrados**: Os insights dos adSets podem não estar sendo retornados corretamente
3. **Cálculo incorreto do CPA**: O CPA pode estar sendo calculado como 0 devido a conversões = 0
4. **Período incorreto**: O período selecionado pode não ter dados de insights

### Soluções Implementadas

#### 1. Logs Detalhados Adicionados

**PerformanceAdsSection.tsx:**
- Logs dos parâmetros de busca (período, cliente, produto, etc.)
- Logs do processamento de cada anúncio
- Logs dos insights encontrados
- Logs das métricas calculadas
- Logs do filtro de CPA

**metaAdsService.ts:**
- Logs da busca de insights por adSet
- Logs dos dados retornados pela API
- Logs das actions encontradas

#### 2. Filtro Temporariamente Relaxado

```typescript
// Antes: apenas anúncios com CPA > 0
const adsWithValidCPA = adsWithInsights.filter(ad => ad.metrics.cpa > 0);

// Depois: permitir anúncios com CPA >= 0 para debug
const adsWithValidCPA = adsWithInsights.filter(ad => ad.metrics.cpa >= 0);
```

#### 3. Estratégia de Fallback Dupla

**Busca de Insights:**
- Primeiro tenta buscar insights via adSet
- Se não encontrar, tenta buscar diretamente do anúncio
- Se ainda não encontrar, cria anúncio com dados básicos

**Dados Básicos:**
- Permite exibir anúncios mesmo sem insights
- Usa dados básicos do anúncio (nome, status, creative)
- Métricas zeradas mas anúncio visível

#### 4. Melhor Tratamento de Erros

- Logs detalhados em cada etapa do processo
- Identificação clara de onde o processo falha
- Fallback para dados mockados com explicação

## Próximos Passos

1. **Testar com logs**: Verificar os logs no console para identificar exatamente onde o processo falha
2. **Verificar insights**: Confirmar se os insights estão sendo retornados corretamente
3. **Ajustar filtros**: Modificar os filtros baseado nos dados reais encontrados
4. **Melhorar cálculo de CPA**: Considerar outras métricas quando conversões = 0

## Código Modificado

### PerformanceAdsSection.tsx
- Adicionados logs detalhados em `fetchRealAdsData()`
- Relaxado filtro de CPA temporariamente
- Implementada estratégia de fallback dupla (adSet → anúncio direto → dados básicos)
- Melhor tratamento de erros e fallbacks

### metaAdsService.ts
- Adicionados logs em `getAdSetInsights()`
- Novo método `getAdInsights()` para buscar insights diretamente dos anúncios
- Melhor debug de actions e conversões

## Status Atual

- ✅ Logs detalhados implementados
- ✅ Filtro relaxado para debug
- ✅ Estratégia de fallback dupla implementada
- ✅ Método alternativo de busca de insights
- ✅ Fallback para dados básicos sem insights
- 🔄 Aguardando testes com dados reais
- ⏳ Análise dos logs para identificar causa raiz

## Comandos para Teste

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Verificar logs no console do navegador
# Procurar por:
# - "Parâmetros de busca:"
# - "Anúncios encontrados:"
# - "Insights encontrados para anúncio"
# - "Métricas calculadas para anúncio"
# - "Anúncios com CPA válido"
``` 