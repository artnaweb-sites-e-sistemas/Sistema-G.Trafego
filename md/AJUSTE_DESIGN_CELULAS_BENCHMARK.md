# Ajuste de Design das Células Benchmark/Projeção

## Objetivo
Corrigir o design das células editáveis da coluna "Benchmark/Projeção" para ficar consistente com as outras células da tabela.

## Problemas Identificados

1. **Fundo Inconsistente**: Células editáveis estavam com fundo mais claro (`bg-slate-700/60`) que as outras células
2. **Bordas Inconsistentes**: Bordas esquerdas não seguiam o mesmo padrão visual
3. **Estados Visuais Confusos**: Não havia diferenciação clara entre modo automático e manual
4. **Bordas Laterais Diferentes**: Células editáveis tinham bordas laterais diferentes entre si
5. **Cores de Borda Variadas**: Diferentes opacidades e tons de roxo causavam inconsistência visual
6. **Texto "Projeção" Ausente**: Células editáveis não tinham o texto "Projeção" como as não editáveis
7. **Ícone Inadequado**: Células editáveis usavam ícone de gráfico em vez de caneta
8. **Ícone Inconsistente**: Célula "Vendas" usava ícone Download em vez de caneta para indicar editabilidade
9. **Ícones Desnecessários**: Ícones ao lado das palavras "Auto" e "Projeção" causavam poluição visual
10. **Texto Inadequado**: "Auto" não era descritivo o suficiente para indicar sincronização automática
11. **Ícone de Hover Redundante**: Ícone de edição no hover das células editáveis era redundante com o botão toggle (em ambas as colunas)
12. **Comportamento Inconsistente**: Botão toggle não ativava o modo de edição como o clique na célula

## Soluções Implementadas

### 1. Fundo Consistente
- **Modo Automático**: `bg-slate-800/40` (mesmo fundo das células não editáveis)
- **Modo Manual**: `bg-slate-700/60` (fundo mais claro para indicar edição manual)
- **Durante Edição**: `bg-indigo-900/40` (fundo destacado durante edição)

### 2. Bordas Esquerdas Unificadas e Simplificadas
- **Todas as Células**: `border-l-4 border-purple-400` (borda roxa sólida consistente)
- **Sem Variações**: Removidas todas as variações de opacidade e tons
- **Simplicidade Visual**: Uma única cor de borda para toda a coluna

### 3. Estados Visuais Claros
- **Automático**: Fundo escuro, borda roxa sólida
- **Manual**: Fundo mais claro, borda roxa sólida
- **Editando**: Fundo roxo, borda roxa sólida

### 4. Texto "Projeção" Consistente
- **Células Não Editáveis**: Exibem o texto "Projeção" sem ícones desnecessários
- **Células Editáveis**: Apenas o botão toggle com ícone de caneta (sem texto "Projeção")
- **Layout Unificado**: Estrutura visual consistente em toda a coluna

### 5. Ícones Apropriados
- **Células Editáveis**: Apenas botão toggle com ícone de caneta (Edit3) quando em modo automático (para indicar editabilidade)
- **Células Não Editáveis**: Texto "Projeção" para indicar projeção (sem ícones)
- **Toggle Button**: Ícone Edit3 quando automático (indica que pode ser editado), TrendingUp quando manual (indica que está usando IA)
- **Célula Vendas**: Ícone Edit3 (caneta) em ambos os modos para indicar editabilidade, mantendo cores azul/verde
- **Célula Agendamentos**: Ícone Edit3 (caneta) em ambos os modos para indicar editabilidade, mantendo cores azul/verde

### 6. Texto Descritivo
- **Valores Reais**: "Sincronizado" em vez de "Auto" para indicar sincronização automática
- **Benchmark/Projeção**: Mantém "Projeção" para indicar valores projetados
- **Simplicidade Visual**: Removidos ícones desnecessários ao lado dos textos

### 7. Layout Limpo
- **Removido Ícone de Hover**: Eliminado ícone de edição que aparecia no hover das células editáveis (em ambas as colunas)
- **Botão Toggle Suficiente**: O botão toggle já indica claramente a editabilidade da célula
- **Interface Mais Limpa**: Redução de elementos visuais redundantes

### 8. Comportamento Consistente
- **Botão Toggle Funcional**: Agora ativa o modo de edição quando clicado (mesmo comportamento do clique na célula)
- **UX Unificada**: Tanto o clique na célula quanto no botão toggle ativam a edição
- **Feedback Visual**: Mantém os ícones e cores para indicar o estado automático/manual
- **Células Editáveis**: Vendas, Agendamentos e Benchmark/Projeção têm comportamento unificado
- **Ticket Médio (Bench)**: Botão toggle visível com ícone Edit3, ativa edição quando clicado

## Código Implementado

### Classes CSS Aplicadas
```tsx
className={`p-5 relative group w-1/5 text-left border-r border-slate-600/50 border-l-4 border-purple-400 ${
  row.benchmarkEditable 
    ? editingCell?.rowIndex === globalIndex && editingCell?.field === 'benchmark'
      ? 'bg-indigo-900/40 cursor-pointer transition-all duration-200 shadow-sm'
      : getBenchmarkAutoState(row.metric)
        ? 'bg-slate-800/40 cursor-pointer hover:bg-slate-800/60 transition-all duration-200'
        : 'bg-slate-700/60 cursor-pointer hover:bg-slate-700/80 transition-all duration-200'
    : 'bg-slate-800/40'
}`}
```

### Estrutura das Células Editáveis
```tsx
<div className="flex items-center space-x-2">
  <button className="...">
    {/* Toggle button com TrendingUp (automático) ou Edit3 (manual) */}
  </button>
</div>
```

### Estrutura do Ticket Médio (Bench)
```tsx
<div className="flex items-center space-x-2">
  <span className="text-slate-100 font-bold text-xl">
    {formatCurrency(ticketMedio)}
  </span>
  <button className="...">
    {/* Toggle button com ícone Edit3 */}
  </button>
</div>
```

### Estados Visuais

#### Modo Automático (Usando IA)
- **Fundo**: `bg-slate-800/40` (escuro, igual às outras células)
- **Borda**: `border-purple-400` (roxa sólida, consistente)
- **Hover**: `hover:bg-slate-800/60` (fundo mais claro no hover)
- **Indicador**: Toggle Edit3

#### Modo Manual (Editando)
- **Fundo**: `bg-slate-700/60` (mais claro, indica edição)
- **Borda**: `border-purple-400` (roxa sólida, consistente)
- **Hover**: `hover:bg-slate-700/80` (fundo ainda mais claro)
- **Indicador**: Toggle TrendingUp

#### Durante Edição
- **Fundo**: `bg-indigo-900/40` (roxo destacado)
- **Borda**: `border-purple-400` (roxa sólida, consistente)
- **Sombra**: `shadow-sm` (destaque adicional)

#### Células Não Editáveis
- **Fundo**: `bg-slate-800/40` (escuro)
- **Borda**: `border-purple-400` (roxa sólida, consistente)
- **Indicador**: Texto "Projeção"

## Benefícios

1. **Consistência Visual**: Células editáveis agora têm o mesmo fundo das outras células
2. **Bordas Unificadas**: Todas as células da coluna têm a mesma borda lateral esquerda
3. **Simplicidade**: Uma única cor de borda elimina confusão visual
4. **Texto Consistente**: Células não editáveis exibem texto descritivo, células editáveis apenas o botão toggle (removidos ícones desnecessários)
5. **Ícones Intuitivos**: Caneta no botão toggle quando automático (indica editabilidade) - consistente em ambas as colunas
6. **Texto Descritivo**: "Sincronizado" é mais claro que "Auto" para indicar sincronização automática
7. **Layout Limpo**: Removido ícone de hover redundante em ambas as colunas, mantendo apenas o botão toggle funcional
8. **Comportamento Unificado**: Botão toggle agora ativa a edição como o clique na célula (em todas as células editáveis)
9. **Ticket Médio Consistente**: Campo "Ticket Médio (Bench)" agora tem botão toggle visível como as outras células editáveis

## Comparação com Células "Valores Reais"

| Aspecto | Valores Reais | Benchmark/Projeção |
|---------|---------------|-------------------|
| **Fundo Automático** | `bg-slate-800/40` | `bg-slate-800/40` ✅ |
| **Fundo Manual** | `bg-slate-700/60` | `bg-slate-700/60` ✅ |
| **Borda Automático** | `border-blue-500/30` | `border-purple-400` |
| **Borda Manual** | `border-emerald-400/60` | `border-purple-400` |
| **Texto Indicador** | "Sincronizado" | "Projeção" ✅ |
| **Ícone Editável** | Edit3 | Toggle Edit3 ✅ |
| **Cor Toggle** | Azul/Verde | Roxo |

## Data de Implementação
Janeiro 2025 