# Correção do Erro de Inicialização do benchmarkAuto

## Problema Identificado
Erro de referência ao tentar acessar `benchmarkAuto` antes da inicialização:
```
Uncaught ReferenceError: Cannot access 'benchmarkAuto' before initialization
    at MonthlyDetailsTable (MonthlyDetailsTable.tsx:142:27)
```

## Causa do Erro
O estado `benchmarkAuto` estava sendo declarado depois de ser usado em funções como `loadBenchmarkValues`, causando um erro de temporal dead zone. A função `setBenchmarkAuto` estava sendo chamada antes da declaração do estado.

## Solução Implementada

### Antes (Causava Erro)
```tsx
const MonthlyDetailsTable = ({ ... }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tooltipStates, setTooltipStates] = useState({});

  // ❌ ERRO: benchmarkAuto usado aqui antes de ser declarado
  const loadBenchmarkValues = () => {
    // ...
    setBenchmarkAuto(autoStates); // ❌ benchmarkAuto não existe ainda
  };

  // ... outras funções ...

  // Estado declarado muito depois
  const [benchmarkAuto, setBenchmarkAuto] = useState({...});
};
```

### Depois (Corrigido)
```tsx
const MonthlyDetailsTable = ({ ... }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tooltipStates, setTooltipStates] = useState({});

  // ✅ CORRETO: Estados declarados no início
  const [salesAuto, setSalesAuto] = useState(true);
  const [benchmarkAuto, setBenchmarkAuto] = useState({
    investimento: true,
    cpm: true,
    cpc: true,
    ctr: true,
    txMensagens: true,
    txAgendamento: true,
    txConversaoVendas: true
  });

  // ✅ CORRETO: Agora benchmarkAuto já existe
  const loadBenchmarkValues = () => {
    // ...
    setBenchmarkAuto(autoStates); // ✅ benchmarkAuto já foi declarado
  };
};
```

## Mudanças Realizadas

1. **Reorganização de Estados**: Movidos todos os estados para o início do componente
2. **Ordem Correta**: Estados declarados antes de qualquer função que os use
3. **Eliminação de Duplicação**: Removidas declarações duplicadas de estados

## Benefícios da Correção

1. **Eliminação do Erro**: O erro de referência foi completamente resolvido
2. **Funcionalidade Preservada**: Toda a lógica de toggle automático/manual continua funcionando
3. **Código Mais Limpo**: Estados organizados no início do componente
4. **Melhor Manutenibilidade**: Estrutura mais clara e previsível

## Lições Aprendidas

1. **Ordem de Declaração**: Sempre declarar estados no início do componente
2. **Temporal Dead Zone**: Variáveis `const` e `let` não podem ser acessadas antes da declaração
3. **Organização de Código**: Estados devem vir antes de funções que os utilizam
4. **Debugging**: Erros de "before initialization" indicam problemas de ordem de declaração

## Data da Correção
Janeiro 2025 