// Script para limpar o localStorage e remover meses futuros


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
                
                localStorage.removeItem('selectedMonth');
                
                // Definir mês atual
                const currentMonthName = `${months[currentMonth]} ${currentYear}`;
                localStorage.setItem('selectedMonth', currentMonthName);
                
              } else {
                
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
    
    localStorage.removeItem(key);
  }
});


