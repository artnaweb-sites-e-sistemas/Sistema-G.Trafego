# Implementação da Seção de Estratégia de Anúncio

## Visão Geral

Foi implementada uma nova seção no dashboard que permite definir estratégias de anúncio após a seleção do cliente e antes da seleção de produto e público. Esta seção só aparece quando um cliente é selecionado e não aparece após selecionar produto e público.

## Funcionalidades Implementadas

### 1. Definição do Produto
- **Nome do Produto**: Campo obrigatório para inserir o nome do produto
- **Nicho do Produto**: Campo obrigatório para definir o nicho
- **Tipo de Produto**: Seleção entre "Produto Online" ou "Produto Físico"
- **Objetivo da Campanha**: Seleção entre:
  - Tráfego no Site
  - Conversão em Mensagens (WhatsApp)
  - Conversões de Compras no Site

### 2. Definição do Público
- **Público Alvo**: Seleção entre Homem, Mulher ou Ambos
- **Faixa Etária**: Seleção obrigatória de faixa etária
- **Localização**: Campo para adicionar múltiplas localizações (sistema de tags)

### 3. Orçamento
- **Valor Pretendido**: Campo para definir o valor que se pretende investir
- **Valor Atual**: Campo não editável que busca automaticamente o valor investido no Meta Ads

### 4. Nomes Gerados Automaticamente
- **Nome do Produto**: Gerado no formato: `[nome do produto tipo (nome do produto)] [nicho (nicho)] [objetivo (objetivo da campanha)]`
- **Nome do Público**: Gerado no formato: `[gênero] [faixa etária] [localizações]`

## Arquivos Criados/Modificados

### Novos Arquivos
1. **`src/components/AdStrategySection.tsx`**
   - Componente principal da seção de estratégia
   - Interface completa com formulário e lista de estratégias
   - Geração automática de nomes

2. **`src/services/adStrategyService.ts`**
   - Serviço para gerenciar estratégias
   - Integração com Meta Ads para buscar valores investidos
   - Persistência no localStorage
   - Geração de nomes automáticos

### Arquivos Modificados
1. **`src/components/Dashboard.tsx`**
   - Importação do novo componente
   - Integração na lógica de renderização
   - Handler para estratégias criadas

## Fluxo de Funcionamento

1. **Seleção do Cliente**: Após conectar ao Meta Ads e selecionar um cliente
2. **Exibição da Seção**: A seção de estratégia aparece automaticamente
3. **Criação de Estratégia**: Usuário clica em "Nova Estratégia"
4. **Preenchimento**: Formulário com todas as informações necessárias
5. **Geração de Nomes**: Nomes são gerados automaticamente conforme preenchimento
6. **Busca de Valores**: Sistema busca automaticamente valores investidos no Meta Ads
7. **Salvamento**: Estratégia é salva e exibida na lista
8. **Próximos Passos**: Usuário pode selecionar produto e público para continuar

## Integração com Meta Ads

### Busca de Valores Investidos
- O sistema busca automaticamente no Meta Ads por públicos que correspondam ao nome gerado
- Utiliza correspondência parcial de nomes para encontrar dados relevantes
- Soma todos os valores investidos encontrados para o período selecionado

### Correspondência de Nomes
- Normaliza nomes removendo caracteres especiais
- Busca por palavras em comum entre nomes
- Permite correspondência flexível para encontrar dados relevantes

## Persistência de Dados

### LocalStorage
- Estratégias são salvas no localStorage do navegador
- Organizadas por cliente e mês
- Limpeza automática de estratégias antigas (mais de 30 dias)

### Estrutura de Dados
```typescript
interface AdStrategy {
  id: string;
  product: {
    name: string;
    niche: string;
    type: 'online' | 'fisico';
    objective: 'trafico' | 'mensagens' | 'compras';
  };
  audience: {
    gender: 'homem' | 'mulher' | 'ambos';
    ageRange: string;
    locations: string[];
  };
  budget: {
    planned: number;
    current: number;
  };
  generatedNames: {
    product: string;
    audience: string;
  };
  client: string;
  month: string;
  createdAt: Date;
}
```

## Interface do Usuário

### Design
- Interface moderna com gradientes e efeitos de vidro
- Cores consistentes com o tema do dashboard
- Ícones intuitivos para cada seção
- Responsivo para diferentes tamanhos de tela

### Interações
- Formulário expansível para nova estratégia
- Validação em tempo real
- Feedback visual para ações do usuário
- Botão de atualização para valores investidos

## Próximos Passos Sugeridos

1. **Integração com Criação de Campanhas**: Usar os nomes gerados para criar campanhas no Meta Ads
2. **Relatórios**: Gerar relatórios baseados nas estratégias criadas
3. **Templates**: Permitir salvar e reutilizar estratégias como templates
4. **Análise de Performance**: Comparar valores planejados vs. realizados
5. **Notificações**: Alertas quando valores investidos ultrapassarem o planejado

## Considerações Técnicas

### Escalabilidade
- Serviço modular e reutilizável
- Cache inteligente para dados do Meta Ads
- Limpeza automática de dados antigos

### Manutenibilidade
- Código bem estruturado e documentado
- Separação clara de responsabilidades
- Interfaces TypeScript bem definidas

### Performance
- Carregamento lazy de dados
- Cache de requisições ao Meta Ads
- Validação client-side para melhor UX
