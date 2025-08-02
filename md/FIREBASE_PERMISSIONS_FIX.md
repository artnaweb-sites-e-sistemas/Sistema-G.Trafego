# 🔧 Correção de Permissões do Firebase

## ❌ Problema Identificado
```
authService.ts:83 Erro ao carregar dados do usuário: FirebaseError: Missing or insufficient permissions.
```

## ✅ Solução

### 1. Acesse o Firebase Console
- Vá para: https://console.firebase.google.com/
- Selecione seu projeto: `dashboard---g-trafego`

### 2. Atualizar Regras do Firestore
- Vá em **"Firestore Database"** > **"Rules"**
- Substitua as regras atuais por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acesso aos dados do usuário autenticado
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // Permitir criação de novos usuários
      allow create: if request.auth != null;
    }
    
    // Permitir acesso às métricas para usuários autenticados
    match /metrics/{metricId} {
      allow read, write: if request.auth != null;
    }
    
    // Permitir acesso a outras coleções para usuários autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Regra de fallback para desenvolvimento (remover em produção)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 3. Publicar as Regras
- Clique em **"Publish"** para salvar as mudanças
- Aguarde a confirmação: "Rules published successfully"

### 4. Verificar Authentication
- Vá em **"Authentication"** > **"Users"**
- Verifique se há usuários cadastrados
- Se não houver, crie um usuário de teste

### 5. Testar a Correção
- Recarregue a página do dashboard
- Tente fazer login novamente
- Verifique o console do navegador (F12)

## 🔒 Regras para Produção

**IMPORTANTE:** Para produção, use as regras mais seguras:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acesso aos dados do usuário autenticado
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // Permitir criação de novos usuários
      allow create: if request.auth != null;
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

## 🚨 Regras Atuais (Desenvolvimento)

As regras atuais incluem uma regra de fallback que permite acesso total:
```javascript
match /{document=**} {
  allow read, write: if true;
}
```

**⚠️ ATENÇÃO:** Esta regra deve ser removida em produção!

## 📋 Checklist de Verificação

- [ ] Regras do Firestore atualizadas
- [ ] Regras publicadas com sucesso
- [ ] Authentication habilitado
- [ ] Usuário de teste criado
- [ ] Login funcionando
- [ ] Erro de permissões resolvido

## 🔍 Debug Adicional

Se o problema persistir:

1. **Verificar Console do Navegador**
   - Abra F12 > Console
   - Procure por erros relacionados ao Firebase

2. **Verificar Network Tab**
   - F12 > Network
   - Procure por requisições falhadas ao Firestore

3. **Verificar Authentication Status**
   - No console: `firebase.auth().currentUser`

4. **Limpar Cache do Navegador**
   - Ctrl+Shift+R (hard refresh)
   - Ou limpar dados do site

## 📞 Suporte

Se o problema persistir após seguir estes passos:
1. Verifique se o projeto Firebase está correto
2. Confirme se as credenciais estão atualizadas
3. Teste em modo incógnito
4. Verifique se não há bloqueadores de anúncios interferindo

---

**Status:** ✅ Solução implementada
**Última Atualização:** Janeiro 2025 