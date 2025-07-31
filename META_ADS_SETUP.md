# Configuração do Meta Ads - Dashboard Analytics

## Pré-requisitos

1. **Conta do Facebook Business** com acesso a contas de anúncios
2. **App do Facebook** criado no [Facebook Developers](https://developers.facebook.com/)
3. **Permissões de anúncios** configuradas no app

## Passos para Configuração

### 1. Criar App no Facebook Developers

1. Acesse [Facebook Developers](https://developers.facebook.com/)
2. Clique em "Criar App"
3. Selecione "Business" como tipo de app
4. Preencha as informações básicas do app

### 2. Configurar Permissões do App

No seu app do Facebook, adicione as seguintes permissões:

- `ads_read` - Para ler dados de anúncios
- `ads_management` - Para gerenciar anúncios (opcional)

### 3. Configurar App ID

1. Copie o App ID do seu app do Facebook
2. Crie um arquivo `.env` na raiz do projeto
3. Adicione a seguinte linha:

```env
REACT_APP_FACEBOOK_APP_ID=seu_app_id_aqui
```

### 4. Configurar Domínios Válidos

No Facebook Developers Console:

1. Vá para "Configurações" > "Básico"
2. Em "Domínios do App", adicione:
   - `localhost` (para desenvolvimento)
   - Seu domínio de produção

### 5. Configurar OAuth Redirect URIs

1. Vá para "Produtos" > "Facebook Login" > "Configurações"
2. Em "URIs de redirecionamento OAuth válidos", adicione:
   - `http://localhost:5173/` (para desenvolvimento)
   - `https://seu-dominio.com/` (para produção)

## Como Usar

### 1. Conectar com Facebook

1. Clique no botão "Meta Ads" no header do dashboard
2. Clique em "Entrar com Facebook"
3. Autorize o app a acessar suas contas de anúncios

### 2. Selecionar Conta de Anúncios

1. Após o login, selecione a conta de anúncios desejada
2. Apenas contas ativas serão exibidas

### 3. Sincronizar Dados

1. Clique em "Sincronizar Dados" para buscar métricas do Meta Ads
2. Os dados serão salvos no Firebase automaticamente

## Estrutura de Dados

Os dados do Meta Ads são convertidos para o formato padrão do dashboard:

```typescript
interface MetricData {
  date: string;
  month: string;
  service: string; // "Meta Ads"
  leads: number;
  revenue: number; // Estimado baseado em leads
  investment: number; // Spend do Meta Ads
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpl: number;
  roas: number;
  roi: number;
  appointments: number; // Estimado (60% dos leads)
  sales: number; // Estimado (30% dos leads)
}
```

## Troubleshooting

### Erro: "Facebook SDK não carregado"
- Verifique se o script do Facebook está sendo carregado no `index.html`
- Verifique se o App ID está configurado corretamente

### Erro: "Login cancelado pelo usuário"
- O usuário cancelou o processo de login
- Verifique se as permissões estão configuradas corretamente

### Erro: "Nenhuma conta de anúncios encontrada"
- Verifique se o usuário tem acesso a contas de anúncios
- Verifique se as contas estão ativas

### Erro: "Erro ao buscar insights"
- Verifique se as permissões `ads_read` estão configuradas
- Verifique se a conta de anúncios tem dados no período solicitado

## Segurança

- O App ID é público e pode ser exposto no frontend
- O access token é armazenado temporariamente no localStorage
- Sempre use HTTPS em produção
- Configure corretamente os domínios válidos no Facebook Developers

## Próximos Passos

1. Implementar refresh automático do access token
2. Adicionar suporte a múltiplas contas de anúncios
3. Implementar cache de dados para melhor performance
4. Adicionar métricas mais detalhadas (por campanha, ad set, etc.) 