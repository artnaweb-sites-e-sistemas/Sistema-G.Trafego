const { execSync } = require('child_process');

console.log('🔧 Iniciando correção dos branches Git...\n');

try {
    // 1. Verificar status atual
    console.log('1️⃣ Verificando status atual...');
    const status = execSync('git status', { encoding: 'utf8' });
    console.log(status);
    
    // 2. Fazer fetch das últimas mudanças
    console.log('\n2️⃣ Baixando últimas mudanças do repositório remoto...');
    execSync('git fetch origin', { stdio: 'inherit' });
    
    // 3. Verificar se há divergências
    console.log('\n3️⃣ Verificando divergências...');
    const logComparison = execSync('git log --oneline origin/development..development', { encoding: 'utf8' });
    
    if (logComparison.trim()) {
        console.log('⚠️  Encontradas divergências! Vamos corrigir...');
        
        // 4. Fazer rebase para alinhar os branches
        console.log('\n4️⃣ Alinhando branch local com o remoto...');
        execSync('git rebase origin/development', { stdio: 'inherit' });
        
        console.log('\n✅ Rebase concluído!');
    } else {
        console.log('✅ Nenhuma divergência encontrada!');
    }
    
    // 5. Verificar status final
    console.log('\n5️⃣ Status final:');
    const finalStatus = execSync('git status', { encoding: 'utf8' });
    console.log(finalStatus);
    
    console.log('\n🎉 Processo concluído! Agora seus commits devem aparecer em azul.');
    console.log('💡 Para fazer novos commits:');
    console.log('   1. git add .');
    console.log('   2. git commit -m "sua mensagem"');
    console.log('   3. git push origin development');
    
} catch (error) {
    console.error('❌ Erro durante o processo:', error.message);
    console.log('\n🔧 Tentando abordagem alternativa...');
    
    try {
        // Abordagem alternativa: reset hard para o remoto
        console.log('🔄 Fazendo reset para o branch remoto...');
        execSync('git reset --hard origin/development', { stdio: 'inherit' });
        console.log('✅ Reset concluído!');
    } catch (resetError) {
        console.error('❌ Erro no reset:', resetError.message);
        console.log('\n📞 Se o problema persistir, entre em contato para suporte adicional.');
    }
}
