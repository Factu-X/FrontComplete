import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
  options: { value: string; label: string }[];
}

export default function Select({ error, label, options, className = '', id, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`w-full bg-[#0d1117] border ${error ? 'border-[#ef4444]' : 'border-[#30363d]'} rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30 transition-colors cursor-pointer ${className}`}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-[#161b22]">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-[#ef4444]">{error}</span>}
    </div>
  );
}
