import React from 'react';

type BadgeVariant = 'active' | 'inactive' | 'service' | 'part' | 'admin' | 'operator' | 'billing' | 'warning';

const variantMap: Record<BadgeVariant, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  inactive: 'bg-[#6e7681]/15 text-[#6e7681] border-[#6e7681]/30',
  service: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  part: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  admin: 'bg-[#f97316]/15 text-[#f97316] border-[#f97316]/30',
  operator: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  billing: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  warning: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
};

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

export default function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border font-mono ${variantMap[variant]}`}>
      {children}
    </span>
  );
}
