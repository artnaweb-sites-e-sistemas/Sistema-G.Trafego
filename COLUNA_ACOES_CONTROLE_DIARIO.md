# Coluna "AÇÕES" - Controle Diário

## Visão Geral

A coluna "AÇÕES" no controle diário mostra o **status de atividade** de cada dia, indicando se houve ou não investimento em anúncios naquele período.

## Lógica de Funcionamento

### 🟢 "Ativo" (Verde)
- **Condição**: `metric.investment > 0`
- **Significado**: Houve investimento em anúncios neste dia
- **Indicador Visual**: Badge verde com borda verde
- **Classe CSS**: `bg-green-900 text-green-400 border border-green-700`

### 🔴 "Inativo" (Vermelho)
- **Condição**: `metric.investment === 0` ou `metric.investment <= 0`
- **Significado**: Não houve investimento em anúncios neste dia
- **Indicador Visual**: Badge vermelho com borda vermelha
- **Classe CSS**: `bg-red-900 text-red-400 border border-red-700`

## Implementação Técnica

### Código da Lógica
```tsx
// Lógica principal
status: metric.investment > 0 ? 'Ativo' : 'Inativo'

// Renderização visual
<span className={`px-2 py-1 rounded-full text-xs ${
  row.status === 'Ativo' 
    ? 'bg-green-900 text-green-400 border border-green-700' 
    : 'bg-red-900 text-red-400 border border-red-700'
}`}>
  {row.status}
</span>
```

### Fluxo de Dados

#### 1. Geração de Dados Base
```tsx
// Todos os dias começam como "Inativo"
data.push({
  date: `${dayStr}/${monthStr}/${yearStr}`,
  investment: formatCurrency(0),
  // ... outras métricas
  status: 'Inativo' // Status padrão
});
```

#### 2. Aplicação de Dados Reais
```tsx
// Quando há dados do Meta Ads/Firebase
metrics.forEach(metric => {
  // ... outras métricas
  status: metric.investment > 0 ? 'Ativo' : 'Inativo'
});
```

#### 3. Dados de Exemplo (Fallback)
```tsx
// Se não há dados reais, adiciona exemplo
if (metrics.length === 0) {
  data[16].investment = formatCurrency(1.74);
  data[16].status = 'Ativo'; // Dia 17 fica ativo como exemplo
}
```

## Cenários de Uso

### Cenário 1: Dia com Investimento
- **Investimento**: R$ 150,00
- **Status**: 🟢 "Ativo"
- **Significado**: Anúncios estavam rodando neste dia

### Cenário 2: Dia sem Investimento
- **Investimento**: R$ 0,00
- **Status**: 🔴 "Inativo"
- **Significado**: Anúncios pausados ou sem atividade

### Cenário 3: Dia com Dados Parciais
- **Investimento**: R$ 0,00
- **Impressões**: 0
- **Clicks**: 0
- **Status**: 🔴 "Inativo"
- **Significado**: Campanha não estava ativa

## Interpretação dos Status

### 🟢 "Ativo" - O que significa:
1. **Campanha Rodando**: Anúncios estavam ativos neste dia
2. **Investimento Realizado**: Houve gasto com publicidade
3. **Dados Disponíveis**: Métricas foram coletadas
4. **Performance Mensurável**: CTR, CPM, leads podem ser analisados

### 🔴 "Inativo" - O que significa:
1. **Campanha Pausada**: Anúncios não estavam rodando
2. **Sem Investimento**: Não houve gasto com publicidade
3. **Dados Limitados**: Apenas dados básicos disponíveis
4. **Performance Zero**: Métricas zeradas ou nulas

## Casos Especiais

### 1. Dados de Exemplo (Dia 17)
- **Quando**: Apenas quando não há dados reais do Meta Ads
- **Status**: 🟢 "Ativo" (forçado para demonstração)
- **Investimento**: R$ 1,74 (valor de exemplo)

### 2. Dados do Meta Ads
- **Fonte**: Sincronização automática com Facebook Ads
- **Lógica**: Baseada no investimento real da campanha
- **Atualização**: Automática quando há sincronização

### 3. Dados do Firebase
- **Fonte**: Banco de dados local
- **Lógica**: Baseada no investimento salvo
- **Atualização**: Manual ou via sincronização

## Benefícios da Implementação

### ✅ Visibilidade Rápida
- Identificação imediata de dias ativos/inativos
- Não precisa analisar valores individuais

### ✅ Análise de Performance
- Fácil identificação de padrões de atividade
- Detecção de gaps na campanha

### ✅ Tomada de Decisão
- Identificação de dias sem investimento
- Planejamento de otimizações

### ✅ Relatórios
- Resumo visual da atividade da campanha
- Facilita apresentações e análises

## Exemplos Práticos

### Exemplo 1: Campanha Contínua
```
01/07 - 🟢 Ativo (R$ 200,00)
02/07 - 🟢 Ativo (R$ 180,00)
03/07 - 🔴 Inativo (R$ 0,00) ← Pausa
04/07 - 🟢 Ativo (R$ 220,00)
```

### Exemplo 2: Campanha Intermitente
```
01/07 - 🟢 Ativo (R$ 150,00)
02/07 - 🔴 Inativo (R$ 0,00)
03/07 - 🔴 Inativo (R$ 0,00)
04/07 - 🟢 Ativo (R$ 300,00)
```

### Exemplo 3: Campanha Inativa
```
01/07 - 🔴 Inativo (R$ 0,00)
02/07 - 🔴 Inativo (R$ 0,00)
03/07 - 🔴 Inativo (R$ 0,00)
04/07 - 🔴 Inativo (R$ 0,00)
```

## Considerações Técnicas

### Performance
- Cálculo simples e eficiente
- Não impacta a performance da tabela
- Atualização automática com dados

### Manutenibilidade
- Lógica clara e documentada
- Fácil de modificar ou expandir
- Testes simples de implementar

### Escalabilidade
- Funciona com qualquer volume de dados
- Suporta múltiplas campanhas
- Adaptável para outros períodos

## Próximos Passos Sugeridos

1. **Tooltips**: Adicionar tooltips explicativos nos status
2. **Filtros**: Permitir filtrar por dias ativos/inativos
3. **Alertas**: Notificar quando há muitos dias inativos
4. **Análise**: Mostrar tendências de atividade
5. **Exportação**: Incluir status em relatórios exportados 