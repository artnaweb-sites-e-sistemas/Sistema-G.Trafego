const fs = require('fs');
const path = require('path');

const targetPath = path.join('c:', 'Users', 'biras', 'Desktop', 'Repositorio - G.Trafego', 'src', 'components', 'MonthlyDetailsTable.tsx');
let fileContent = fs.readFileSync(targetPath, 'utf8');

// Replace Vendas block
fileContent = fileContent.replace(
    /\} else \{\s*\/\/\s*🎯 NOVA LÓGICA: Vendas = Leads\/msgm × Tx\. Conversão Vendas%\s*const (leadsMsgmForVendas(\d*)) = ([^;\n]+);\s*if \((txVendasValue\2) > 0 && \1 > 0\) \{\s*const vendasValue = Math\.floor\(\1 \* \4 \/ 100\);\s*updateMetric\('Vendas', formatNumber\(vendasValue\)\);\s*\} else \{\s*\/\/\s*🎯 CORREÇÃO: Se leads\/msgm = 0, vendas = 0\s*updateMetric\('Vendas', formatNumber\(0\)\);\s*\}\s*\}/g,
    (match, leadsVar, num, expression, txVar) => {
        return `} else if (vendasDiretasEnabled) {
                // 🎯 FUNIL VENDAS DIRETO: Vendas = LPV × Tx. Conversão Vendas%
                const txVisPagForVendas${num} = parsePercentage(currentData.find(r => r.metric === '% VIS. PÁG. (LPV/Cliques)')?.benchmark || '0%');
                const baseForLPV${num} = typeof cpcValue${num} !== 'undefined' && cpcValue${num} > 0 && typeof investmentValue${num} !== 'undefined' ? Math.round(investmentValue${num} / cpcValue${num}) : (typeof cliquesValue${num} !== 'undefined' ? cliquesValue${num} : 0);
                const lpvForVendas${num} = txVisPagForVendas${num} > 0 && baseForLPV${num} > 0 ? Math.round(baseForLPV${num} * txVisPagForVendas${num} / 100) : 0;
                
                if (${txVar} > 0 && lpvForVendas${num} > 0) {
                  const vendasValue = Math.floor(lpvForVendas${num} * ${txVar} / 100);
                  updateMetric('Vendas', formatNumber(vendasValue));
                } else {
                  updateMetric('Vendas', formatNumber(0));
                }
              } else {
                // 🎯 NOVA LÓGICA: Vendas = Leads/msgm × Tx. Conversão Vendas%
                const ${leadsVar} = ${expression};
                if (${txVar} > 0 && ${leadsVar} > 0) {
                  const vendasValue = Math.floor(${leadsVar} * ${txVar} / 100);
                  updateMetric('Vendas', formatNumber(vendasValue));
                } else {
                  // 🎯 CORREÇÃO: Se leads/msgm = 0, vendas = 0
                  updateMetric('Vendas', formatNumber(0));
                }
              }`;
    }
);

// Replace CPV
fileContent = fileContent.replace(
    /\} else \{\s*const (leadsMsgmForVendas(\d*)) = ([^;\n]+);\s*(vendasForCPV\2) = (txVendasValue\2) > 0 && \1 > 0 \? Math\.floor\(\1 \* \5 \/ 100\) : 0;\s*\}/g,
    (match, leadsVar, num, expression, resultVar, txVar) => {
        return `} else if (vendasDiretasEnabled) {
                const txVisPagForVendas${num} = parsePercentage(currentData.find(r => r.metric === '% VIS. PÁG. (LPV/Cliques)')?.benchmark || '0%');
                const baseForLPV${num} = typeof cpcValue${num} !== 'undefined' && cpcValue${num} > 0 && typeof investmentValue${num} !== 'undefined' ? Math.round(investmentValue${num} / cpcValue${num}) : 0;
                const lpvForVendas${num} = txVisPagForVendas${num} > 0 && baseForLPV${num} > 0 ? Math.round(baseForLPV${num} * txVisPagForVendas${num} / 100) : 0;
                ${resultVar} = ${txVar} > 0 && lpvForVendas${num} > 0 ? Math.floor(lpvForVendas${num} * ${txVar} / 100) : 0;
              } else {
                const ${leadsVar} = ${expression};
                ${resultVar} = ${txVar} > 0 && ${leadsVar} > 0 ? Math.floor(${leadsVar} * ${txVar} / 100) : 0;
              }`;
    }
);

// Replace Lucro
fileContent = fileContent.replace(
    /\} else \{\s*const (leadsMsgmForVendas(\d*)) = ([^;\n]+);\s*(vendasForLucro\2) = (txVendasValue\2) > 0 && \1 > 0 \? Math\.floor\(\1 \* \5 \/ 100\) : 0;\s*\}/g,
    (match, leadsVar, num, expression, resultVar, txVar) => {
        return `} else if (vendasDiretasEnabled) {
                const txVisPagForVendas${num} = parsePercentage(currentData.find(r => r.metric === '% VIS. PÁG. (LPV/Cliques)')?.benchmark || '0%');
                const baseForLPV${num} = typeof cpcValue${num} !== 'undefined' && cpcValue${num} > 0 && typeof investmentValue${num} !== 'undefined' ? Math.round(investmentValue${num} / cpcValue${num}) : 0;
                const lpvForVendas${num} = txVisPagForVendas${num} > 0 && baseForLPV${num} > 0 ? Math.round(baseForLPV${num} * txVisPagForVendas${num} / 100) : 0;
                ${resultVar} = ${txVar} > 0 && lpvForVendas${num} > 0 ? Math.floor(lpvForVendas${num} * ${txVar} / 100) : 0;
              } else {
                const ${leadsVar} = ${expression};
                ${resultVar} = ${txVar} > 0 && ${leadsVar} > 0 ? Math.floor(${leadsVar} * ${txVar} / 100) : 0;
              }`;
    }
);

fs.writeFileSync(targetPath, fileContent, 'utf8');
console.log('Script completed');
