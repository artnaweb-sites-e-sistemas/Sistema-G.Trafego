import React from 'react';
import { Users } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, icon, className = '' }) => {
  return (
    <div className={`flex items-start justify-between mb-6 ${className}`.trim()}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-md">
          {icon || <Users className="h-5 w-5 text-slate-900" />}
        </div>
        <div>
          <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent leading-tight">
            {title}
          </h3>
          {subtitle ? (
            <p className="text-slate-400 text-sm mt-1 leading-tight">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SectionHeader;

