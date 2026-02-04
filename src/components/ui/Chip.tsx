import React from 'react';

type ChipColor = 'slate' | 'blue' | 'emerald' | 'amber' | 'rose';
type ChipVariant = 'soft' | 'outline';
type ChipSize = 'xs' | 'sm';

interface ChipProps {
  children: React.ReactNode;
  color?: ChipColor;
  variant?: ChipVariant;
  size?: ChipSize;
  icon?: React.ReactNode;
  className?: string;
}

const colorToClasses: Record<ChipColor, { soft: string; outline: string; text: string; border: string }> = {
  slate: {
    soft: 'bg-slate-700/30',
    outline: 'bg-transparent',
    text: 'text-slate-300',
    border: 'border-slate-600/40'
  },
  blue: {
    soft: 'bg-blue-900/20',
    outline: 'bg-transparent',
    text: 'text-blue-300',
    border: 'border-blue-500/30'
  },
  emerald: {
    soft: 'bg-emerald-900/20',
    outline: 'bg-transparent',
    text: 'text-emerald-200',
    border: 'border-emerald-400/30'
  },
  amber: {
    soft: 'bg-amber-900/20',
    outline: 'bg-transparent',
    text: 'text-amber-200',
    border: 'border-amber-400/30'
  },
  rose: {
    soft: 'bg-rose-900/20',
    outline: 'bg-transparent',
    text: 'text-rose-200',
    border: 'border-rose-400/30'
  }
};

const sizeToClasses: Record<ChipSize, string> = {
  xs: 'text-xs px-2.5 py-1',
  sm: 'text-sm px-3 py-1.5'
};

const Chip: React.FC<ChipProps> = ({ children, color = 'slate', variant = 'soft', size = 'xs', icon, className = '' }) => {
  const palette = colorToClasses[color];
  const base = 'inline-flex items-center gap-1 rounded-full border';
  const colorClasses = `${palette[variant]} ${palette.text} ${palette.border}`;
  const sizeClasses = sizeToClasses[size];

  return (
    <span className={`${base} ${colorClasses} ${sizeClasses} ${className}`.trim()}>
      {icon ? <span className="shrink-0">{icon}</span> : null}
      {children}
    </span>
  );
};

export default Chip;

