import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export default function Input({ error, label, className = '', id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full bg-[#0d1117] border ${error ? 'border-[#ef4444]' : 'border-[#30363d]'} rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30 transition-colors ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-[#ef4444]">{error}</span>}
    </div>
  );
}
