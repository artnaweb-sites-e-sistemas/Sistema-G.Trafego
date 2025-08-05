# Correção: Status Dinâmico na Coluna Status vs Benchmark

## Problema Identificado

A coluna "Status vs Benchmark" na tabela "Detalhes Mensais" estava exibindo textos estáticos que não refletiam a comparação real entre os valores reais e os benchmarks.

## Solução Implementada

### 1. Função de Cálculo de Status

**Arquivo**: `src/components/MonthlyDetailsTable.tsx`

**Função**: `calculateStatus(metric, realValue, benchmark)`

```typescript
const calculateStatus = (metric: string, realValue: string, benchmark: string): { status: string; statusColor: string } => {
  // Campos que não devem ter status (mantêm "-")
  const noStatusFields = [
    'Investimento pretendido (Mês)',
    'Impressões',
    'Cliques',
    'Leads / Msgs',
    'Agendamentos',
    'Vendas'
  ];

  if (noStatusFields.includes(metric)) {
    return { status: '', statusColor: 'neutral' };
  }

  // Extrair valores numéricos baseado no tipo de campo
  let realNum = 0;
  let benchmarkNum = 0;

  // Para valores monetários (CPM, CPC, CPL, CPV)
  if (metric.includes('CPM') || metric.includes('CPC') || metric.includes('CPL') || metric.includes('CPV')) {
    realNum = parseCurrency(realValue);
    benchmarkNum = parseCurrency(benchmark);
  }
  // Para porcentagens (CTR, Tx. Mensagens, Tx. Agendamento, Tx. Conversão Vendas, ROI)
  else if (metric.includes('CTR') || metric.includes('Tx.') || metric.includes('ROI')) {
    realNum = parseNumber(realValue.replace('%', '').replace('(', '').replace(')', '').replace('x', ''));
    benchmarkNum = parseNumber(benchmark.replace('%', '').replace('(', '').replace(')', '').replace('x', ''));
  }
  // Para outros valores numéricos
  else {
    realNum = parseNumber(realValue);
    benchmarkNum = parseNumber(benchmark);
  }

  // Calcular diferença percentual
  const difference = ((realNum - benchmarkNum) / benchmarkNum) * 100;

  // CORREÇÃO: Para custos (CPM, CPC, CPL, CPV), quanto mais baixo, melhor
  const isCostMetric = metric.includes('CPM') || metric.includes('CPC') || metric.includes('CPL') || metric.includes('CPV');
  
  // Se é métrica de custo, inverter a lógica (diferença negativa = bom)
  const effectiveDifference = isCostMetric ? -difference : difference;

  // Definir status baseado na diferença efetiva
  if (effectiveDifference >= 20) {
    return { status: 'Excelente (acima da meta)', statusColor: 'up' };
  } else if (effectiveDifference >= 10) {
    return { status: 'Bom (acima da meta)', statusColor: 'up' };
  } else if (effectiveDifference >= 5) {
    return { status: 'Levemente acima da meta', statusColor: 'up' };
  } else if (effectiveDifference >= -5) {
    return { status: 'Dentro da meta', statusColor: 'neutral' };
  } else if (effectiveDifference >= -10) {
    return { status: 'Levemente abaixo da meta', statusColor: 'down' };
  } else if (effectiveDifference >= -20) {
    return { status: 'Abaixo da meta', statusColor: 'down' };
  } else {
    return { status: 'Muito abaixo da meta', statusColor: 'down' };
  }
};
```

### 2. Campos Sem Status

Os seguintes campos **não exibem status** (mantêm "-"):

- **Investimento pretendido (Mês)** - Valor de entrada
- **Impressões** - Métrica bruta
- **Cliques** - Métrica bruta  
- **Leads / Msgs** - Métrica bruta
- **Agendamentos** - Métrica bruta
- **Vendas** - Métrica bruta

### 3. Campos Com Status Dinâmico

Os seguintes campos **exibem status dinâmico** baseado na comparação:

#### Valores Monetários (Lógica Invertida - Quanto mais baixo, melhor):
- **CPM** - Custo por mil impressões
- **CPC** - Custo por clique
- **CPL** - Custo por lead
- **CPV** - Custo por venda

#### Porcentagens (Lógica Normal - Quanto mais alto, melhor):
- **CTR** - Taxa de cliques
- **Tx. Mensagens (Leads/Cliques)** - Taxa de conversão de cliques em leads
- **Tx. Agendamento (Agend./Leads)** - Taxa de conversão de leads em agendamentos
- **Tx. Conversão Vendas (Vendas/Leads ou Agend.)** - Taxa de conversão em vendas
- **ROI / ROAS** - Retorno sobre investimento

### 4. Faixas de Status

#### Para Métricas de Performance (CTR, Taxas, ROI):
| Diferença | Status | Cor |
|-----------|--------|-----|
| ≥ +20% | Excelente (acima da meta) | Verde |
| ≥ +10% | Bom (acima da meta) | Verde |
| ≥ +5% | Levemente acima da meta | Verde |
| -5% a +5% | Dentro da meta | Amarelo |
| ≥ -10% | Levemente abaixo da meta | Vermelho |
| ≥ -20% | Abaixo da meta | Vermelho |
| < -20% | Muito abaixo da meta | Vermelho |

#### Para Métricas de Custo (CPM, CPC, CPL, CPV):
| Diferença | Status | Cor |
|-----------|--------|-----|
| ≤ -20% | Excelente (acima da meta) | Verde |
| ≤ -10% | Bom (acima da meta) | Verde |
| ≤ -5% | Levemente acima da meta | Verde |
| -5% a +5% | Dentro da meta | Amarelo |
| ≥ +10% | Levemente abaixo da meta | Vermelho |
| ≥ +20% | Abaixo da meta | Vermelho |
| > +20% | Muito abaixo da meta | Vermelho |

### 5. Cores e Ícones

- **Texto do Status**: Sem cor (text-slate-300)
- **Ícones Indicativos**: Com cores baseadas no status
  - Verde (text-green-500): Performance boa
  - Amarelo (text-yellow-500): Performance neutra
  - Vermelho (text-red-500): Performance ruim

### 6. Integração com Sincronização

O status é recalculado automaticamente em três momentos:

#### A. Sincronização com Meta Ads
```typescript
// Em useEffect de sincronização
const statusResult = calculateStatus(row.metric, newRow.realValue, newRow.benchmark);
newRow.status = statusResult.status;
newRow.statusColor = statusResult.statusColor;
```

#### B. Campanha Pausada (Sem Métricas)
```typescript
// Quando não há métricas, valores são zerados
const statusResult = calculateStatus(row.metric, newRow.realValue, newRow.benchmark);
newRow.status = statusResult.status;
newRow.statusColor = statusResult.statusColor;
```

#### C. Cálculo de Valores Dependentes
```typescript
// Na função calculateValues
const statusResult = calculateStatus(row.metric, newRow.realValue, newRow.benchmark);
newRow.status = statusResult.status;
newRow.statusColor = statusResult.statusColor;
```

### 7. Exemplos de Comportamento

#### Exemplo 1: CPM (Custo - Quanto mais baixo, melhor)
- **Benchmark**: R$ 50,00
- **Real**: R$ 40,00
- **Diferença**: -20%
- **Status**: "Excelente (acima da meta)" (Verde)

#### Exemplo 2: CTR (Performance - Quanto mais alto, melhor)
- **Benchmark**: 2,00%
- **Real**: 2,50%
- **Diferença**: +25%
- **Status**: "Excelente (acima da meta)" (Verde)

#### Exemplo 3: CPC (Custo - Quanto mais baixo, melhor)
- **Benchmark**: R$ 2,00
- **Real**: R$ 2,50
- **Diferença**: +25%
- **Status**: "Muito abaixo da meta" (Vermelho)

### 8. Resultado Esperado

Após essas correções:

✅ **Status dinâmico** - Textos baseados na comparação real vs benchmark
✅ **Lógica correta** - Custos: quanto mais baixo, melhor | Performance: quanto mais alto, melhor
✅ **Cores nos ícones** - Verde (bom), Amarelo (neutro), Vermelho (ruim)
✅ **Texto sem cor** - Status em texto neutro, cores apenas nos ícones
✅ **Campos sem status** - Mantêm "-" conforme especificado
✅ **Atualização automática** - Status recalculado quando valores mudam
✅ **Precisão** - Cálculos baseados em diferenças percentuais reais

### 9. Testes Recomendados

1. **Métricas de custo**: Verificar se valores mais baixos mostram status positivo
2. **Métricas de performance**: Verificar se valores mais altos mostram status positivo
3. **Cores dos ícones**: Verificar se aparecem verde, amarelo e vermelho
4. **Texto do status**: Verificar se aparece em cor neutra
5. **Atualização dinâmica**: Mudar valores e verificar se status atualiza
6. **Diferentes tipos**: Testar valores monetários, porcentagens e ROI 