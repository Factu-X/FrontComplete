import React, { useState, useEffect, useMemo } from 'react';
import Button from '../atoms/Button';
import Input from '../atoms/Input';
import Select from '../atoms/Select';
import Badge from '../atoms/Badge';
import { Customer, CatalogItem, Order, OrderItem, OrderStatus } from '../../types';

const IVA_RATE = 0.19;

function calcTotals(items: OrderItem[]) {
  const subtotalServices = items.filter(i => i.type === 'service').reduce((s, i) => s + i.subtotal, 0);
  const subtotalParts = items.filter(i => i.type === 'part').reduce((s, i) => s + i.subtotal, 0);
  const tax = Math.round(subtotalParts * IVA_RATE);
  return { subtotalServices, subtotalParts, tax, total: subtotalServices + subtotalParts + tax };
}

const statusOptions = [
  { value: 'open', label: 'Abierta' },
  { value: 'in_process', label: 'En proceso' },
  { value: 'finished', label: 'Finalizada' },
  { value: 'cancelled', label: 'Cancelada' },
];

interface Props {
  customers: Customer[];
  catalog: CatalogItem[];
  editing: Order | null;
  nextOrderNumber: string;
  onSave: (o: Omit<Order, 'id'>) => void;
  onCancel: () => void;
  saving: boolean;
}

export default function OrderForm({ customers, catalog, editing, nextOrderNumber, onSave, onCancel, saving }: Props) {
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [motorcycleId, setMotorcycleId] = useState<number | ''>('');
  const [kilometrage, setKilometrage] = useState('');
  const [problem, setProblem] = useState('');
  const [observations, setObservations] = useState('');
  const [status, setStatus] = useState<OrderStatus>('open');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [catalogSearch, setCatalogSearch] = useState('');

  useEffect(() => {
    if (editing) {
      setCustomerId(editing.customerId);
      setMotorcycleId(editing.motorcycleId);
      setKilometrage(String(editing.kilometrage));
      setProblem(editing.problem);
      setObservations(editing.observations);
      setStatus(editing.status);
      setItems(editing.items.map(i => ({ ...i })));
    }
  }, [editing]);

  const selectedCustomer = customers.find(c => c.id === customerId);
  const availableMotos = selectedCustomer?.motorcycles ?? [];
  const selectedMoto = availableMotos.find(m => m.id === motorcycleId);

  const activeCatalog = catalog.filter(i => i.active);
  const filteredCatalog = activeCatalog.filter(i => {
    const q = catalogSearch.toLowerCase();
    return !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
  });

  const totals = useMemo(() => calcTotals(items), [items]);

  function addItem(cat: CatalogItem) {
    const existing = items.find(i => i.catalogId === cat.id);
    if (existing) {
      setItems(prev => prev.map(i => i.catalogId === cat.id
        ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unitPrice }
        : i
      ));
    } else {
      const newItem: OrderItem = {
        id: Date.now(),
        catalogId: cat.id,
        code: cat.code,
        name: cat.name,
        type: cat.type,
        quantity: 1,
        unitPrice: cat.price,
        subtotal: cat.price,
      };
      setItems(prev => [...prev, newItem]);
    }
    setCatalogSearch('');
  }

  function updateQty(id: number, qty: number) {
    if (qty < 1) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty, subtotal: qty * i.unitPrice } : i));
  }

  function updatePrice(id: number, price: number) {
    if (price < 0) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, unitPrice: price, subtotal: i.quantity * price } : i));
  }

  function removeItem(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!customerId) e.customer = 'Selecciona un cliente';
    if (!motorcycleId) e.motorcycle = 'Selecciona una motocicleta';
    if (!kilometrage || Number(kilometrage) < 0) e.kilometrage = 'Kilometraje inválido';
    if (!problem.trim()) e.problem = 'El motivo de ingreso es obligatorio';
    return e;
  }

  function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const moto = selectedMoto!;
    const cust = selectedCustomer!;
    onSave({
      orderNumber: editing?.orderNumber ?? nextOrderNumber,
      customerId: cust.id,
      customerName: cust.name,
      customerIdNumber: cust.idNumber,
      motorcycleId: moto.id,
      motorcyclePlate: moto.plate,
      motorcycleBrand: moto.brand,
      motorcycleModel: moto.model,
      motorcycleYear: moto.year,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      kilometrage: Number(kilometrage),
      problem,
      observations,
      status,
      items,
      ...totals,
    });
  }

  const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  const customerOptions = [
    { value: '', label: 'Seleccionar cliente...' },
    ...customers.map(c => ({ value: String(c.id), label: `${c.name} — ${c.idType} ${c.idNumber}` })),
  ];
  const motoOptions = [
    { value: '', label: availableMotos.length ? 'Seleccionar motocicleta...' : 'Sin motocicletas' },
    ...availableMotos.map(m => ({ value: String(m.id), label: `${m.plate} — ${m.brand} ${m.model} ${m.year}` })),
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header info */}
      <div className="flex items-center gap-4 px-1">
        <div className="font-mono text-xs text-[#f97316] bg-[#f97316]/10 border border-[#f97316]/20 px-3 py-1 rounded">
          {editing?.orderNumber ?? nextOrderNumber}
        </div>
        <div className="text-xs text-[#6e7681]">
          {editing ? `Creada: ${new Date(editing.createdAt).toLocaleDateString('es-CO')}` : `Fecha: ${new Date().toLocaleDateString('es-CO')}`}
        </div>
      </div>

      {/* Cliente y moto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Cliente *</label>
          <select
            value={customerId}
            onChange={e => { setCustomerId(Number(e.target.value) || ''); setMotorcycleId(''); }}
            disabled={!!editing}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#f97316] disabled:opacity-60"
          >
            {customerOptions.map(o => <option key={o.value} value={o.value} className="bg-[#161b22]">{o.label}</option>)}
          </select>
          {errors.customer && <span className="text-xs text-[#ef4444]">{errors.customer}</span>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Motocicleta *</label>
          <select
            value={motorcycleId}
            onChange={e => setMotorcycleId(Number(e.target.value) || '')}
            disabled={!customerId || !!editing}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#f97316] disabled:opacity-60"
          >
            {motoOptions.map(o => <option key={o.value} value={o.value} className="bg-[#161b22]">{o.label}</option>)}
          </select>
          {errors.motorcycle && <span className="text-xs text-[#ef4444]">{errors.motorcycle}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Kilometraje actual *"
          type="number"
          value={kilometrage}
          onChange={e => setKilometrage(e.target.value)}
          error={errors.kilometrage}
          placeholder="12450"
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Estado</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as OrderStatus)}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#f97316]"
          >
            {statusOptions.map(o => <option key={o.value} value={o.value} className="bg-[#161b22]">{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Motivo de ingreso / Problema reportado *</label>
        <textarea
          value={problem}
          onChange={e => setProblem(e.target.value)}
          rows={2}
          placeholder="Descripción del problema o servicio requerido..."
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#f97316] resize-none"
        />
        {errors.problem && <span className="text-xs text-[#ef4444]">{errors.problem}</span>}
      </div>

      {/* Catálogo selector */}
      <div className="border border-[#30363d] rounded-[6px] overflow-hidden">
        <div className="bg-[#1c2128] px-4 py-2.5 border-b border-[#30363d]">
          <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">Agregar servicios y repuestos</span>
        </div>
        <div className="p-3">
          <input
            value={catalogSearch}
            onChange={e => setCatalogSearch(e.target.value)}
            placeholder="Buscar en catálogo activo..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#f97316] mb-2"
          />
          <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
            {filteredCatalog.length === 0 && (
              <div className="text-xs text-[#6e7681] px-2 py-3 text-center">Sin resultados en catálogo activo</div>
            )}
            {filteredCatalog.map(cat => (
              <button
                key={cat.id}
                onClick={() => addItem(cat)}
                className="flex items-center justify-between px-3 py-2 rounded hover:bg-[#21262d] transition-colors text-left w-full group"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={cat.type === 'service' ? 'service' : 'part'}>
                    {cat.type === 'service' ? 'SRV' : 'REP'}
                  </Badge>
                  <span className="font-mono text-xs text-[#6e7681]">{cat.code}</span>
                  <span className="text-sm text-[#e6edf3]">{cat.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[#8b949e]">{fmt(cat.price)}</span>
                  <span className="text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none">+</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items de la orden */}
      {items.length > 0 && (
        <div className="border border-[#30363d] rounded-[6px] overflow-hidden">
          <div className="bg-[#1c2128] px-4 py-2.5 border-b border-[#30363d] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">Elementos de la orden ({items.length})</span>
          </div>
          <div className="divide-y divide-[#30363d]/60">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <Badge variant={item.type === 'service' ? 'service' : 'part'}>
                  {item.type === 'service' ? 'SRV' : 'REP'}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#e6edf3] font-medium">{item.name}</div>
                  <div className="font-mono text-xs text-[#6e7681]">{item.code}</div>
                </div>
                {/* Cantidad */}
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="w-6 h-6 rounded bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] disabled:opacity-30 text-sm flex items-center justify-center">−</button>
                  <span className="font-mono text-sm text-[#e6edf3] w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-6 h-6 rounded bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] text-sm flex items-center justify-center">+</button>
                </div>
                {/* Precio unitario editable */}
                <div className="w-32">
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={e => updatePrice(item.id, Number(e.target.value))}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs font-mono text-[#e6edf3] focus:outline-none focus:border-[#f97316] text-right"
                  />
                </div>
                {/* Subtotal */}
                <div className="w-28 text-right font-mono text-xs text-[#e6edf3] font-semibold">{fmt(item.subtotal)}</div>
                <button onClick={() => removeItem(item.id)} className="text-[#6e7681] hover:text-[#ef4444] transition-colors ml-1">✕</button>
              </div>
            ))}
          </div>

          {/* Totales (HU-03) */}
          <div className="border-t border-[#30363d] bg-[#0d1117]/60 px-4 py-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#8b949e]">Subtotal servicios</span>
              <span className="font-mono text-blue-400">{fmt(totals.subtotalServices)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#8b949e]">Subtotal repuestos</span>
              <span className="font-mono text-violet-400">{fmt(totals.subtotalParts)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#8b949e]">IVA 19% (sobre repuestos)</span>
              <span className="font-mono text-yellow-400">{fmt(totals.tax)}</span>
            </div>
            <div className="border-t border-[#30363d] pt-2 flex justify-between text-base font-bold">
              <span className="text-[#e6edf3]">Total general</span>
              <span className="font-mono text-[#f97316] text-lg">{fmt(totals.total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Observaciones */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Observaciones adicionales</label>
        <textarea
          value={observations}
          onChange={e => setObservations(e.target.value)}
          rows={2}
          placeholder="Notas técnicas, recomendaciones al cliente..."
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#f97316] resize-none"
        />
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-2 border-t border-[#30363d]">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave} loading={saving}>
          {editing ? 'Guardar cambios' : 'Crear orden'}
        </Button>
      </div>
    </div>
  );
}
