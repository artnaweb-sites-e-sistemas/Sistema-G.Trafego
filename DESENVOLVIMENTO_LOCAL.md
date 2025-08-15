# Guia de Desenvolvimento Local

## ✅ Status Atual
- **Branch atual**: `development` (separado da `main`)
- **Servidor**: Rodando em http://localhost:5173
- **Build**: Funcionando sem erros
- **Dependências**: Instaladas e atualizadas

## 🚀 Como trabalhar localmente

### 1. Verificar status
```bash
git status
git branch
```

### 2. Fazer alterações seguras
- Sempre trabalhe na branch `development`
- Teste suas alterações antes de commitar
- Use commits pequenos e descritivos

### 3. Comandos úteis
```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Visualizar build de produção
npm run preview

# Verificar lint
npm run lint
```

### 4. Fluxo de trabalho recomendado
1. Faça suas alterações na branch `development`
2. Teste localmente com `npm run dev`
3. Verifique se o build funciona com `npm run build`
4. Commit suas alterações
5. Quando estiver tudo funcionando, merge para `main`

### 5. Voltar ao último commit funcionando
Se algo der errado, você pode sempre voltar:
```bash
git restore .  # Descartar alterações não commitadas
git reset --hard HEAD  # Voltar ao último commit
```

## 🔧 Configuração atual
- **Vite**: Servidor de desenvolvimento rápido
- **React + TypeScript**: Stack principal
- **Firebase**: Banco de dados e autenticação
- **Tailwind CSS**: Estilização
- **Framer Motion**: Animações

## 📝 Próximos passos
- Trabalhe sempre na branch `development`
- Faça commits frequentes
- Teste antes de cada commit
- Documente mudanças importantes
