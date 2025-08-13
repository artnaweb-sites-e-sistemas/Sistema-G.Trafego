import React from 'react';

type ProgressBarSize = 'sm' | 'md' | 'lg';

interface ProgressBarProps {
  value: number; // 0 a 100
  className?: string;
  variant?: 'animated' | 'muted';
  size?: ProgressBarSize;
  heightRem?: number; // override de altura precisa (ex.: 0.55rem)
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, className = '', variant = 'animated', size = 'md', heightRem }) => {
  const safe = Math.max(0, Math.min(100, isFinite(value) ? value : 0));
  const height = heightRem ? '' : (size === 'lg' ? 'h-3' : size === 'sm' ? 'h-1.5' : 'h-2');
  const heightStyle = heightRem ? { height: `${heightRem}rem` } : undefined;
  return (
    <div className={`${height} w-full bg-slate-700/50 rounded-full overflow-hidden ${className}`.trim()} style={heightStyle}>
      <div className={`${height} rounded-full ${variant === 'animated' ? 'progress-animated' : 'progress-muted'}`} style={{ width: `${safe}%`, ...(heightStyle || {}) }} />
    </div>
  );
};

export default ProgressBar;


