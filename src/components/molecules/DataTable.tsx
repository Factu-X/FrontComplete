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
  const cell = (row: T, col: Column<T>) =>
    col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '');

  // Las columnas sin título (acciones) van al pie de cada tarjeta en pantallas angostas.
  const labeled = columns.filter(col => col.header);
  const actions = columns.filter(col => !col.header);

  if (data.length === 0) {
    return (
      <div className="rounded-[6px] border border-[#30363d] px-4 py-10 text-center text-[#6e7681] text-sm">
        {emptyMessage}
      </div>
    );
  }

  // La forma depende del espacio del contenedor, no de la pantalla: con el menú lateral abierto
  // una pantalla ancha también puede dejar poco espacio. Menos de 48rem -> tarjetas.
  return (
    <div className="@container">
      <ul className="@3xl:hidden grid gap-2 @xl:grid-cols-2">
        {data.map(row => (
          <li key={row.id} className="bg-[#161b22] border border-[#30363d] rounded-[6px] px-4 py-3 flex flex-col gap-2">
            <dl className="grid grid-cols-[minmax(0,7rem)_1fr] gap-x-3 gap-y-1.5 text-sm">
              {labeled.map(col => (
                <React.Fragment key={col.key}>
                  <dt className="text-[11px] font-semibold text-[#6e7681] uppercase tracking-wider pt-0.5">{col.header}</dt>
                  <dd className={`min-w-0 text-[#e6edf3] break-words ${col.mono ? 'font-mono text-xs' : ''}`}>{cell(row, col)}</dd>
                </React.Fragment>
              ))}
            </dl>
            {actions.length > 0 && (
              <div className="flex justify-end gap-2 border-t border-[#30363d]/60 pt-2">
                {actions.map(col => <React.Fragment key={col.key}>{cell(row, col)}</React.Fragment>)}
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="hidden @3xl:block overflow-x-auto rounded-[6px] border border-[#30363d]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1c2128] border-b border-[#30363d]">
              {columns.map(col => (
                <th key={col.key} className="px-3 lg:px-4 py-3 text-left text-xs font-semibold text-[#8b949e] uppercase tracking-wider whitespace-nowrap">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.id}
                className={`border-b border-[#30363d]/60 hover:bg-[#1c2128]/70 transition-colors ${i % 2 === 0 ? 'bg-[#161b22]' : 'bg-[#0d1117]/40'}`}
              >
                {columns.map(col => (
                  <td key={col.key} className={`px-3 lg:px-4 py-3 text-[#e6edf3] ${col.mono ? 'font-mono text-xs' : ''}`}>
                    {cell(row, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
