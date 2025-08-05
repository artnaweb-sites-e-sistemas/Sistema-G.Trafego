# Documentação: Dados Vinculados por Período

## Como Funciona o Sistema

O sistema já está implementado corretamente para vincular os dados de "Agendamentos" e "Vendas" ao período selecionado. Aqui está como funciona:

### 1. Salvamento de Dados

**Local**: Seção "Detalhes do Público" (`AudienceDetailsTable.tsx`)

**Como funciona**:
- Quando você edita e salva os campos "Agendamentos Realizados" ou "Vendas Realizadas"
- Os dados são salvos no Firebase com o período atual (`selectedMonth`)
- O documento é criado com ID único: `${month}_${product}_${audience}`

**Código relevante**:
```typescript
// Em AudienceDetailsTable.tsx - linha ~272
await metricsService.saveAudienceDetails({
  month: selectedMonth,        // ✅ Período atual
  product: selectedProduct,    // ✅ Produto selecionado
  audience: selectedAudience,  // ✅ Público selecionado
  agendamentos: newValue,      // ✅ Valor editado
  vendas: details.vendas,      // ✅ Valor atual
  vendasAuto: vendasAuto,      // ✅ Modo (automático/manual)
  manualVendasValue: newManualVendasValue, // ✅ Valor manual
  ticketMedio: 250
});
```

### 2. Carregamento de Dados

**Local**: Tabela "Detalhes Mensais" (`MonthlyDetailsTable.tsx`)

**Como funciona**:
- Quando você seleciona um período, o sistema busca todos os dados salvos para aquele período
- Soma os valores de "Agendamentos" e "Vendas" de todos os públicos do produto
- Exibe os valores na tabela "Detalhes Mensais"

**Código relevante**:
```typescript
// Em MonthlyDetailsTable.tsx - linha ~590
const loadAudienceData = async () => {
  if (selectedProduct && selectedMonth) {
    // ✅ Busca dados do período específico
    const allAudienceDetails = await metricsService.getAllAudienceDetailsForProduct(selectedMonth, selectedProduct);
    
    // ✅ Soma os valores de todos os públicos
    const totalAgendamentos = allAudienceDetails.reduce((sum, detail) => {
      const agendamentos = detail.agendamentos || 0;
      return sum + agendamentos;
    }, 0);
    
    const totalVendas = allAudienceDetails.reduce((sum, detail) => {
      const vendas = detail.vendas || 0;
      return sum + vendas;
    }, 0);
    
    // ✅ Atualiza a tabela com os valores do período
    setAudienceCalculatedValues({
      agendamentos: totalAgendamentos,
      vendas: totalVendas
    });
  }
};
```

### 3. Estrutura do Banco de Dados

**Coleção**: `audienceDetails`

**Documento**: `${month}_${product}_${audience}`

**Exemplo**:
```
Documento: "Maio 2025_Produto A_Público Jovens"
{
  month: "Maio 2025",
  product: "Produto A", 
  audience: "Público Jovens",
  agendamentos: 15,
  vendas: 8,
  vendasAuto: true,
  manualVendasValue: 0,
  ticketMedio: 250,
  createdAt: "2025-01-15T10:30:00Z",
  updatedAt: "2025-01-15T10:30:00Z"
}
```

## Cenários de Uso

### Cenário 1: Salvar Dados em Maio
1. Selecionar período: "Maio 2025"
2. Selecionar produto: "Produto A"
3. Selecionar público: "Público Jovens"
4. Editar "Agendamentos Realizados": 15
5. Salvar → Dados salvos com período "Maio 2025"

### Cenário 2: Mudar para Junho
1. Selecionar período: "Junho 2025"
2. Selecionar produto: "Produto A"
3. Selecionar público: "Público Jovens"
4. Resultado: Campos zerados (não há dados salvos para Junho)

### Cenário 3: Voltar para Maio
1. Selecionar período: "Maio 2025"
2. Selecionar produto: "Produto A"
3. Resultado: Campos mostram valores salvos (15 agendamentos)

### Cenário 4: Tabela Detalhes Mensais
1. Selecionar período: "Maio 2025"
2. Selecionar produto: "Produto A"
3. Resultado: Tabela mostra soma de todos os públicos do produto no período

## Verificação do Sistema

### 1. Verificar Salvamento
```typescript
// No console do navegador
console.log('Dados salvos:', await metricsService.getAudienceDetails('Maio 2025', 'Produto A', 'Público Jovens'));
```

### 2. Verificar Carregamento
```typescript
// No console do navegador
console.log('Todos os dados do produto:', await metricsService.getAllAudienceDetailsForProduct('Maio 2025', 'Produto A'));
```

### 3. Verificar Firebase
- Abrir Firebase Console
- Ir para coleção `audienceDetails`
- Verificar documentos com formato: `Maio 2025_Produto A_Público Jovens`

## Logs de Debug

O sistema possui logs detalhados para debug:

```typescript
// Log ao salvar
console.log('🔍 DEBUG - AudienceDetailsTable - Salvando dados:', {
  month: selectedMonth,
  product: selectedProduct,
  audience: selectedAudience,
  agendamentos: newValue,
  vendas: details.vendas
});

// Log ao carregar
console.log('🔍 DEBUG - MonthlyDetailsTable - Dados calculados dos públicos (FINAL):', {
  totalAgendamentos,
  totalVendas,
  audienceCount: allAudienceDetails.length,
  publicos: allAudienceDetails.map(d => ({ 
    audience: d.audience, 
    agendamentos: d.agendamentos, 
    vendas: d.vendas 
  }))
});
```

## Conclusão

O sistema já está funcionando corretamente:

✅ **Dados salvos por período** - Cada edição é vinculada ao período selecionado
✅ **Carregamento correto** - Dados são carregados baseados no período atual
✅ **Valores zerados** - Quando não há dados para o período, campos ficam zerados
✅ **Soma automática** - Tabela "Detalhes Mensais" soma todos os públicos do produto
✅ **Persistência** - Dados são salvos no Firebase com estrutura adequada

O comportamento que você descreveu é exatamente o que está implementado e funcionando no sistema. 