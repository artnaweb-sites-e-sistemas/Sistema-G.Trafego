import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

interface MonthYearPickerProps {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
}

const MonthYearPicker: React.FC<MonthYearPickerProps> = ({ selectedMonth, setSelectedMonth }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(new Date().getMonth());
  const pickerRef = useRef<HTMLDivElement>(null);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const monthAbbreviations = [
    'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez'
  ];

  // Função para obter o mês atual formatado
  const getCurrentMonthString = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    return `${months[currentMonth]} ${currentYear}`;
  };

  // Parse current selected month string to get year and month
  useEffect(() => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Try to parse the selected month string
    const monthMatch = selectedMonth.match(/(\w+)\s+(\d{4})/);
    if (monthMatch) {
      const monthName = monthMatch[1];
      const year = parseInt(monthMatch[2]);
      const monthIndex = months.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
      
      if (monthIndex !== -1) {
        setSelectedMonthIndex(monthIndex);
        setSelectedYear(year);
      } else {
        // Fallback to current date
        setSelectedMonthIndex(currentMonth);
        setSelectedYear(currentYear);
        // Atualizar o selectedMonth para o mês atual se não conseguir fazer parse
        setSelectedMonth(getCurrentMonthString());
      }
    } else {
      // Fallback to current date
      setSelectedMonthIndex(currentMonth);
      setSelectedYear(currentYear);
      // Atualizar o selectedMonth para o mês atual se não conseguir fazer parse
      setSelectedMonth(getCurrentMonthString());
    }
  }, [selectedMonth, months]);

  // Inicializar com mês atual se selectedMonth estiver vazio ou inválido
  useEffect(() => {
    if (!selectedMonth || selectedMonth === '') {
      const currentMonthString = getCurrentMonthString();
      setSelectedMonth(currentMonthString);
          }
  }, []);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleYearChange = (increment: number) => {
    const newYear = selectedYear + increment;
    setSelectedYear(newYear);
    const newMonthString = `${months[selectedMonthIndex]} ${newYear}`;
    setSelectedMonth(newMonthString);
  };

  const handleMonthSelect = (monthIndex: number) => {
    setSelectedMonthIndex(monthIndex);
    const newMonthString = `${months[monthIndex]} ${selectedYear}`;
    setSelectedMonth(newMonthString);
    setIsOpen(false);
  };

  const handleThisMonth = () => {
    const currentMonthString = getCurrentMonthString();
    const currentDate = new Date();
    const newYear = currentDate.getFullYear();
    const newMonthIndex = currentDate.getMonth();
    
    setSelectedYear(newYear);
    setSelectedMonthIndex(newMonthIndex);
    setSelectedMonth(currentMonthString);
    setIsOpen(false);
    
      };

  const formatDisplayMonth = () => {
    const monthName = months[selectedMonthIndex];
    const monthNameLower = monthName.toLowerCase();
    return `${monthNameLower} de ${selectedYear}`;
  };

  // Função para determinar a cor do indicador baseado no mês selecionado
  const getIndicatorColor = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Criar data do mês selecionado
    const selectedDate = new Date(selectedYear, selectedMonthIndex);
    const currentMonthDate = new Date(currentYear, currentMonth);
    
    // Comparar meses
    let colorClass = '';
    let status = '';
    
    if (selectedDate.getTime() === currentMonthDate.getTime()) {
      colorClass = 'bg-green-500 shadow-lg shadow-green-500/50';
      status = 'Mês atual - Verde';
    } else if (selectedDate > currentMonthDate) {
      colorClass = 'bg-gray-500';
      status = 'Mês futuro - Cinza';
    } else {
      colorClass = 'bg-yellow-500 shadow-lg shadow-yellow-500/50';
      status = 'Mês passado - Amarelo';
    }

    return colorClass;
  };

  return (
    <div className="relative dropdown-container" ref={pickerRef}>
      {/* Input field */}
      <div 
        className="relative cursor-pointer dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title={(() => {
          const currentDate = new Date();
          const currentYear = currentDate.getFullYear();
          const currentMonth = currentDate.getMonth();
          const selectedDate = new Date(selectedYear, selectedMonthIndex);
          const currentMonthDate = new Date(currentYear, currentMonth);
          
          if (selectedDate.getTime() === currentMonthDate.getTime()) {
            return 'Mês atual selecionado';
          } else if (selectedDate > currentMonthDate) {
            return 'Mês futuro selecionado';
          } else {
            return 'Mês passado selecionado';
          }
        })()}
      >
        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <div className="bg-gray-700 text-white pl-10 pr-8 py-2 rounded-lg border border-gray-600/50 focus:border-purple-500/70 focus:outline-none w-full shadow-sm hover:shadow-md transition-all duration-300">
          <span className="truncate block font-medium">{formatDisplayMonth()}</span>
        </div>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        
        {/* Indicador de Status */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 transition-all duration-300 shadow-sm dropdown-indicator ${getIndicatorColor()}`}></div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="dropdown-menu dropdown-spacer z-dropdown-high bg-slate-900 border border-slate-700 rounded-xl shadow-2xl" style={{ zIndex: 2147483647 }}>
          {/* Year selector */}
          <div className="flex items-center justify-between p-3 border-b border-slate-700">
            <button
              onClick={() => handleYearChange(-1)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => {
                const newYear = parseInt(e.target.value) || new Date().getFullYear();
                setSelectedYear(newYear);
                const newMonthString = `${months[selectedMonthIndex]} ${newYear}`;
                setSelectedMonth(newMonthString);
              }}
              className="text-center font-medium text-slate-100 w-20 border-none focus:outline-none bg-transparent"
            />
            <button
              onClick={() => handleYearChange(1)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month grid */}
          <div className="p-3">
            <div className="grid grid-cols-4 gap-1">
              {monthAbbreviations.map((month, index) => (
                <button
                  key={month}
                  onClick={() => handleMonthSelect(index)}
                  className={`p-2 text-sm rounded transition-colors ${
                    index === selectedMonthIndex
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end p-3 border-t border-slate-700">
            <button
              onClick={handleThisMonth}
              className="text-sm text-slate-400 hover:text-purple-400 transition-colors"
            >
              Este mês
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthYearPicker; 