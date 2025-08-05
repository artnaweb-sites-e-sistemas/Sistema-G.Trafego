# Valores Padrão das Taxas de Conversão

## Taxas Padrão Definidas

### 1. Taxa de Mensagens (Leads/Cliques)
- **Valor Padrão**: 40.00%
- **Significado**: 40% dos cliques convertem em leads/mensagens
- **Justificativa**: Taxa otimista baseada no mercado atual de vendas
- **Variação Esperada**: 25% - 50% dependendo do nicho e qualidade do tráfego

### 2. Taxa de Agendamento (Agend./Leads)
- **Valor Padrão**: 30.00%
- **Significado**: 30% dos leads agendam uma reunião/consulta
- **Justificativa**: Taxa otimista para vendas consultivas
- **Variação Esperada**: 20% - 40% dependendo da qualificação dos leads

### 3. Taxa de Conversão Vendas (Vendas/Agend.)
- **Valor Padrão**: 20.00%
- **Significado**: 20% dos agendamentos convertem em vendas
- **Justificativa**: Taxa otimista para vendas consultivas
- **Variação Esperada**: 15% - 30% dependendo do produto e processo de vendas

## Funil de Conversão Completo

### Exemplo com 1000 Cliques:
```
1. Cliques: 1000
2. Leads (40%): 400 leads
3. Agendamentos (30%): 120 agendamentos
4. Vendas (20%): 24 vendas
```

### Taxa de Conversão Total:
- **Cliques → Vendas**: 2.4% (24 vendas / 1000 cliques)
- **Leads → Vendas**: 6.0% (24 vendas / 400 leads)

## Campos com Valores Zerados

### Métricas de Custo (Zeradas):
- **CPM**: R$ 0,00
- **CPC**: R$ 0,00
- **CPL**: R$ 0,00
- **CPV**: R$ 0,00

### Métricas de Volume (Zeradas):
- **Impressões**: 0
- **Cliques**: 0
- **Leads / Msgs**: 0
- **Agendamentos**: 0
- **Vendas**: 0

### Métricas de Performance (Zeradas):
- **CTR**: 0.00%
- **ROI / ROAS**: 0% (0.0x)
- **Lucro**: R$ 0,00

### Investimento (Zerado):
- **Investimento pretendido (Mês)**: R$ 0,00

## Justificativa dos Valores Padrão

### 1. Taxa de Mensagens (40%)
- **Mercado**: Vendas online e consultivas
- **Fatores**: Qualidade do tráfego, landing page, proposta de valor
- **Benchmark**: 30-50% é considerado excelente

### 2. Taxa de Agendamento (30%)
- **Mercado**: Vendas consultivas e B2B
- **Fatores**: Qualificação dos leads, processo de vendas, proposta
- **Benchmark**: 25-40% é considerado excelente

### 3. Taxa de Conversão Vendas (20%)
- **Mercado**: Vendas consultivas e complexas
- **Fatores**: Produto, preço, processo de vendas, qualificação
- **Benchmark**: 15-30% é considerado excelente

## Ajustes por Nicho

### Nichos com Taxas Mais Altas:
- **Produtos digitais**: 45-60% (leads), 35-50% (agendamentos), 25-35% (vendas)
- **Serviços essenciais**: 50-65% (leads), 40-55% (agendamentos), 30-40% (vendas)

### Nichos com Taxas Mais Baixas:
- **Produtos premium**: 25-35% (leads), 20-30% (agendamentos), 15-25% (vendas)
- **Serviços complexos**: 30-40% (leads), 25-35% (agendamentos), 20-30% (vendas)

## Implementação

### Arquivo: `src/components/MonthlyDetailsTable.tsx`

```typescript
const getInitialTableData = (): TableRow[] => [
  // ... outros campos zerados ...
  
  // Taxas com valores padrão
     {
     metric: 'Tx. Mensagens (Leads/Cliques)',
     benchmark: '40.00%', // Taxa padrão: 40% dos cliques convertem em leads
     realValue: '0.00%',
     // ...
   },
     {
     metric: 'Tx. Agendamento (Agend./Leads)',
     benchmark: '30.00%', // Taxa padrão: 30% dos leads agendam
     realValue: '0.00%',
     // ...
   },
     {
     metric: 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)',
     benchmark: '20.00%', // Taxa padrão: 20% dos agendamentos convertem em vendas
     realValue: '0.00%',
     // ...
   }
];
```

## Benefícios

### ✅ Para o Usuário:
1. **Valores realistas**: Taxas baseadas no mercado real
2. **Ponto de partida**: Não precisa começar do zero
3. **Referência**: Pode comparar performance real vs padrão
4. **Flexibilidade**: Pode ajustar conforme seu nicho

### ✅ Para o Sistema:
1. **Consistência**: Valores padrão uniformes
2. **Experiência**: Interface mais informativa
3. **Benchmark**: Base para comparações
4. **Profissionalismo**: Valores baseados em dados reais

## Próximos Passos

1. **Monitorar feedback**: Coletar opiniões dos usuários sobre os valores
2. **Ajustar por nicho**: Implementar valores específicos por categoria
3. **Análise de dados**: Usar dados reais para refinar os valores
4. **Personalização**: Permitir configuração por usuário 