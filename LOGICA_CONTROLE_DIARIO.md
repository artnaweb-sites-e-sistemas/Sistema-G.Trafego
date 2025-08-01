# Lógica do Controle Diário com Meta Ads

## Visão Geral

O sistema agora implementa a lógica solicitada onde **as métricas do controle diário são aplicadas com base no anúncio selecionado do Meta Ads**, e esses valores são atualizados automaticamente uma vez identificado o anúncio.

## Como Funciona

### 1. Seleção de Anúncio
- **Componente**: `AdCampaignPicker` no Header
- **Funcionalidade**: Permite selecionar campanhas/anúncios específicos da conta do Meta Ads
- **Integração**: Conecta diretamente com a API do Facebook para buscar campanhas disponíveis

### 2. Sincronização Automática
- **Trigger**: Quando um anúncio é selecionado, os dados são automaticamente sincronizados
- **Fonte**: API do Meta Ads (Facebook Graph API)
- **Dados**: Métricas diárias específicas da campanha selecionada

### 3. Atualização do Controle Diário
- **Componente**: `DailyControlTable`
- **Dados**: Exibe métricas específicas do anúncio selecionado
- **Indicador**: Mostra qual anúncio está sendo exibido

## Fluxo de Dados

```
1. Usuário seleciona anúncio no AdCampaignPicker
   ↓
2. App.tsx atualiza estado selectedCampaign
   ↓
3. useEffect dispara nova busca de métricas
   ↓
4. metricsService.getMetrics() chama metaAdsService.syncMetrics()
   ↓
5. API do Facebook retorna dados específicos da campanha
   ↓
6. Dados são convertidos e exibidos no DailyControlTable
```

## Componentes Principais

### AdCampaignPicker
- **Arquivo**: `src/components/AdCampaignPicker.tsx`
- **Função**: Seletor de campanhas do Meta Ads
- **Estado**: Lista campanhas disponíveis da conta conectada

### MetaAdsService
- **Arquivo**: `src/services/metaAdsService.ts`
- **Métodos Adicionados**:
  - `getCampaignInsights()`: Busca dados específicos de uma campanha
  - `syncMetrics()`: Agora aceita `campaignId` opcional

### MetricsService
- **Arquivo**: `src/services/metricsService.ts`
- **Atualização**: `getMetrics()` e `syncMetaAdsData()` agora aceitam `campaignId`

### DailyControlTable
- **Arquivo**: `src/components/DailyControlTable.tsx`
- **Melhoria**: Exibe indicador do anúncio selecionado
- **Dados**: Mostra métricas específicas da campanha

## Configuração Necessária

### 1. Meta Ads Conectado
- Usuário deve fazer login com Facebook
- Conta de anúncios deve estar selecionada
- Permissões: `ads_read`, `ads_management`

### 2. Campanha Selecionada
- Sistema carrega automaticamente campanhas disponíveis
- Primeira campanha é selecionada por padrão
- Usuário pode trocar de campanha a qualquer momento

## Benefícios da Implementação

### ✅ Dados Específicos
- Métricas refletem apenas o anúncio selecionado
- Não há mistura de dados de diferentes campanhas

### ✅ Atualização Automática
- Dados são sincronizados automaticamente
- Não requer intervenção manual

### ✅ Interface Intuitiva
- Seletor visual de campanhas
- Indicador claro de qual anúncio está sendo exibido

### ✅ Escalabilidade
- Suporta múltiplas campanhas
- Fácil adição de novos anúncios

## Exemplo de Uso

1. **Conectar Meta Ads**: Usuário clica no botão Meta Ads no Header
2. **Selecionar Conta**: Escolhe a conta de anúncios desejada
3. **Selecionar Campanha**: Usa o AdCampaignPicker para escolher o anúncio
4. **Visualizar Dados**: Controle diário mostra métricas específicas da campanha
5. **Sincronizar**: Dados são atualizados automaticamente do Meta Ads

## Tratamento de Erros

- **Sem Conexão**: Sistema usa dados mockados como fallback
- **API Indisponível**: Mensagens de erro claras para o usuário
- **Permissões**: Verificação de permissões antes de sincronizar
- **Dados Vazios**: Indicadores visuais quando não há dados

## Próximos Passos Sugeridos

1. **Cache de Dados**: Implementar cache para melhor performance
2. **Múltiplas Campanhas**: Permitir seleção de múltiplas campanhas
3. **Comparação**: Adicionar funcionalidade de comparação entre campanhas
4. **Alertas**: Sistema de alertas para mudanças significativas nas métricas
5. **Exportação**: Exportar dados específicos da campanha selecionada 