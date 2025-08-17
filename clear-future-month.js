// Script para limpar o localStorage e remover meses futuros
console.log('🧹 Limpando localStorage de meses futuros...');

// Limpar selectedMonth se for um mês futuro
const selectedMonth = localStorage.getItem('selectedMonth');
if (selectedMonth) {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  const [monthName, yearStr] = selectedMonth.split(' ');
  const year = parseInt(yearStr) || new Date().getFullYear();
  const monthIndex = months.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
  
              if (monthIndex !== -1) {
              const now = new Date();
              const currentYear = now.getFullYear();
              const currentMonth = now.getMonth();
              
              // Verificar se é realmente um mês futuro
              const isFutureMonth = year > currentYear || (year === currentYear && monthIndex > currentMonth);
              
              if (isFutureMonth) {
                console.log(`❌ Removendo mês futuro: ${selectedMonth}`);
                localStorage.removeItem('selectedMonth');
                
                // Definir mês atual
                const currentMonthName = `${months[currentMonth]} ${currentYear}`;
                localStorage.setItem('selectedMonth', currentMonthName);
                console.log(`✅ Definido mês atual: ${currentMonthName}`);
              } else {
                console.log(`✅ Mês válido (passado ou atual): ${selectedMonth}`);
              }
            }
}

// Limpar outras chaves relacionadas a meses futuros
const keysToCheck = [
  'currentSelectedMonth',
  'selectedMonth'
];

keysToCheck.forEach(key => {
  const value = localStorage.getItem(key);
  if (value && value.includes('2025') && (value.includes('Agosto') || value.includes('Setembro') || value.includes('Outubro') || value.includes('Novembro') || value.includes('Dezembro'))) {
    console.log(`❌ Removendo chave com mês futuro: ${key} = ${value}`);
    localStorage.removeItem(key);
  }
});

console.log('✅ Limpeza concluída!');
