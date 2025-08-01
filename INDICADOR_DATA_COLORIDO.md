# Indicador de Data Colorido - MonthYearPicker

## Visão Geral

Implementamos um sistema de cores no indicador de data que reflete o período selecionado em relação ao mês atual. O indicador muda de cor baseado na posição temporal do mês selecionado.

## Cores Implementadas

### 🟢 Verde - Mês Atual
- **Condição**: Mês selecionado é o mês atual
- **Significado**: Período em andamento
- **Classe CSS**: `bg-green-500 shadow-lg shadow-green-500/50`
- **Tooltip**: "Mês atual selecionado"

### 🟡 Amarelo - Mês Passado
- **Condição**: Mês selecionado é anterior ao mês atual
- **Significado**: Período histórico/concluído
- **Classe CSS**: `bg-yellow-500 shadow-lg shadow-yellow-500/50`
- **Tooltip**: "Mês passado selecionado"

### ⚫ Cinza - Mês Futuro
- **Condição**: Mês selecionado é posterior ao mês atual
- **Significado**: Período futuro/planejado
- **Classe CSS**: `bg-gray-500`
- **Tooltip**: "Mês futuro selecionado"

## Implementação Técnica

### Função de Determinação de Cor
```tsx
const getIndicatorColor = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // Criar data do mês selecionado
  const selectedDate = new Date(selectedYear, selectedMonthIndex);
  const currentMonthDate = new Date(currentYear, currentMonth);
  
  // Comparar meses
  if (selectedDate.getTime() === currentMonthDate.getTime()) {
    return 'bg-green-500 shadow-lg shadow-green-500/50'; // Mês atual - Verde
  } else if (selectedDate > currentMonthDate) {
    return 'bg-gray-500'; // Mês futuro - Cinza
  } else {
    return 'bg-yellow-500 shadow-lg shadow-yellow-500/50'; // Mês passado - Amarelo
  }
};
```

### Lógica de Comparação
- **Comparação Temporal**: Usa `getTime()` para comparar datas
- **Precisão Mensal**: Compara apenas ano e mês, ignorando dia
- **Atualização Automática**: Recalcula a cada mudança de seleção

### Tooltip Dinâmico
```tsx
title={(() => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const selectedDate = new Date(selectedYear, selectedMonthIndex);
  const currentMonthDate = new Date(currentYear, currentMonth);
  
  if (selectedDate.getTime() === currentMonthDate.getTime()) {
    return 'Mês atual selecionado';
  } else if (selectedDate > currentMonthDate) {
    return 'Mês futuro selecionado';
  } else {
    return 'Mês passado selecionado';
  }
})()}
```

## Exemplos de Uso

### Cenário 1: Mês Atual (Janeiro 2024)
- **Data Atual**: Janeiro 2024
- **Mês Selecionado**: Janeiro 2024
- **Indicador**: 🟢 Verde
- **Significado**: Visualizando dados do período atual

### Cenário 2: Mês Passado (Dezembro 2023)
- **Data Atual**: Janeiro 2024
- **Mês Selecionado**: Dezembro 2023
- **Indicador**: 🟡 Amarelo
- **Significado**: Visualizando dados históricos

### Cenário 3: Mês Futuro (Fevereiro 2024)
- **Data Atual**: Janeiro 2024
- **Mês Selecionado**: Fevereiro 2024
- **Indicador**: ⚫ Cinza
- **Significado**: Visualizando dados planejados/futuros

## Benefícios da Implementação

### ✅ Feedback Visual Intuitivo
- Usuário identifica rapidamente o período temporal
- Cores seguem convenções universais (verde=atual, amarelo=passado, cinza=futuro)

### ✅ Contexto Temporal
- Ajuda a entender se está visualizando dados atuais, históricos ou futuros
- Facilita a navegação entre períodos

### ✅ Acessibilidade
- Tooltips explicativos para cada estado
- Cores contrastantes e bem definidas
- Transições suaves entre mudanças

### ✅ Consistência Visual
- Mantém o padrão de indicadores do sistema
- Integra-se perfeitamente com outros componentes

## Casos de Uso

### 1. Análise de Performance
- **Verde**: Métricas em tempo real do mês atual
- **Amarelo**: Comparação com meses anteriores
- **Cinza**: Projeções e planejamento futuro

### 2. Relatórios
- **Verde**: Relatório do período atual
- **Amarelo**: Relatórios históricos
- **Cinza**: Relatórios projetados

### 3. Planejamento
- **Verde**: Ações em andamento
- **Amarelo**: Resultados de ações passadas
- **Cinza**: Planejamento de ações futuras

## Considerações Técnicas

### Performance
- Cálculo simples e eficiente
- Não impacta a performance da aplicação
- Atualização apenas quando necessário

### Manutenibilidade
- Função isolada e testável
- Lógica clara e documentada
- Fácil de modificar ou expandir

### Escalabilidade
- Suporta qualquer período temporal
- Pode ser facilmente adaptado para outras granularidades (semana, trimestre, ano)

## Próximos Passos Sugeridos

1. **Animações**: Adicionar animações suaves na mudança de cores
2. **Personalização**: Permitir customização de cores por usuário
3. **Granularidade**: Suportar outras unidades temporais (semana, trimestre)
4. **Histórico**: Mostrar histórico de mudanças de período
5. **Alertas**: Integrar com sistema de alertas baseado no período 