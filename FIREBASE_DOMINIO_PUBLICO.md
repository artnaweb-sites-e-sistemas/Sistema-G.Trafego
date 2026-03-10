# Acesso público a relatórios em produção

Para que clientes acessem links públicos (ex: `https://gtrafego.artnawebsite.com.br/r/LzljCx`) **sem precisar fazer login**, é necessário configurar o Firebase.

## 1. Habilitar autenticação anônima

1. Acesse o [Firebase Console](https://console.firebase.google.com)
2. Selecione o projeto
3. Vá em **Authentication** → **Sign-in method**
4. Ative **Anonymous**

## 2. Adicionar o domínio de produção

1. No Firebase Console, vá em **Authentication** → **Settings** (ícone de engrenagem)
2. Na seção **Authorized domains**, clique em **Add domain**
3. Adicione o domínio onde o app está em produção, por exemplo:
   - `gtrafego.artnawebsite.com.br`
   - Ou o domínio que você usa (ex: `seudominio.com`)

Sem isso, o Firebase bloqueia `signInAnonymously` com o erro `auth/unauthorized-domain` e o relatório público não carrega.

## 3. Verificar regras do Firestore

As regras já permitem leitura para usuários autenticados (incluindo anônimos) em:
- `share_links` – links curtos
- `metrics` – métricas
- `monthlyDetails` – detalhes mensais

Nenhuma alteração extra é necessária nas regras.
