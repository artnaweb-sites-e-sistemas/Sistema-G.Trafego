# Explicação dos Rate Limits - Meta Ads Integration

## 🔍 **Dois Tipos de Rate Limits**

### 1. **Rate Limit Local (Nosso Sistema)**
- **O que é**: Sistema que implementamos para prevenir tentativas excessivas
- **Limite**: 5 tentativas em 15 minutos
- **Reset**: Automático após 15 minutos OU manual
- **Mensagem**: "Tentativas de login: 1/5"
- **Solução**: Reset manual disponível

### 2. **Rate Limit do Facebook (Meta)**
- **O que é**: Limite imposto pelo Facebook/Meta
- **Limite**: Variável, baseado no comportamento do usuário
- **Reset**: 30 minutos (configurado por nós)
- **Mensagem**: "Your request to oauth has exceeded the rate limit"
- **Solução**: Aguardar 30 minutos

## 🚨 **Por que a mensagem desaparece quando você desconecta/reconecta?**

### **Rate Limit Local**:
- ✅ **Reseta automaticamente** no logout
- ✅ **Pode ser resetado manualmente**
- ✅ **Mensagem desaparece** ao reconectar

### **Rate Limit do Facebook**:
- ❌ **NÃO reseta** no logout
- ❌ **NÃO pode ser resetado** manualmente
- ❌ **Mensagem persiste** mesmo reconectando

## 📊 **Como Identificar Qual Rate Limit Está Ativo**

### **Rate Limit Local**:
```
Tentativas de login: 1/5
[Barra de progresso]
```

### **Rate Limit do Facebook**:
```
Rate Limit do Facebook
O Facebook está limitando as tentativas de login. 
Aguarde 30 minutos antes de tentar novamente.

⚠️ Este é um limite do Facebook, não do nosso sistema. 
Fazer logout/reconectar não resolve.
```

## 🛠️ **Soluções por Tipo**

### **Para Rate Limit Local**:
1. **Aguardar**: 2-30 minutos (dependendo da tentativa)
2. **Reset manual**: Botão "Resetar contador"
3. **Logout/Reconectar**: Reseta automaticamente

### **Para Rate Limit do Facebook**:
1. **Aguardar**: 30 minutos (fixo)
2. **Não fazer logout/reconectar**: Não resolve
3. **Não tentar login**: Qualquer tentativa reinicia o timer

## ⚠️ **Importante**

- **Rate Limit do Facebook é mais restritivo**
- **Fazer logout/reconectar NÃO resolve** rate limit do Facebook
- **Aguardar é a única solução** para rate limit do Facebook
- **Nosso sistema é preventivo**, não curativo

## 🎯 **Recomendações**

### **Para Desenvolvimento/Testes**:
- Use reset manual para rate limit local
- Para rate limit do Facebook: aguarde 30 minutos

### **Para Produção**:
- Evite múltiplas tentativas de login
- Mantenha sessões ativas
- Use logout apenas quando necessário

## 🔧 **Comandos Úteis**

### **Verificar Status**:
```javascript
console.log(metaAdsService.getOAuthRateLimitStatus());
```

### **Reset Manual**:
```javascript
metaAdsService.resetOAuthRateLimit();
```

### **Verificar se é Rate Limit do Facebook**:
```javascript
const status = metaAdsService.getOAuthRateLimitStatus();
if (status.facebookRateLimit) {
  console.log('Rate limit do Facebook ativo');
}
``` 