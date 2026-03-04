const fs = require('fs');

const data = fs.readFileSync('src/components/MonthlyDetailsTable.tsx', 'utf8');
const searchStart = "// Calcular valores automáticos da coluna BENCHMARK/PROJEÇÃO\n        switch (row.metric) {";
const searchEnd = "// CORREÇÃO: Calcular status dinamicamente após recalcular valores";

const newSwitch = `// Calcular valores automáticos da coluna BENCHMARK/PROJEÇÃO
        switch (row.metric) {
          case 'Impressões':
            const investmentBenchRaw = currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0';
            const cpmBenchRaw = currentData.find(r => r.metric === 'CPM')?.benchmark || '0';
            const investmentBench = parseCurrency(investmentBenchRaw);
            const cpmBench = parseCurrency(cpmBenchRaw);
            if (cpmBench > 0) newRow.benchmark = formatNumber(Math.round(investmentBench * 1000 / cpmBench));
            break;

          case 'Cliques':
            const investmentBench2 = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            const cpcBench = parseCurrency(currentData.find(r => r.metric === 'CPC')?.benchmark || '0');
            if (cpcBench > 0) newRow.benchmark = formatNumber(Math.round(investmentBench2 / cpcBench));
            break;

          case 'Visitantes na página (LPV)':
            const invBenchLPV = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            const custoLpvBench = parseCurrency(currentData.find(r => r.metric === 'Custo por Visita (Custo/LPV)')?.benchmark || '0');
            if (custoLpvBench > 0) {
              newRow.benchmark = formatNumber(Math.round(invBenchLPV / custoLpvBench));
            } else {
              newRow.benchmark = formatNumber(0);
            }
            break;

          case '% VIS. PÁG. (LPV/Cliques)':
            const lpvVal = parseNumber(currentData.find(r => r.metric === 'Visitantes na página (LPV)')?.benchmark || '0');
            const cliquesVal = parseNumber(currentData.find(r => r.metric === 'Cliques')?.benchmark || '0');
            if (cliquesVal > 0) {
              newRow.benchmark = formatPercentage((lpvVal / cliquesVal) * 100).toFixed(2).replace('.', ',') + '%';
            } else {
              newRow.benchmark = '0,00%';
            }
            break;

          case 'Leads / Msgs':
            const invBenchLeads = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            const cplBenchInput = parseCurrency(currentData.find(r => r.metric === 'CPL (Custo por Lead)')?.benchmark || '0');
            if (cplBenchInput > 0) {
              newRow.benchmark = formatNumber(Math.round(invBenchLeads / cplBenchInput));
            } else {
              newRow.benchmark = formatNumber(0);
            }
            break;

          case 'Tx. Mensagens (Leads/Cliques)':
            const leadsVal = parseNumber(currentData.find(r => r.metric === 'Leads / Msgs')?.benchmark || '0');
            const lpvVal2 = parseNumber(currentData.find(r => r.metric === 'Visitantes na página (LPV)')?.benchmark || '0');
            const cliquesVal2 = parseNumber(currentData.find(r => r.metric === 'Cliques')?.benchmark || '0');
            const baseVol = lpvVal2 > 0 ? lpvVal2 : cliquesVal2;
            if (baseVol > 0) {
              newRow.benchmark = formatPercentage((leadsVal / baseVol) * 100).toFixed(2).replace('.', ',') + '%';
            } else {
              newRow.benchmark = '0,00%';
            }
            break;

          case 'Agendamentos':
            const leadsBench = parseNumber(currentData.find(r => r.metric === 'Leads / Msgs')?.benchmark || '0');
            const txAgendamentoBench = parsePercentage(currentData.find(r => r.metric === 'Tx. Agendamento (Agend./Leads)')?.benchmark || '0%');
            if (txAgendamentoBench > 0 && leadsBench > 0) {
              newRow.benchmark = formatNumber(Math.floor(leadsBench * txAgendamentoBench / 100));
            } else {
              newRow.benchmark = formatNumber(0);
            }
            break;
            
          case 'Vendas':
            const txConversaoVendasBench = parsePercentage(currentData.find(r => r.metric === 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)')?.benchmark || '0%');
            let baseVendas = 0;
            if (agendamentosEnabled) {
              baseVendas = parseNumber(currentData.find(r => r.metric === 'Agendamentos')?.benchmark || '0');
            } else if (funnelType === 'DIRETA') {
              baseVendas = parseNumber(currentData.find(r => r.metric === 'Visitantes na página (LPV)')?.benchmark || '0');
            } else {
              baseVendas = parseNumber(currentData.find(r => r.metric === 'Leads / Msgs')?.benchmark || '0');
            }
            if (txConversaoVendasBench > 0 && baseVendas > 0) {
              newRow.benchmark = formatNumber(Math.floor(baseVendas * txConversaoVendasBench / 100));
            } else {
              newRow.benchmark = formatNumber(0);
            }
            break;

          case 'CPV (Custo por Venda)':
            const investmentBench4 = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            const vendasBench2 = parseNumber(currentData.find(r => r.metric === 'Vendas')?.benchmark || '0');
            if (vendasBench2 > 0) {
              newRow.benchmark = formatCurrency(investmentBench4 / vendasBench2);
            } else {
              newRow.benchmark = formatCurrency(0);
            }
            break;
            
          case 'Lucro':
            const vendasBench3 = parseNumber(currentData.find(r => r.metric === 'Vendas')?.benchmark || '0');
            const investmentBench5 = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            const receitaBench = vendasBench3 * ticketMedio;
            newRow.benchmark = formatCurrency(receitaBench - investmentBench5);
            break;
            
          case 'ROI / ROAS':
            const investmentBench6 = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            if (investmentBench6 > 0) {
              const vendasBench4 = parseNumber(currentData.find(r => r.metric === 'Vendas')?.benchmark || '0');
              const receitaBench2 = vendasBench4 * ticketMedio;
              const lucroBench = receitaBench2 - investmentBench6;
              const roiPercentBench = (lucroBench / investmentBench6) * 100;
              const roiMultiplierBench = (receitaBench2 / investmentBench6);
              newRow.benchmark = \`\${roiPercentBench.toFixed(0).replace('.', ',')}%\ (\${roiMultiplierBench.toFixed(1).replace('.', ',')}x)\`;
            } else {
              newRow.benchmark = '0% (0.0x)';
            }
            break;
        }

        `;

const startIndex = data.indexOf(searchStart);
const endIndex = data.indexOf(searchEnd);

if (startIndex === -1 || endIndex === -1) {
    console.log("Could not find start or end index.");
} else {
    const result = data.substring(0, startIndex) + newSwitch + data.substring(endIndex);
    fs.writeFileSync('src/components/MonthlyDetailsTable.tsx', result, 'utf8');
    console.log("Successfully replaced the switch block.");
}
