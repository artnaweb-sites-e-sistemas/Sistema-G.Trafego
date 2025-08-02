# Indicadores Visuais - Status dos Componentes

## Visão Geral

Implementamos indicadores visuais consistentes em todos os componentes de seleção para mostrar o status de cada campo. Os indicadores seguem o padrão de **cinza quando inativo** e **verde quando ativo/selecionado**.

## Componentes com Indicadores

### 1. Notificação (Bell Icon)
- **Localização**: Header, seção de usuário
- **Comportamento**:
  - **Cinza**: Sem notificações
  - **Verde**: Há notificações ativas
- **Lógica**: Simula notificações quando há seleções específicas nos filtros

### 2. Seleção de Data (MonthYearPicker)
- **Localização**: Header, filtros
- **Comportamento**:
  - **Verde**: Sempre ativo (data sempre selecionada)
- **Indicador**: Mostra que o campo está sempre funcional

### 3. Seleção de Cliente (ClientPicker)
- **Localização**: Header, filtros
- **Comportamento**:
  - **Cinza**: "Todos os Clientes" selecionado
  - **Verde**: Cliente específico selecionado
- **Indicador**: Mostra quando um cliente específico está ativo

### 4. Seleção de Produto (ProductPicker)
- **Localização**: Header, filtros
- **Comportamento**:
  - **Cinza**: "Todos os Produtos" selecionado
  - **Verde**: Produto específico selecionado
- **Indicador**: Mostra quando um produto específico está ativo

### 5. Seleção de Público (AudiencePicker)
- **Localização**: Header, filtros
- **Comportamento**:
  - **Cinza**: "Todos os Públicos" selecionado
  - **Verde**: Público específico selecionado
- **Indicador**: Mostra quando um público específico está ativo

### 6. Seleção de Anúncio (AdCampaignPicker)
- **Localização**: Header, filtros
- **Comportamento**:
  - **Cinza**: Nenhum anúncio selecionado
  - **Verde**: Anúncio específico selecionado
- **Indicador**: Mostra quando um anúncio específico está ativo

### 7. Compartilhamento (ShareReport)
- **Localização**: Header, filtros
- **Comportamento**:
  - **Cinza**: Compartilhamento desabilitado (filtros genéricos)
  - **Verde**: Compartilhamento habilitado (filtros específicos)
- **Indicador**: Mostra quando o compartilhamento está disponível

## Implementação Técnica

### Estrutura do Indicador
```tsx
<div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 transition-all duration-200 ${
  isActive 
    ? 'bg-green-500 shadow-lg shadow-green-500/50' 
    : 'bg-gray-500'
}`}></div>
```

### Características Visuais
- **Posição**: Canto superior direito do componente
- **Tamanho**: 12px (w-3 h-3)
- **Formato**: Círculo com borda
- **Cores**:
  - **Inativo**: `bg-gray-500`
  - **Ativo**: `bg-green-500` com sombra verde
- **Transição**: Suave (200ms) para mudanças de estado

### Lógica de Ativação

#### Notificações
```tsx
const hasSpecificSelections = selectedClient !== 'Todos os Clientes' || 
                             selectedProduct !== 'Todos os Produtos' || 
                             selectedAudience !== 'Todos os Públicos' || 
                             selectedCampaign !== '';
```

#### Seleções Específicas
- **Cliente**: `selectedClient !== 'Todos os Clientes'`
- **Produto**: `selectedProduct !== 'Todos os Produtos'`
- **Público**: `selectedAudience !== 'Todos os Públicos'`
- **Anúncio**: `selectedCampaign !== ''`

#### Compartilhamento
```tsx
const isDisabled = selectedAudience === 'Todos os Públicos' || 
                  selectedProduct === 'Todos os Produtos' || 
                  selectedClient === 'Todos os Clientes';
```

## Benefícios da Implementação

### ✅ Feedback Visual Imediato
- Usuário vê instantaneamente o status de cada campo
- Não precisa clicar para verificar se algo está selecionado

### ✅ Consistência Visual
- Todos os componentes seguem o mesmo padrão
- Interface coesa e profissional

### ✅ Melhor UX
- Reduz confusão sobre o estado dos filtros
- Facilita a navegação e uso do sistema

### ✅ Acessibilidade
- Indicadores visuais claros e contrastantes
- Transições suaves para mudanças de estado

## Exemplo de Uso

1. **Estado Inicial**: Todos os indicadores em cinza
2. **Seleção de Cliente**: Indicador do cliente fica verde
3. **Seleção de Produto**: Indicador do produto fica verde
4. **Notificação**: Indicador de notificação fica verde
5. **Compartilhamento**: Indicador de compartilhamento fica verde

## Próximos Passos Sugeridos

1. **Tooltips**: Adicionar tooltips explicativos nos indicadores
2. **Animações**: Implementar animações mais elaboradas
3. **Personalização**: Permitir customização de cores por usuário
4. **Histórico**: Mostrar histórico de mudanças nos indicadores
5. **Alertas**: Integrar com sistema de alertas reais 