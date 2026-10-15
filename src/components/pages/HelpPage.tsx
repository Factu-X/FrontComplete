import React, { useState } from 'react';

const SECTIONS = [
  {
    id: 'access',
    icon: '🔐',
    title: 'Acceso al sistema',
    content: [
      { subtitle: 'Iniciar sesión', text: 'Ingrese sus credenciales de usuario en la pantalla de inicio. FactuX maneja tres roles: Administrador (acceso completo, usuarios, catálogo y configuración), Facturación (clientes, motocicletas, órdenes y facturas) y Operario (consulta y actualiza el trabajo de las órdenes).' },
      { subtitle: 'Credenciales de demo', text: 'Usuario demo: admin@factux.co — Contraseña: admin123. Para operador: operador@factux.co — Password: op456. Estas credenciales son solo para demostración.' },
      { subtitle: 'Seguridad', text: 'Las credenciales se gestionan en la interfaz y en producción deben configurarse como variables de entorno seguras. Nunca se almacenan en texto plano en el código fuente.' },
    ],
  },
  {
    id: 'customers',
    icon: '👤',
    title: 'Clientes y motocicletas',
    content: [
      { subtitle: 'Registrar un cliente', text: 'Desde el módulo Clientes, haga clic en "Nuevo cliente". Complete el formulario con nombre, cédula/NIT, teléfono y correo electrónico. El correo es requerido para recibir recordatorios de mantenimiento.' },
      { subtitle: 'Agregar una motocicleta', text: 'Dentro del perfil del cliente, haga clic en "Agregar moto". Registre la marca, modelo, año y placa. Una motocicleta no puede tener placa duplicada en el sistema.' },
      { subtitle: 'Historial de servicios', text: 'El botón "Historial" en cada cliente muestra todas las órdenes de servicio registradas para cada motocicleta, con filtros por fecha y estado.' },
    ],
  },
  {
    id: 'orders',
    icon: '🔧',
    title: 'Órdenes de servicio',
    content: [
      { subtitle: 'Crear una orden', text: 'Desde Órdenes → "Nueva orden". Seleccione el cliente y la motocicleta, luego agregue servicios y repuestos desde el catálogo. Los precios se capturan en el momento de creación ("precios congelados").' },
      { subtitle: 'Cálculo automático de precios', text: 'El sistema aplica IVA del 19% únicamente a repuestos (no a mano de obra). El total se calcula automáticamente en tiempo real mientras agrega ítems.' },
      { subtitle: 'Flujo de estados', text: 'Una orden pasa por: Pendiente → En proceso → Finalizada. Una vez finalizada, los datos no pueden modificarse. Solo órdenes finalizadas pueden generar facturas.' },
    ],
  },
  {
    id: 'invoicing',
    icon: '🧾',
    title: 'Facturación electrónica',
    content: [
      { subtitle: 'Generar una factura', text: 'Desde Facturación → seleccione una orden finalizada sin factura y haga clic en "Generar factura". Elija la forma de pago (contado/crédito) y la fecha de vencimiento si aplica.' },
      { subtitle: 'CUFE y DIAN', text: 'Cada factura recibe un CUFE (Código Único de Factura Electrónica) calculado conforme al Anexo Técnico DIAN. La transmisión simula la validación con respuestas realistas: aprobada, rechazada o error de conexión.' },
      { subtitle: 'Notas crédito', text: 'Desde el módulo Notas Crédito, seleccione la factura a afectar, el motivo (códigos DIAN 1-5) y el valor del ajuste. El valor no puede superar el saldo disponible de la factura.' },
      { subtitle: 'Cuentas por cobrar', text: 'El módulo Cartera muestra todas las facturas con pagos pendientes, ordenadas de mayor a menor mora. Registre abonos parciales o totales desde el botón de pago en Facturación.' },
    ],
  },
  {
    id: 'history',
    icon: '📋',
    title: 'Historial y recordatorios',
    content: [
      { subtitle: 'Historial de motocicleta', text: 'Acceda al historial desde el módulo Clientes → botón Historial. Verá la línea de tiempo completa de servicios de cada moto, con filtros por fecha y estado.' },
      { subtitle: 'Recordatorios de mantenimiento', text: 'En el módulo Recordatorios, cree alertas por kilometraje o por fecha. El sistema notifica (simulado) por correo cuando el recordatorio está próximo a vencer.' },
      { subtitle: 'Recordatorios vencidos', text: 'Los recordatorios marcados como "Vencido" se resaltan en color rojo. Al completar uno, puede crear automáticamente el siguiente recordatorio de la misma categoría.' },
    ],
  },
  {
    id: 'catalog',
    icon: '📦',
    title: 'Catálogo de servicios y repuestos',
    content: [
      { subtitle: 'Gestión del catálogo', text: 'Desde el módulo Catálogo, agregue servicios (mano de obra) y repuestos. Defina nombre, código, precio base y tipo. Los precios en el catálogo son de referencia; pueden editarse al crear una orden.' },
      { subtitle: 'Precios congelados', text: 'Al agregar un ítem a una orden, su precio se "congela". Cambios posteriores en el catálogo no afectan órdenes ya creadas, garantizando integridad histórica.' },
    ],
  },
  {
    id: 'dashboard',
    icon: '📊',
    title: 'Dashboard y reportes',
    content: [
      { subtitle: 'Dashboard de facturación', text: 'Muestra KPIs del período seleccionado: total facturado, neto (descontando notas crédito), órdenes finalizadas y cartera pendiente. Filtre por hoy, semana, mes o rango personalizado.' },
      { subtitle: 'Servicios y repuestos más usados', text: 'El dashboard incluye gráficas de los servicios y repuestos con mayor demanda en el período, útil para planificación de inventario.' },
    ],
  },
  {
    id: 'config',
    icon: '⚙️',
    title: 'Configuración de empresa',
    content: [
      { subtitle: 'Datos de la empresa', text: 'Ingrese NIT, razón social, dirección, teléfono y responsabilidades tributarias (Responsable IVA, Régimen Simple, etc.). Esta información aparece en todas las facturas electrónicas.' },
      { subtitle: 'Numeración DIAN', text: 'Configure el rango autorizado de numeración: prefijo, número inicial y final, fecha de autorización y vencimiento. El sistema alerta cuando la numeración esté próxima a agotarse (últimos 50 números).' },
      { subtitle: 'Habilitación DIAN', text: 'Configure el NIT del ambiente de pruebas o producción, Client ID y Client Secret. En producción, use variables de entorno seguras para las credenciales.' },
    ],
  },
];

const FAQ = [
  { q: '¿Puedo crear una factura sin configurar la empresa?', a: 'No. Debe completar al menos los datos básicos de empresa y la numeración DIAN antes de generar facturas electrónicas. El sistema muestra un checklist de completitud en la pantalla de configuración.' },
  { q: '¿Qué pasa si la DIAN rechaza una factura?', a: 'La factura queda en estado "Rechazada" y puede reintentarse con el botón Reintentar. Un rechazo no elimina la factura; puede corregir los datos y volver a transmitir.' },
  { q: '¿Puedo editar una orden finalizada?', a: 'No. Una vez que una orden pasa a estado "Finalizada", los datos no pueden modificarse. Esto garantiza la trazabilidad del servicio y la integridad de las facturas asociadas.' },
  { q: '¿Cómo funciona el IVA en las facturas?', a: 'El IVA del 19% se aplica únicamente sobre repuestos (partes). Los servicios de mano de obra tienen tarifa del 0%. El sistema calcula esto automáticamente en tiempo real.' },
  { q: '¿Puedo tener múltiples motos por cliente?', a: 'Sí. Cada cliente puede tener tantas motocicletas como requiera. Cada moto tiene su propio historial de servicios independiente.' },
  { q: '¿Qué es el SUS y por qué está en el sistema?', a: 'El System Usability Scale (SUS) es un cuestionario de 10 preguntas para medir la usabilidad del sistema con usuarios reales. El módulo de Pruebas de Usabilidad permite registrar sesiones y calcular el puntaje automáticamente.' },
];

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-[#e6edf3]">Documentación y Guía de Usuario</h1>
        <p className="text-sm text-[#6e7681] mt-0.5">HU-15 · FactuX — Sistema de gestión para talleres de motocicletas en Colombia</p>
      </div>

      {/* Quick nav */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActiveSection(activeSection === s.id ? null : s.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${activeSection === s.id ? 'bg-[#f97316] text-[#0d1117] border-[#f97316]' : 'bg-[#161b22] text-[#8b949e] border-[#30363d] hover:border-[#f97316]/50 hover:text-[#e6edf3]'}`}
          >{s.icon} {s.title}</button>
        ))}
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-3">
        {SECTIONS.filter(s => !activeSection || s.id === activeSection).map(section => (
          <div key={section.id} className="bg-[#161b22] border border-[#30363d] rounded-[8px] overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#1c2128] transition-colors"
              onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{section.icon}</span>
                <span className="font-semibold text-[#e6edf3]">{section.title}</span>
              </div>
              <span className="text-[#6e7681] text-sm">{activeSection === section.id ? '▲' : '▼'}</span>
            </button>
            {activeSection === section.id && (
              <div className="px-5 pb-5 border-t border-[#30363d] flex flex-col gap-4 pt-4">
                {section.content.map((item, i) => (
                  <div key={i}>
                    <div className="text-sm font-semibold text-[#f97316] mb-1">{item.subtitle}</div>
                    <p className="text-sm text-[#8b949e] leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div>
        <div className="text-sm font-semibold text-[#8b949e] uppercase tracking-wider mb-3">Preguntas frecuentes</div>
        <div className="flex flex-col gap-2">
          {FAQ.map((item, i) => (
            <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-[8px] overflow-hidden">
              <button
                className="w-full px-5 py-3.5 text-left flex items-start gap-3 hover:bg-[#1c2128] transition-colors"
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
              >
                <span className="text-[#f97316] font-bold text-sm shrink-0 mt-0.5">Q</span>
                <span className="text-sm text-[#e6edf3] font-medium flex-1">{item.q}</span>
                <span className="text-[#6e7681] text-xs shrink-0">{faqOpen === i ? '▲' : '▼'}</span>
              </button>
              {faqOpen === i && (
                <div className="px-5 pb-4 border-t border-[#30363d] pt-3 flex gap-3">
                  <span className="text-[#34d399] font-bold text-sm shrink-0">A</span>
                  <p className="text-sm text-[#8b949e] leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Technical docs */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-[8px] p-5">
        <div className="text-sm font-semibold text-[#e6edf3] mb-3">📄 Documentación técnica</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium text-[#8b949e] mb-1.5">Estándares utilizados</div>
            <ul className="space-y-1 text-xs text-[#6e7681]">
              <li>• <span className="text-[#e6edf3]">Factura electrónica:</span> Resolución DIAN 000042/2020</li>
              <li>• <span className="text-[#e6edf3]">CUFE:</span> Anexo Técnico DIAN v1.9</li>
              <li>• <span className="text-[#e6edf3]">IVA repuestos:</span> 19% (ET art. 468)</li>
              <li>• <span className="text-[#e6edf3]">IVA servicios:</span> 0% (mano de obra)</li>
              <li>• <span className="text-[#e6edf3]">Usabilidad:</span> System Usability Scale (Brooke, 1996)</li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-[#8b949e] mb-1.5">Stack tecnológico</div>
            <ul className="space-y-1 text-xs text-[#6e7681]">
              <li>• <span className="text-[#e6edf3]">Frontend:</span> React 19 + TypeScript 5.7</li>
              <li>• <span className="text-[#e6edf3]">Estilos:</span> Tailwind CSS v4</li>
              <li>• <span className="text-[#e6edf3]">Metodología:</span> Atomic Design</li>
              <li>• <span className="text-[#e6edf3]">Build:</span> Vite 8</li>
              <li>• <span className="text-[#e6edf3]">Fuentes:</span> Outfit + JetBrains Mono</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[#30363d] text-xs text-[#6e7681]">
          <span className="text-[#f97316] font-medium">Nota de seguridad:</span> Las credenciales se gestionan solo en la interfaz y nunca se almacenan en el código fuente. En producción deben configurarse como variables de entorno seguras.
        </div>
      </div>

      {/* Version */}
      <div className="text-center text-xs text-[#6e7681] font-mono pb-4">
        FactuX v1.0.0 · Sistema de gestión para talleres de motocicletas · Colombia 2026
      </div>
    </div>
  );
}
