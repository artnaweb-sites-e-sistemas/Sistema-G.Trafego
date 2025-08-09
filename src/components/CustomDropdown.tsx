import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  containerClassName?: string;
  theme?: 'blue' | 'yellow' | 'purple' | 'emerald';
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Selecione uma opção',
  label,
  disabled = false,
  className = '',
  containerClassName = '',
  theme = 'blue'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fechar dropdown com ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedOption = options.find(option => option.value === value);

  const getThemeColors = () => {
    switch (theme) {
      case 'blue':
        return {
          border: 'border-blue-500/40',
          borderFocus: 'border-blue-400',
          ring: 'ring-blue-400',
          bg: 'bg-slate-700/60',
          text: 'text-blue-300',
          label: 'text-blue-300',
          hover: 'hover:border-blue-400/60',
          selected: 'bg-blue-600/20 border-blue-500/60',
          optionHover: 'hover:bg-blue-600/20',
          icon: 'text-blue-400'
        };
      case 'yellow':
        return {
          border: 'border-yellow-500/40',
          borderFocus: 'border-yellow-400',
          ring: 'ring-yellow-400',
          bg: 'bg-slate-700/60',
          text: 'text-yellow-300',
          label: 'text-yellow-300',
          hover: 'hover:border-yellow-400/60',
          selected: 'bg-yellow-600/20 border-yellow-500/60',
          optionHover: 'hover:bg-yellow-600/20',
          icon: 'text-yellow-400'
        };
      case 'purple':
        return {
          border: 'border-purple-500/40',
          borderFocus: 'border-purple-400',
          ring: 'ring-purple-400',
          bg: 'bg-slate-700/60',
          text: 'text-purple-300',
          label: 'text-purple-300',
          hover: 'hover:border-purple-400/60',
          selected: 'bg-purple-600/20 border-purple-500/60',
          optionHover: 'hover:bg-purple-600/20',
          icon: 'text-purple-400'
        };
      case 'emerald':
        return {
          border: 'border-emerald-500/40',
          borderFocus: 'border-emerald-400',
          ring: 'ring-emerald-400',
          bg: 'bg-slate-700/60',
          text: 'text-emerald-300',
          label: 'text-emerald-300',
          hover: 'hover:border-emerald-400/60',
          selected: 'bg-emerald-600/20 border-emerald-500/60',
          optionHover: 'hover:bg-emerald-600/20',
          icon: 'text-emerald-400'
        };
      default:
        return {
          border: 'border-blue-500/40',
          borderFocus: 'border-blue-400',
          ring: 'ring-blue-400',
          bg: 'bg-slate-700/60',
          text: 'text-blue-300',
          label: 'text-blue-300',
          hover: 'hover:border-blue-400/60',
          selected: 'bg-blue-600/20 border-blue-500/60',
          optionHover: 'hover:bg-blue-600/20',
          icon: 'text-blue-400'
        };
    }
  };

  const colors = getThemeColors();

  return (
    <div className={`relative ${containerClassName}`}>
      {label && (
        <label className={`block text-sm font-medium ${colors.label} mb-2`}>
          {label}
        </label>
      )}
      
             <div ref={dropdownRef} className="relative z-20">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full relative flex items-center justify-between px-4 py-3 text-left
            ${colors.bg} border ${colors.border} rounded-lg
            ${disabled ? 'opacity-50 cursor-not-allowed' : `cursor-pointer ${colors.hover}`}
            focus:outline-none focus:border-${colors.borderFocus} focus:ring-1 focus:ring-${colors.ring}
            transition-all duration-200
            ${className}
          `}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {selectedOption?.icon && (
              <div className={`flex-shrink-0 ${colors.icon}`}>
                {selectedOption.icon}
              </div>
            )}
            <span className={`truncate ${selectedOption ? 'text-white' : 'text-slate-400'}`}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className={`flex-shrink-0 ${colors.icon}`}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </button>

        <AnimatePresence>
          {isOpen && (
                         <motion.div
               initial={{ opacity: 0, y: -10, scale: 0.95 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: -10, scale: 0.95 }}
               transition={{ duration: 0.15, ease: "easeOut" }}
               className="absolute z-[99999] w-full mt-2 bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-2xl overflow-hidden"
             >
              <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                {options.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-left
                      transition-all duration-200
                      ${option.value === value ? colors.selected : colors.optionHover}
                      ${index !== options.length - 1 ? 'border-b border-slate-600/30' : ''}
                    `}
                  >
                    {option.icon && (
                      <div className={`flex-shrink-0 ${colors.icon}`}>
                        {option.icon}
                      </div>
                    )}
                    <span className="flex-1 text-white font-medium">
                      {option.label}
                    </span>
                    {option.value === value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`flex-shrink-0 ${colors.icon}`}
                      >
                        <Check className="w-4 h-4" />
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CustomDropdown;
