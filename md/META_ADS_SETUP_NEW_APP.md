# 🚀 Configuração do Novo App - Meta Ads Integration Automática

## **📋 Objetivo:**
Login do Facebook → Listar Business Managers → Selecionar conta → Ver métricas (TUDO AUTOMÁTICO)

---

## **🔧 Passo 1: Configurar o Novo App no Facebook Developers**

### **1.1 Acesse o Facebook Developers:**
- Vá para: https://developers.facebook.com/
- Faça login com sua conta do Facebook

### **1.2 Acesse seu novo app:**
- Clique em **"G.Trafego APP"** (ID: 1793110515418498)
- Confirme que está no app correto

### **1.3 Adicionar Produtos Necessários:**

#### **A) Facebook Login:**
1. Clique em **"Adicionar produto"**
2. Procure por **"Login do Facebook"**
3. Clique em **"Configurar"**
4. Configure:
   - **Domínios válidos do OAuth:** `gtrafego.artnawebsite.com.br`
   - **URIs de redirecionamento OAuth válidos:** `https://gtrafego.artnawebsite.com.br/`

#### **B) API de Marketing:**
1. Clique em **"Adicionar produto"**
2. Procure por **"API de Marketing"**
3. Clique em **"Configurar"**

---

## **🔧 Passo 2: Solicitar Permissões Avançadas**

### **2.1 Ir para App Review:**
1. No menu lateral, clique em **"Analisar"**
2. Clique em **"Análise do app"**
3. Clique no botão azul **"Solicitar permissões ou recursos"**

### **2.2 Solicitar Permissões:**
Adicione as seguintes permissões:

#### **A) Permissões de Anúncios:**
- **`ads_read`** - Para ler dados de anúncios
- **`ads_management`** - Para gerenciar anúncios

#### **B) Permissões de Páginas:**
- **`pages_show_list`** - Para listar páginas do usuário
- **`pages_read_engagement`** - Para dados de engajamento

#### **C) Permissões de Usuário:**
- **`email`** - Para email do usuário
- **`public_profile`** - Para dados básicos do perfil

### **2.3 Justificativa para o App Review:**

**Para `ads_read` e `ads_management`:**
```
"Este dashboard precisa acessar dados de anúncios para:
- Exibir métricas de performance das campanhas
- Mostrar insights de ROI e conversões
- Analisar dados de engajamento
- Fornecer relatórios detalhados para gestão de marketing
- Permitir que usuários vejam suas próprias campanhas publicitárias"
```

**Para `pages_show_list` e `pages_read_engagement`:**
```
"O dashboard precisa listar páginas do usuário para:
- Permitir seleção de páginas para análise
- Mostrar dados de engajamento das páginas
- Integrar métricas de páginas com dados de anúncios"
```

---

## **🔧 Passo 3: Configurar Casos de Uso**

### **3.1 Configurar Facebook Login:**
1. Vá para **"Casos de uso"**
2. Clique em **"Personali..."** no Facebook Login
3. Configure:
   - **Domínios válidos:** `gtrafego.artnawebsite.com.br`
   - **URIs de redirecionamento:** `https://gtrafego.artnawebsite.com.br/`

### **3.2 Configurar API de Marketing:**
1. Clique em **"Personali..."** na API de Marketing
2. Configure:
   - **Conta de anúncios:** Sua conta de anúncios
   - **Plataforma:** Site web

---

## **🔧 Passo 4: Atualizar o Dashboard**

### **4.1 Atualizar App ID:**
No arquivo `index.html`, atualize o App ID:
```javascript
appId: '1793110515418498', // Novo App ID
```

### **4.2 Atualizar .env:**
```env
VITE_FACEBOOK_APP_ID=1793110515418498
```

---

## **🔧 Passo 5: Testar**

### **5.1 Aguardar Aprovação:**
- App Review leva aproximadamente 5 dias
- Facebook analisa as permissões solicitadas

### **5.2 Testar após Aprovação:**
1. Acesse: `https://gtrafego.artnawebsite.com.br/`
2. Faça login com Facebook
3. Deve aparecer lista de Business Managers
4. Selecione um Business Manager
5. Veja as contas de anúncios
6. Selecione uma conta
7. Veja as métricas carregando automaticamente

---

## **🎯 Resultado Esperado:**

### **✅ Fluxo Automático:**
1. **Login** → Usuário clica em "Continuar com Facebook"
2. **Autorização** → Facebook pede permissões (uma vez só)
3. **Business Managers** → Lista aparece automaticamente
4. **Seleção** → Usuário escolhe Business Manager
5. **Contas** → Contas de anúncios aparecem
6. **Métricas** → Dados carregam automaticamente

### **✅ Sem Token Manual:**
- ❌ Não precisa gerar token
- ❌ Não precisa colar token
- ❌ Não precisa configuração manual
- ✅ Tudo funciona com login do Facebook

---

## **📞 Suporte:**

Se precisar de ajuda durante o processo:
1. Verifique se todas as permissões foram solicitadas
2. Confirme se os domínios estão configurados corretamente
3. Aguarde a aprovação do App Review
4. Teste o fluxo completo após aprovação

**🎉 Com essas configurações, seu dashboard funcionará automaticamente após o login do Facebook!** 