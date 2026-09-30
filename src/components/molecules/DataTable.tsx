import React from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  mono?: boolean;
}

interface DataTableProps<T extends { id: string | number }> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}

export default function DataTable<T extends { id: string | number }>({
  columns,
  data,
  emptyMessage = 'Sin registros',
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-[6px] border border-[#30363d]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#1c2128] border-b border-[#30363d]">
            {columns.map(col => (
              <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-[#8b949e] uppercase tracking-wider whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-[#6e7681] text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id}
                className={`border-b border-[#30363d]/60 hover:bg-[#1c2128]/70 transition-colors ${i % 2 === 0 ? 'bg-[#161b22]' : 'bg-[#0d1117]/40'}`}
              >
                {columns.map(col => (
                  <td key={col.key} className={`px-4 py-3 text-[#e6edf3] ${col.mono ? 'font-mono text-xs' : ''}`}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
