import React from 'react';

// Marca las pantallas que aún no tienen backend para que nadie confunda sus datos con datos reales.
export default function DemoNotice({ hu }: { hu: string }) {
  return (
    <div role="note" className="mb-4 px-4 py-2.5 bg-sky-500/10 border border-sky-500/25 rounded-[6px] text-xs text-sky-300">
      ⓘ Datos de demostración — esta pantalla se conectará al sistema real en {hu}. Lo que se registre aquí no se guarda.
    </div>
  );
}
