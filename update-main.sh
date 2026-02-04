#!/bin/bash

echo "🔄 Atualizando branch main com os commits da development..."

# Fazer push da development
echo "📤 Fazendo push da development..."
git push origin development

# Mudar para main e fazer reset
echo "🔄 Mudando para main..."
git checkout main

echo "🔄 Fazendo reset da main para development..."
git reset --hard development

echo "📤 Fazendo push da main..."
git push origin main --force

# Voltar para development
echo "🔄 Voltando para development..."
git checkout development

echo "✅ Pronto! Main atualizada com sucesso!"
echo "🎯 Agora o Vite vai usar a versão mais atualizada."
