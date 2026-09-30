import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[#f97316] text-[#0d1117] hover:bg-[#fb923c] font-semibold',
  secondary: 'bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d] border border-[#30363d]',
  ghost: 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#e6edf3]',
  destructive: 'bg-[#ef4444] text-white hover:bg-[#dc2626] font-semibold',
  outline: 'border border-[#f97316] text-[#f97316] hover:bg-[#f97316]/10',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-[6px] transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#f97316]/50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon}
      {children}
    </button>
  );
}
