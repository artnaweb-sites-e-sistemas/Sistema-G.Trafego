const fs = require('fs');
const path = require('path');

const targetPath = path.join('c:', 'Users', 'biras', 'Desktop', 'Repositorio - G.Trafego', 'src', 'components', 'MonthlyDetailsTable.tsx');
let fileContent = fs.readFileSync(targetPath, 'utf8');

// The Vendas blocks
let newContent = fileContent.replace(
    /\s*\} else \{\s*\/\/ 🎯 NOVA LÓGICA: Vendas = Leads\/msgm × Tx\. Conversão Vendas%\s*const leadsMsgmForVendas(\d*) = ([^;\n]+);\s*if \(txVendasValue\1 > 0 && leadsMsgmForVendas\1 > 0\) \{\s*const vendasValue = Math\.floor\(leadsMsgmForVendas\1 \* txVendasValue\1 \/ 100\);\s*updateMetric\('Vendas', formatNumber\(vendasValue\)\);\s*\} else \{\s*\/\/ 🎯 CORREÇÃO: Se leads\/msgm = 0, vendas = 0\s*updateMetric\('Vendas', formatNumber\(0\)\);\s*\}\s*\}/g,
    (match, num, decl) => {
        // num is the suffix number, e.g. "2" or ""
        // decl is the expression for leadsMsgmForVendas
        return `              } else if (vendasDiretasEnabled) {
                // 🎯 FUNIL VENDAS DIRETO: Vendas = LPV × Tx. Conversão Vendas%
                const txVisPagForVendas${num} = parsePercentage(currentData.find(r => r.metric === '% VIS. PÁG. (LPV/Cliques)')?.benchmark || '0%');
                const baseForLPV${num} = typeof cpcValue${num} !== 'undefined' && cpcValue${num} > 0 && typeof investmentValue${num} !== 'undefined' ? Math.round(investmentValue${num} / cpcValue${num}) : (typeof cliquesValue${num} !== 'undefined' ? cliquesValue${num} : 0);
                const lpvForVendas${num} = txVisPagForVendas${num} > 0 && baseForLPV${num} > 0 ? Math.round(baseForLPV${num} * txVisPagForVendas${num} / 100) : 0;
                
                if (txVendasValue${num} > 0 && lpvForVendas${num} > 0) {
                  const vendasValue = Math.floor(lpvForVendas${num} * txVendasValue${num} / 100);
                  updateMetric('Vendas', formatNumber(vendasValue));
                } else {
                  updateMetric('Vendas', formatNumber(0));
                }
              } else {
                // 🎯 NOVA LÓGICA: Vendas = Leads/msgm × Tx. Conversão Vendas%
                const leadsMsgmForVendas${num} = ${decl};
                if (txVendasValue${num} > 0 && leadsMsgmForVendas${num} > 0) {
                  const vendasValue = Math.floor(leadsMsgmForVendas${num} * txVendasValue${num} / 100);
                  updateMetric('Vendas', formatNumber(vendasValue));
                } else {
                  // 🎯 CORREÇÃO: Se leads/msgm = 0, vendas = 0
                  updateMetric('Vendas', formatNumber(0));
                }
              }`;
    }
);

// The CPV blocks
newContent = newContent.replace(
    /\} else \{\s*const leadsMsgmForVendas(\d*) = ([^;\n]+);\s*([a-zA-Z0-9]+ForCPV\1) = txVendasValue\1 > 0 && leadsMsgmForVendas\1 > 0 \? Math\.floor\(leadsMsgmForVendas\1 \* txVendasValue\1 \/ 100\) : 0;\s*\}/g,
    (match, num, decl, cpvVar) => {
        return `} else if (vendasDiretasEnabled) {
                const txVisPagForVendas${num} = parsePercentage(currentData.find(r => r.metric === '% VIS. PÁG. (LPV/Cliques)')?.benchmark || '0%');
                const baseForLPV${num} = typeof cpcValue${num} !== 'undefined' && cpcValue${num} > 0 && typeof investmentValue${num} !== 'undefined' ? Math.round(investmentValue${num} / cpcValue${num}) : 0;
                const lpvForVendas${num} = txVisPagForVendas${num} > 0 && baseForLPV${num} > 0 ? Math.round(baseForLPV${num} * txVisPagForVendas${num} / 100) : 0;
                ${cpvVar} = txVendasValue${num} > 0 && lpvForVendas${num} > 0 ? Math.floor(lpvForVendas${num} * txVendasValue${num} / 100) : 0;
              } else {
                const leadsMsgmForVendas${num} = ${decl};
                ${cpvVar} = txVendasValue${num} > 0 && leadsMsgmForVendas${num} > 0 ? Math.floor(leadsMsgmForVendas${num} * txVendasValue${num} / 100) : 0;
              }`;
    }
);

// The Lucro blocks
newContent = newContent.replace(
    /\} else \{\s*const leadsMsgmForVendas(\d*) = ([^;\n]+);\s*([a-zA-Z0-9]+ForLucro\1) = txVendasValue\1 > 0 && leadsMsgmForVendas\1 > 0 \? Math\.floor\(leadsMsgmForVendas\1 \* txVendasValue\1 \/ 100\) : 0;\s*\}/g,
    (match, num, decl, lucroVar) => {
        return `} else if (vendasDiretasEnabled) {
                const txVisPagForVendas${num} = parsePercentage(currentData.find(r => r.metric === '% VIS. PÁG. (LPV/Cliques)')?.benchmark || '0%');
                const baseForLPV${num} = typeof cpcValue${num} !== 'undefined' && cpcValue${num} > 0 && typeof investmentValue${num} !== 'undefined' ? Math.round(investmentValue${num} / cpcValue${num}) : 0;
                const lpvForVendas${num} = txVisPagForVendas${num} > 0 && baseForLPV${num} > 0 ? Math.round(baseForLPV${num} * txVisPagForVendas${num} / 100) : 0;
                ${lucroVar} = txVendasValue${num} > 0 && lpvForVendas${num} > 0 ? Math.floor(lpvForVendas${num} * txVendasValue${num} / 100) : 0;
              } else {
                const leadsMsgmForVendas${num} = ${decl};
                ${lucroVar} = txVendasValue${num} > 0 && leadsMsgmForVendas${num} > 0 ? Math.floor(leadsMsgmForVendas${num} * txVendasValue${num} / 100) : 0;
              }`;
    }
);

if (newContent !== fileContent) {
    fs.writeFileSync(targetPath, newContent, 'utf8');
    console.log('Successfully refactored Vendas, CPV, and Lucro cases!');

    // Also count the replacements to assure it worked on multiple instances
    console.log(`Matched and updated blocks.`);
} else {
    console.log('No matches found. Regex may need adjustment.');
}
