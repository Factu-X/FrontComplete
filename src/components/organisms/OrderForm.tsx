import React, { useEffect, useState } from 'react';
import Button from '../atoms/Button';
import Input from '../atoms/Input';
import Select from '../atoms/Select';
import { ToastItem } from '../molecules/ToastContainer';
import { apiRequest, ApiEntityResponse, ApiListResponse, ApiSession } from '../../lib/api';
import type { BackendCliente, BackendMotocicleta, BackendOrden } from '../../lib/types';

interface Props {
  session: ApiSession;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
  onCreated: (orden: BackendOrden) => void;
  onCancel: () => void;
}

export default function OrderForm({ session, addToast, onCreated, onCancel }: Props) {
  const [customers, setCustomers] = useState<BackendCliente[]>([]);
  const [motorcycles, setMotorcycles] = useState<BackendMotocicleta[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [motorcycleId, setMotorcycleId] = useState('');
  const [kilometrage, setKilometrage] = useState('');
  const [problem, setProblem] = useState('');
  const [observations, setObservations] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest<ApiListResponse<BackendCliente>>('/clientes', session)
      .then(response => setCustomers(response.data.filter(c => c.activo)))
      .catch(() => addToast({ message: 'No se pudieron cargar los clientes', type: 'error' }));
  }, [session.token]);

  useEffect(() => {
    setMotorcycleId('');
    setMotorcycles([]);
    if (!customerId) return;
    apiRequest<ApiListResponse<BackendMotocicleta>>(`/clientes/${customerId}/motocicletas`, session)
      .then(response => setMotorcycles(response.data.filter(m => m.activa)))
      .catch(() => addToast({ message: 'No se pudieron cargar las motocicletas', type: 'error' }));
  }, [customerId]);

  function selectMotorcycle(id: string) {
    setMotorcycleId(id);
    const moto = motorcycles.find(m => m.id === id);
    if (moto?.kilometrajeActual != null) setKilometrage(String(moto.kilometrajeActual));
  }

  function validate() {
    const e: Record<string, string> = {};
    const moto = motorcycles.find(m => m.id === motorcycleId);
    if (!customerId) e.customer = 'Selecciona un cliente';
    if (!motorcycleId) e.motorcycle = 'Selecciona una motocicleta';
    if (kilometrage === '' || !Number.isInteger(Number(kilometrage)) || Number(kilometrage) < 0) {
      e.kilometrage = 'Kilometraje inválido';
    } else if (moto?.kilometrajeActual != null && Number(kilometrage) < moto.kilometrajeActual) {
      e.kilometrage = `El último kilometraje registrado es ${moto.kilometrajeActual.toLocaleString('es-CO')} km`;
    }
    if (problem.trim().length < 3) e.problem = 'El motivo de ingreso es obligatorio';
    return e;
  }

  async function handleSave() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const response = await apiRequest<ApiEntityResponse<BackendOrden>>('/ordenes', session, {
        method: 'POST',
        body: JSON.stringify({
          clienteId: customerId,
          motocicletaId: motorcycleId,
          kilometrajeIngreso: Number(kilometrage),
          motivoIngreso: problem.trim(),
          observaciones: observations.trim() || null,
        }),
      });
      addToast({ message: `Orden ${response.data.numero} creada. Agrega servicios y repuestos.`, type: 'success' });
      onCreated(response.data);
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo crear la orden', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const customerOptions = [
    { value: '', label: 'Seleccionar cliente...' },
    ...customers.map(c => ({ value: c.id, label: `${c.nombreRazonSocial} — ${c.tipoIdentificacion} ${c.numeroIdentificacion}` })),
  ];
  const motoOptions = [
    { value: '', label: motorcycles.length ? 'Seleccionar motocicleta...' : 'Sin motocicletas activas' },
    ...motorcycles.map(m => ({ value: m.id, label: `${m.placa} — ${m.marca} ${m.modelo} ${m.anio ?? ''}` })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="text-xs text-[#6e7681] px-1">
        Fecha de ingreso: {new Date().toLocaleDateString('es-CO')} · El número de orden lo asigna el sistema.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Cliente *"
          options={customerOptions}
          value={customerId}
          onChange={e => setCustomerId(e.target.value)}
          error={errors.customer}
        />
        <Select
          label="Motocicleta *"
          options={motoOptions}
          value={motorcycleId}
          onChange={e => selectMotorcycle(e.target.value)}
          disabled={!customerId}
          error={errors.motorcycle}
        />
      </div>

      <Input
        label="Kilometraje actual *"
        type="number"
        value={kilometrage}
        onChange={e => setKilometrage(e.target.value)}
        error={errors.kilometrage}
        placeholder="12450"
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="order-problem" className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Motivo de ingreso / Problema reportado *</label>
        <textarea
          id="order-problem"
          value={problem}
          onChange={e => setProblem(e.target.value)}
          rows={2}
          placeholder="Descripción del problema o servicio requerido..."
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#f97316] resize-none"
        />
        {errors.problem && <span className="text-xs text-[#ef4444]">{errors.problem}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="order-observations" className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Observaciones de recepción</label>
        <textarea
          id="order-observations"
          value={observations}
          onChange={e => setObservations(e.target.value)}
          rows={2}
          placeholder="Estado de la moto al ingresar, accesorios, etc."
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#f97316] resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-[#30363d]">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave} loading={saving}>Crear orden</Button>
      </div>
    </div>
  );
}
