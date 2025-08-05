# Solução para Rate Limit do OAuth - Meta Ads Integration

## Problema Identificado

O erro `Your request to oauth has exceeded the rate limit, please try again later` ocorre quando o usuário tenta fazer login no Facebook/Meta Ads múltiplas vezes em um curto período de tempo.

### Diferença entre Limites

**Limites de Volume (mostrados no painel do Meta):**
- Limite de volume do aplicativo: 9% usado
- Limite de volume da conta de anúncios: 0% usado
- Controlam a **quantidade de dados** que podem ser acessados

**Rate Limit do OAuth:**
- Controla a **frequência de requisições** de autenticação
- Limita quantas vezes você pode fazer login/logout em um período específico
- É separado dos limites de volume de dados

## Causas do Problema

1. **Múltiplas tentativas de login** em um curto período
2. **Logout/Login frequente** (o código faz logout antes de cada novo login)
3. **Permissões sendo re-solicitadas** com `auth_type: 'rerequest'`
4. **Falta de controle de tentativas** no lado do cliente

## Solução Implementada

### 1. Sistema de Rate Limiting Local

```typescript
// Configurações do rate limit
private readonly OAUTH_RATE_LIMIT = {
  MAX_ATTEMPTS: 5,           // Máximo 5 tentativas
  WINDOW_MS: 15 * 60 * 1000, // Janela de 15 minutos
  BACKOFF_MS: 2 * 60 * 1000, // Delay inicial de 2 minutos
};
```

### 2. Backoff Exponencial

O sistema implementa um algoritmo de backoff exponencial:
- **Tentativa 1**: 2 minutos de espera
- **Tentativa 2**: 4 minutos de espera
- **Tentativa 3**: 8 minutos de espera
- **Tentativa 4**: 16 minutos de espera
- **Tentativa 5**: 30 minutos de espera (máximo)

### 3. Verificação Prévia

Antes de tentar fazer login, o sistema verifica se pode tentar:

```typescript
if (!this.canAttemptOAuth()) {
  const delay = this.getBackoffDelay();
  const minutes = Math.ceil(delay / 60000);
  reject(new Error(`Rate limit do OAuth excedido. Tente novamente em ${minutes} minutos.`));
  return;
}
```

### 4. Interface do Usuário Melhorada

- **Indicador visual** do status do rate limit
- **Contador de tentativas** com barra de progresso
- **Mensagens informativas** sobre tempo de espera
- **Botão de reset** para casos especiais

### 5. Reset Automático

O contador é resetado automaticamente:
- Após 15 minutos sem tentativas
- Quando o usuário faz logout
- Manualmente através do botão de reset

## Como Usar

### Para o Usuário

1. **Se aparecer o aviso de rate limit:**
   - Aguarde o tempo indicado
   - Não tente fazer login novamente até o tempo expirar
   - Use o botão "Resetar contador" apenas se necessário

2. **Para evitar rate limits:**
   - Não faça login/logout repetidamente
   - Use o logout apenas quando necessário
   - Mantenha a sessão ativa quando possível

### Para Desenvolvedores

1. **Monitoramento:**
   ```typescript
   const status = metaAdsService.getOAuthRateLimitStatus();
   console.log('Rate limit status:', status);
   ```

2. **Reset manual:**
   ```typescript
   metaAdsService.resetOAuthRateLimit();
   ```

3. **Verificação antes do login:**
   ```typescript
   if (metaAdsService.getOAuthRateLimitStatus().canAttempt) {
     // Proceder com login
   }
   ```

## Benefícios da Solução

1. **Prevenção de erros** - Evita tentativas desnecessárias
2. **Melhor UX** - Informações claras sobre o status
3. **Controle local** - Não depende apenas dos limites do Meta
4. **Recuperação automática** - Reset automático após tempo
5. **Flexibilidade** - Possibilidade de reset manual quando necessário

## Próximos Passos

1. **Monitoramento** - Acompanhar a frequência de rate limits
2. **Ajustes** - Modificar limites baseado no uso real
3. **Cache melhorado** - Reduzir necessidade de novos logins
4. **Sessões persistentes** - Manter login ativo por mais tempo

## Notas Técnicas

- O sistema é **local** e não afeta outros usuários
- Os limites são **conservadores** para evitar problemas
- O backoff exponencial **reduz a carga** no servidor do Meta
- A interface **informa claramente** o status atual 