const fs = require('fs');
const path = require('path');
const targetPath = path.join('c:', 'Users', 'biras', 'Desktop', 'Repositorio - G.Trafego', 'src', 'components', 'MonthlyDetailsTable.tsx');
const lines = fs.readFileSync(targetPath, 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('} else {') && lines[i + 1] && lines[i + 1].includes('NOVA LÓGICA: Vendas = Leads/msgm × Tx. Conversão Vendas%')) {
        console.log(`Found Vendas block at line ${i + 1}`);
    }
}
