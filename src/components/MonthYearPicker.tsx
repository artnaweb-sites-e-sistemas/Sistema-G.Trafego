import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

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
      }
    } else {
      // Fallback to current date
      setSelectedMonthIndex(currentMonth);
      setSelectedYear(currentYear);
    }
  }, [selectedMonth, months]);

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

  const handleClear = () => {
    const currentDate = new Date();
    const newYear = currentDate.getFullYear();
    const newMonthIndex = currentDate.getMonth();
    setSelectedYear(newYear);
    setSelectedMonthIndex(newMonthIndex);
    const newMonthString = `${months[newMonthIndex]} ${newYear}`;
    setSelectedMonth(newMonthString);
    setIsOpen(false);
  };

  const handleThisMonth = () => {
    const currentDate = new Date();
    const newYear = currentDate.getFullYear();
    const newMonthIndex = currentDate.getMonth();
    setSelectedYear(newYear);
    setSelectedMonthIndex(newMonthIndex);
    const newMonthString = `${months[newMonthIndex]} ${newYear}`;
    setSelectedMonth(newMonthString);
    setIsOpen(false);
  };

  const formatDisplayMonth = () => {
    const monthName = months[selectedMonthIndex];
    const monthNameLower = monthName.toLowerCase();
    return `${monthNameLower} de ${selectedYear}`;
  };

  return (
    <div className="relative" ref={pickerRef}>
      {/* Input field */}
      <div 
        className="relative cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <div className="bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none min-w-[200px]">
          {formatDisplayMonth()}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[280px]">
          {/* Year selector */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <button
              onClick={() => handleYearChange(-1)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
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
              className="text-center font-medium text-gray-900 w-20 border-none focus:outline-none"
            />
            <button
              onClick={() => handleYearChange(1)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Month grid */}
          <div className="p-3">
            <div className="grid grid-cols-4 gap-1">
              {monthAbbreviations.map((month, index) => (
                <button
                  key={month}
                  onClick={() => handleMonthSelect(index)}
                  className={`p-2 text-sm rounded hover:bg-gray-100 transition-colors ${
                    index === selectedMonthIndex
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'text-gray-700'
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between p-3 border-t border-gray-200">
            <button
              onClick={handleClear}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Limpar
            </button>
            <button
              onClick={handleThisMonth}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
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