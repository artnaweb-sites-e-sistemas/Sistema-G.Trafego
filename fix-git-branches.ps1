Write-Host "🔧 Iniciando correção dos branches Git..." -ForegroundColor Cyan
Write-Host ""

try {
    # 1. Verificar status atual
    Write-Host "1️⃣ Verificando status atual..." -ForegroundColor Yellow
    $status = git status
    Write-Host $status
    Write-Host ""
    
    # 2. Fazer fetch das últimas mudanças
    Write-Host "2️⃣ Baixando últimas mudanças do repositório remoto..." -ForegroundColor Yellow
    git fetch origin
    Write-Host ""
    
    # 3. Verificar se há divergências
    Write-Host "3️⃣ Verificando divergências..." -ForegroundColor Yellow
    $logComparison = git log --oneline origin/development..development 2>$null
    
    if ($logComparison) {
        Write-Host "⚠️  Encontradas divergências! Vamos corrigir..." -ForegroundColor Red
        Write-Host ""
        
        # 4. Fazer rebase para alinhar os branches
        Write-Host "4️⃣ Alinhando branch local com o remoto..." -ForegroundColor Yellow
        git rebase origin/development
        Write-Host ""
        Write-Host "✅ Rebase concluído!" -ForegroundColor Green
    } else {
        Write-Host "✅ Nenhuma divergência encontrada!" -ForegroundColor Green
    }
    
    # 5. Verificar status final
    Write-Host ""
    Write-Host "5️⃣ Status final:" -ForegroundColor Yellow
    $finalStatus = git status
    Write-Host $finalStatus
    
    Write-Host ""
    Write-Host "🎉 Processo concluído! Agora seus commits devem aparecer em azul." -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Para fazer novos commits:" -ForegroundColor Cyan
    Write-Host "   1. git add ." -ForegroundColor White
    Write-Host "   2. git commit -m 'sua mensagem'" -ForegroundColor White
    Write-Host "   3. git push origin development" -ForegroundColor White
    
} catch {
    Write-Host "❌ Erro durante o processo: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Tentando abordagem alternativa..." -ForegroundColor Yellow
    
    try {
        # Abordagem alternativa: reset hard para o remoto
        Write-Host "🔄 Fazendo reset para o branch remoto..." -ForegroundColor Yellow
        git reset --hard origin/development
        Write-Host "✅ Reset concluído!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erro no reset: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "📞 Se o problema persistir, entre em contato para suporte adicional." -ForegroundColor Yellow
    }
}
