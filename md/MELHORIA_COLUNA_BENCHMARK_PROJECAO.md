# Melhoria da Coluna Benchmark/Projeção

## Objetivo
Melhorar a UX/UI da coluna "Benchmark/Projeção" na planilha de detalhes mensais para ficar consistente com a coluna "Valores Reais" e permitir edição manual dos valores gerados pela IA.

## Implementações Realizadas

### 1. Visual Consistente com Valores Reais
- **Antes**: Células simples com apenas o valor
- **Depois**: Layout com flexbox contendo valor e indicador visual

### 2. Indicador Visual "Projeção"
- **Ícone**: TrendingUp (seta para cima) em cor roxa
- **Texto**: "Projeção" em vez de "Auto"
- **Cor**: Roxo (purple-400) para diferenciar do azul dos valores automáticos

### 3. Bordas Coloridas para Identificação
- **Células não editáveis**: Borda roxa à esquerda (border-purple-500/30)
- **Células editáveis**: Borda roxa ao fazer hover (border-indigo-400/60)
- **Durante edição**: Borda roxa sólida (border-indigo-400)

### 4. Funcionalidade de Edição
- **Células editáveis**: Podem ser clicadas para edição manual
- **Valores da IA**: Podem ser sobrescritos por valores manuais
- **Persistência**: Valores editados são salvos no localStorage
- **Recálculo**: Valores dependentes são recalculados automaticamente

### 5. Toggle Automático/Manual (NOVO)
- **Botão de Toggle**: Similar ao da célula "Vendas" da coluna "Valores Reais"
- **Modo Automático**: Usa valores da IA (ícone TrendingUp roxo)
- **Modo Manual**: Permite edição manual (ícone Edit3 roxo)
- **Persistência**: Estados são salvos no localStorage por produto/mês
- **UX Consistente**: Mesma experiência visual da coluna "Valores Reais"

## Código Implementado

### Estrutura da Célula com Toggle
```tsx
<div className="flex items-center justify-between w-full">
  <span className="text-base font-semibold text-slate-100">{row.benchmark}</span>
  <div className="flex items-center space-x-2">
    {!row.benchmarkEditable && (
      <div className="flex items-center space-x-1">
        <TrendingUp className="w-3 h-3 text-purple-400" />
        <span className="text-xs text-purple-400 font-medium">Projeção</span>
      </div>
    )}
    {row.benchmarkEditable && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleBenchmarkAuto(row.metric);
        }}
        className={`inline-flex items-center justify-center rounded-full p-1.5 transition-all duration-200 ${
          getBenchmarkAutoState(row.metric)
            ? 'bg-purple-900/40 hover:bg-purple-800/50 border border-purple-500/30' 
            : 'bg-indigo-900/40 hover:bg-indigo-800/50 border border-indigo-500/30'
        }`}
        title={getBenchmarkAutoState(row.metric) ? 'Usando valores da IA (clique para editar manualmente)' : 'Editando manualmente (clique para usar valores da IA)'}
      >
        {getBenchmarkAutoState(row.metric) ? <TrendingUp className="w-4 h-4 text-purple-400" /> : <Edit3 className="w-4 h-4 text-indigo-400" />}
      </button>
    )}
  </div>
</div>
```

### Estados de Controle
```tsx
const [benchmarkAuto, setBenchmarkAuto] = useState({
  investimento: true,
  cpm: true,
  cpc: true,
  ctr: true,
  txMensagens: true,
  txAgendamento: true,
  txConversaoVendas: true
});
```

### Classes CSS Aplicadas
- **Células não editáveis**: `bg-slate-800/40 border-l-4 border-purple-500/30`
- **Células editáveis**: `bg-slate-700/60 hover:bg-indigo-900/30 border-l-4 border-transparent hover:border-indigo-400/60`
- **Durante edição**: `bg-indigo-900/40 border-l-4 border-indigo-400 shadow-sm`
- **Toggle automático**: `bg-purple-900/40 hover:bg-purple-800/50 border border-purple-500/30`
- **Toggle manual**: `bg-indigo-900/40 hover:bg-indigo-800/50 border border-indigo-500/30`

## Benefícios

1. **Consistência Visual**: Mesma estrutura da coluna "Valores Reais"
2. **Identificação Clara**: Ícone e texto "Projeção" identificam valores da IA
3. **Flexibilidade**: Usuários podem editar valores da IA manualmente
4. **Persistência**: Valores editados são mantidos entre sessões
5. **Feedback Visual**: Hover e estados de edição bem definidos
6. **Controle Granular**: Cada campo pode ser controlado independentemente
7. **UX Familiar**: Interface consistente com a coluna "Valores Reais"

## Campos Editáveis na Coluna Benchmark/Projeção

### Com Toggle Automático/Manual
- **Investimento pretendido (Mês)**: Valor planejado para investimento
- **CPM**: Custo por mil impressões
- **CPC**: Custo por clique
- **CTR**: Taxa de cliques
- **Tx. Mensagens (Leads/Cliques)**: Taxa de conversão de cliques para leads
- **Tx. Agendamento (Agend./Leads)**: Taxa de conversão de leads para agendamentos
- **Tx. Conversão Vendas (Vendas/Leads ou Agend.)**: Taxa de conversão para vendas

### Com Indicador "Projeção" (Não Editáveis)
- **Impressões**: Calculado baseado no investimento e CPM
- **Cliques**: Calculado baseado nas impressões e CTR
- **Leads / Msgs**: Calculado baseado nos cliques e taxa de mensagens
- **Agendamentos**: Calculado baseado nos leads e taxa de agendamento
- **Vendas**: Calculado baseado nos agendamentos/leads e taxa de conversão
- **CPL, CPV, Lucro, ROI**: Calculados automaticamente baseados nos valores anteriores

## Funcionalidades do Toggle

### Modo Automático (Padrão)
- **Ícone**: TrendingUp roxo
- **Comportamento**: Usa valores da IA automaticamente
- **Atualização**: Valores são atualizados quando novos dados da IA chegam
- **Visual**: Fundo roxo claro com borda roxa

### Modo Manual
- **Ícone**: Edit3 roxo
- **Comportamento**: Preserva valores editados manualmente
- **Atualização**: Valores da IA não sobrescrevem edições manuais
- **Visual**: Fundo roxo escuro com borda roxa
- **Edição**: Célula pode ser clicada para edição direta

## Persistência de Dados

### Valores Editados
- **Storage Key**: `benchmark_{produto}_{mes}`
- **Formato**: JSON com métrica -> valor
- **Carregamento**: Automático ao mudar produto/mês

### Estados Automáticos
- **Storage Key**: `benchmark_auto_{produto}_{mes}`
- **Formato**: JSON com estado de cada campo
- **Carregamento**: Automático ao mudar produto/mês

## Data de Implementação
Janeiro 2025 