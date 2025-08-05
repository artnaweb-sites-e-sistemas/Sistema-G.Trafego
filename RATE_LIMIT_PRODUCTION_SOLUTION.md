# Solução de Rate Limiting para Produção - Meta Ads Integration

## 🚨 **Problemas do Sistema Atual para Produção**

### 1. **Rate Limiting Local (Problema Principal)**
- **Atual**: Rate limit é **por instância do navegador**
- **Problema**: Cada usuário tem seu próprio contador
- **Resultado**: Não há proteção global contra abuso

### 2. **Falta de Controle Centralizado**
- **Atual**: Cada cliente gerencia seu próprio rate limit
- **Problema**: Usuário malicioso pode contornar facilmente
- **Resultado**: Possível abuso da API do Facebook

### 3. **Sem Persistência**
- **Atual**: Rate limit é perdido ao recarregar a página
- **Problema**: Usuário pode resetar o contador facilmente
- **Resultado**: Proteção ineficaz

## 🛠️ **Solução Implementada para Produção**

### 1. **Sistema de Rate Limiting Persistente**

```typescript
// Carregamento automático na inicialização
constructor() {
  this.loadPersistentRateLimit();
}

// Persistência em localStorage
private savePersistentRateLimit(): void {
  const data = {
    oauthAttempts: this.oauthAttempts,
    lastOAuthAttempt: this.lastOAuthAttempt,
    facebookRateLimitActive: this.facebookRateLimitActive,
    facebookRateLimitUntil: this.facebookRateLimitUntil,
    timestamp: Date.now()
  };
  localStorage.setItem(this.RATE_LIMIT_STORAGE_KEY, JSON.stringify(data));
}
```

### 2. **Rate Limiting Global por Usuário**

```typescript
// Identificação única do usuário
private getUserIdentifier(): string {
  const userAgent = navigator.userAgent;
  const screenRes = `${screen.width}x${screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Hash simples (em produção, usar algo mais robusto)
  let hash = 0;
  const str = `${userAgent}_${screenRes}_${timezone}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString();
}
```

### 3. **Verificação Dupla de Rate Limit**

```typescript
private async canAttemptOAuth(): Promise<boolean> {
  // 1. Verificar rate limit local
  const localCanAttempt = this.oauthAttempts < this.OAUTH_RATE_LIMIT.MAX_ATTEMPTS;
  
  if (!localCanAttempt) {
    return false;
  }
  
  // 2. Verificar rate limit global (por usuário/IP)
  const globalCanAttempt = await this.checkGlobalRateLimit();
  
  return globalCanAttempt;
}
```

## 🔧 **Melhorias para Produção Real**

### 1. **Backend Rate Limiting (Recomendado)**

```typescript
// Em produção, substituir localStorage por chamadas ao servidor
private async checkGlobalRateLimit(): Promise<boolean> {
  try {
    const response = await fetch('/api/rate-limit/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: this.getCurrentUserId(),
        action: 'oauth_login',
        timestamp: Date.now()
      })
    });
    
    const result = await response.json();
    return result.canAttempt;
  } catch (error) {
    console.warn('Erro ao verificar rate limit:', error);
    return true; // Fallback para permitir tentativa
  }
}
```

### 2. **Rate Limiting por IP**

```typescript
// No backend (Node.js/Express com Redis)
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const oauthLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'oauth_rate_limit:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas
  message: 'Rate limit excedido. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 3. **Rate Limiting por Usuário Autenticado**

```typescript
// Identificação por ID do usuário logado
private getCurrentUserId(): string {
  // Em produção, usar ID do usuário autenticado
  const user = this.getCurrentUser();
  return user?.id || this.getUserIdentifier();
}
```

## 📊 **Configurações Recomendadas para Produção**

### **Rate Limits por Tipo de Usuário**

```typescript
const RATE_LIMITS = {
  ANONYMOUS: {
    MAX_ATTEMPTS: 3,
    WINDOW_MS: 15 * 60 * 1000, // 15 minutos
    BACKOFF_MS: 5 * 60 * 1000, // 5 minutos
  },
  AUTHENTICATED: {
    MAX_ATTEMPTS: 10,
    WINDOW_MS: 15 * 60 * 1000, // 15 minutos
    BACKOFF_MS: 2 * 60 * 1000, // 2 minutos
  },
  PREMIUM: {
    MAX_ATTEMPTS: 20,
    WINDOW_MS: 15 * 60 * 1000, // 15 minutos
    BACKOFF_MS: 1 * 60 * 1000, // 1 minuto
  }
};
```

### **Rate Limits por IP**

```typescript
const IP_RATE_LIMITS = {
  MAX_ATTEMPTS: 50, // 50 tentativas por IP
  WINDOW_MS: 60 * 60 * 1000, // 1 hora
  BACKOFF_MS: 30 * 60 * 1000, // 30 minutos
};
```

## 🚀 **Implementação Completa para Produção**

### 1. **Backend API (Node.js/Express)**

```javascript
// rateLimitMiddleware.js
const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
});

const oauthRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'oauth_rate_limit:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: (req) => {
    // Diferentes limites baseado no tipo de usuário
    if (req.user?.isPremium) return 20;
    if (req.user?.isAuthenticated) return 10;
    return 3; // Anônimo
  },
  message: {
    error: 'Rate limit excedido',
    retryAfter: Math.ceil(15 * 60 / 60), // minutos
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { oauthRateLimiter };
```

### 2. **Frontend Atualizado**

```typescript
// metaAdsService.ts - Versão para produção
private async checkGlobalRateLimit(): Promise<boolean> {
  try {
    const response = await fetch('/api/rate-limit/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({
        action: 'oauth_login',
        userId: this.getCurrentUserId(),
        timestamp: Date.now()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 429) {
        // Rate limit excedido
        await this.recordGlobalRateLimit(error.retryAfter * 60 * 1000);
        return false;
      }
      throw new Error(error.message);
    }

    return true;
  } catch (error) {
    console.warn('Erro ao verificar rate limit:', error);
    return true; // Fallback
  }
}
```

## 📈 **Monitoramento e Analytics**

### 1. **Logs de Rate Limit**

```typescript
// Logging de tentativas de rate limit
private async logRateLimitAttempt(userId: string, action: string, blocked: boolean): Promise<void> {
  try {
    await fetch('/api/analytics/rate-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        action,
        blocked,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        ip: await this.getClientIP()
      })
    });
  } catch (error) {
    console.warn('Erro ao logar rate limit:', error);
  }
}
```

### 2. **Dashboard de Monitoramento**

```typescript
// Métricas para dashboard
interface RateLimitMetrics {
  totalAttempts: number;
  blockedAttempts: number;
  uniqueUsers: number;
  topBlockedIPs: string[];
  rateLimitByUserType: {
    anonymous: number;
    authenticated: number;
    premium: number;
  };
}
```

## 🎯 **Benefícios da Solução para Produção**

1. **Proteção Real**: Rate limiting persistente e global
2. **Escalabilidade**: Suporte a múltiplos usuários simultâneos
3. **Flexibilidade**: Diferentes limites por tipo de usuário
4. **Monitoramento**: Logs e métricas para análise
5. **Fallback**: Sistema funciona mesmo com falhas no backend
6. **Segurança**: Proteção contra abuso da API do Facebook

## ⚠️ **Considerações Importantes**

1. **Backend Necessário**: Para produção real, implementar backend com Redis
2. **Autenticação**: Usar IDs de usuário reais em vez de identificadores do navegador
3. **Monitoramento**: Implementar logs e alertas para rate limits
4. **Configuração**: Ajustar limites baseado no uso real
5. **Backup**: Manter fallback local para casos de falha do backend 