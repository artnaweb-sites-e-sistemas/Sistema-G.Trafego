# Configuração do Firebase - G.Trafego Dashboard

## 🔧 Configuração Necessária no Firebase Console

### 1. Acesse o Firebase Console
- Vá para: https://console.firebase.google.com/
- Selecione o projeto: `dashboard---g-trafego`

### 2. Configurar Authentication

**Passo 1: Habilitar Métodos de Login**
- Vá em **"Authentication"** > **"Sign-in method"**
- Habilite os seguintes provedores:
  - ✅ **Email/Password** (já habilitado)
  - ✅ **Google** (habilitar)

**Passo 2: Configurar Google OAuth**
- Clique em **"Google"**
- Marque **"Enable"**
- Adicione seu email como **"Project support email"**
- Clique em **"Save"**

### 3. Configurar Firestore Database

**Passo 1: Verificar Regras**
- Vá em **"Firestore Database"** > **"Rules"**
- Substitua as regras por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acesso aos dados do usuário autenticado
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Permitir acesso às métricas para usuários autenticados
    match /metrics/{metricId} {
      allow read, write: if request.auth != null;
    }
    
    // Permitir acesso a outras coleções para usuários autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Passo 2: Criar Índices (se necessário)**
- Se aparecer erro de índice, clique no link fornecido
- Ou vá em **"Indexes"** e crie manualmente:
  - Collection: `metrics`
  - Fields: `month` (Ascending), `date` (Descending)

### 4. Configurar Domínios Autorizados

**Passo 1: Authentication Domains**
- Vá em **"Authentication"** > **"Settings"** > **"Authorized domains"**
- Adicione:
  - `localhost`
  - `gtrafego.artnawebsite.com.br`

**Passo 2: Firestore Rules (se necessário)**
- Verifique se as regras estão publicadas

### 5. Testar a Configuração

**Passo 1: Testar Criação de Conta**
- Acesse: http://localhost:5174/
- Clique em **"Criar conta"**
- Preencha os dados:
  - Nome: `Teste`
  - Email: `teste@teste.com.br`
  - Senha: `teste2025`
- Clique em **"Criar conta"**

**Passo 2: Verificar no Console**
- Abra o console do navegador (F12)
- Verifique se não há erros de permissão
- Deve aparecer: "Conta criada com sucesso"

### 6. Solução de Problemas

**Erro: "Missing or insufficient permissions"**
- Verifique se as regras do Firestore estão corretas
- Publique as regras novamente

**Erro: "400 (Bad Request)"**
- Verifique se o Authentication está habilitado
- Verifique se os domínios estão autorizados

**Erro: "The query requires an index"**
- Clique no link fornecido no erro
- Ou crie o índice manualmente no Firebase Console

**Erro: "Popup blocked"**
- Permita popups para o site
- Verifique se está usando HTTPS em produção

### 7. Credenciais de Teste

**Para testar o sistema:**
- **Email:** `teste@teste.com.br`
- **Senha:** `teste2025` ✅
- **Nome:** `Teste`

### 8. Verificação Final

Após configurar tudo:
1. ✅ Authentication habilitado
2. ✅ Firestore regras configuradas
3. ✅ Domínios autorizados
4. ✅ Índices criados (se necessário)
5. ✅ Teste de criação de conta funcionando

---

**Status:** ⚠️ Requer configuração no Firebase Console
**Última Atualização:** Janeiro 2025 