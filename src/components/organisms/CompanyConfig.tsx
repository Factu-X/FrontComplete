import React, { useEffect, useState } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import Input from '../atoms/Input';
import Select from '../atoms/Select';
import { ToastItem } from '../molecules/ToastContainer';
import { apiRequest, ApiEntityResponse, ApiSession } from '../../lib/api';
import { canEditSettings } from '../../lib/roles';
import type { BackendConfiguracion, BackendEmpresa, BackendNumeracion, UserRole } from '../../lib/types';

type Tab = 'empresa' | 'numeracion' | 'dian';

type EmpresaForm = Record<
  'nit' | 'digitoVerificacion' | 'razonSocial' | 'nombreComercial' | 'tipoPersona' | 'regimenFiscal'
  | 'responsabilidadesFiscales' | 'direccion' | 'ciudad' | 'departamento' | 'codigoMunicipio' | 'telefono' | 'email',
  string
>;

type NumeracionForm = Record<
  'ambiente' | 'prefijoFacturacion' | 'numeroResolucion' | 'fechaResolucion' | 'rangoDesde' | 'rangoHasta'
  | 'vigenciaDesde' | 'vigenciaHasta',
  string
>;

const empresaForm = (e: BackendEmpresa | null): EmpresaForm => ({
  nit: e?.nit ?? '',
  digitoVerificacion: e?.digitoVerificacion ?? '',
  razonSocial: e?.razonSocial ?? '',
  nombreComercial: e?.nombreComercial ?? '',
  tipoPersona: e?.tipoPersona ?? 'JURIDICA',
  regimenFiscal: e?.regimenFiscal ?? '',
  responsabilidadesFiscales: e?.responsabilidadesFiscales ?? '',
  direccion: e?.direccion ?? '',
  ciudad: e?.ciudad ?? '',
  departamento: e?.departamento ?? '',
  codigoMunicipio: e?.codigoMunicipio ?? '',
  telefono: e?.telefono ?? '',
  email: e?.email ?? '',
});

const numeracionForm = (n: BackendNumeracion | null): NumeracionForm => ({
  ambiente: n?.ambiente ?? 'HABILITACION',
  prefijoFacturacion: n?.prefijoFacturacion ?? '',
  numeroResolucion: n?.numeroResolucion ?? '',
  fechaResolucion: n?.fechaResolucion ?? '',
  rangoDesde: n?.rangoDesde?.toString() ?? '',
  rangoHasta: n?.rangoHasta?.toString() ?? '',
  vigenciaDesde: n?.vigenciaDesde ?? '',
  vigenciaHasta: n?.vigenciaHasta ?? '',
});

const emptyToNull = (value: string) => (value.trim() ? value.trim() : null);

const ambienteOptions = [
  { value: 'HABILITACION', label: 'Habilitación / Pruebas' },
  { value: 'PRODUCCION', label: 'Producción' },
];

const tipoPersonaOptions = [
  { value: 'JURIDICA', label: 'Persona jurídica' },
  { value: 'NATURAL', label: 'Persona natural' },
];

const sectionTitle = 'sm:col-span-2 text-xs font-semibold text-[#8b949e] uppercase tracking-wider pb-1 border-b border-[#30363d]';

interface Props {
  session: ApiSession;
  userRole: UserRole;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
  onChanged?: (config: BackendConfiguracion) => void;
}

export default function CompanyConfigPage({ session, userRole, addToast, onChanged }: Props) {
  const canEdit = canEditSettings(userRole);
  const [config, setConfig] = useState<BackendConfiguracion | null>(null);
  const [tab, setTab] = useState<Tab>(canEdit ? 'empresa' : 'numeracion');
  const [empresa, setEmpresa] = useState<EmpresaForm>(empresaForm(null));
  const [numeracion, setNumeracion] = useState<NumeracionForm>(numeracionForm(null));
  const [cred, setCred] = useState({ softwareId: '', testSetId: '', pin: '', claveTecnica: '' });
  const [cert, setCert] = useState({ archivoBase64: '', nombre: '', password: '', expira: '' });
  const [saving, setSaving] = useState(false);

  function apply(next: BackendConfiguracion) {
    setConfig(next);
    setEmpresa(empresaForm(next.empresa));
    setNumeracion(numeracionForm(next.numeracion));
    setCred({ softwareId: next.credenciales?.softwareId ?? '', testSetId: next.credenciales?.testSetId ?? '', pin: '', claveTecnica: '' });
    setCert({ archivoBase64: '', nombre: '', password: '', expira: '' });
    onChanged?.(next);
  }

  useEffect(() => {
    apiRequest<ApiEntityResponse<BackendConfiguracion>>('/configuracion', session)
      .then(response => apply(response.data))
      .catch(error => addToast({ message: error instanceof Error ? error.message : 'No se pudo cargar la configuración', type: 'error' }));
  }, [session.token]);

  async function save(path: string, body: object, message: string) {
    setSaving(true);
    try {
      const response = await apiRequest<ApiEntityResponse<BackendConfiguracion>>(`/configuracion/${path}`, session, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      apply(response.data);
      addToast({ message, type: 'success' });
    } catch (error) {
      addToast({ message: error instanceof Error ? error.message : 'No se pudo guardar', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const saveEmpresa = () => save('empresa', {
    ...empresa,
    nombreComercial: emptyToNull(empresa.nombreComercial),
    regimenFiscal: emptyToNull(empresa.regimenFiscal),
  }, 'Datos de la empresa guardados');

  const saveNumeracion = () => save('numeracion', {
    ...numeracion,
    prefijoFacturacion: emptyToNull(numeracion.prefijoFacturacion),
    rangoDesde: Number(numeracion.rangoDesde),
    rangoHasta: Number(numeracion.rangoHasta),
  }, 'Numeración guardada');

  function saveCredenciales() {
    // Los secretos solo se envían si se escribieron: vacío significa "no cambiar".
    const body: Record<string, string | null> = {};
    if (cred.softwareId.trim()) body.softwareId = cred.softwareId.trim();
    body.testSetId = emptyToNull(cred.testSetId);
    if (cred.pin) body.pin = cred.pin;
    if (cred.claveTecnica) body.claveTecnica = cred.claveTecnica;
    return save('credenciales', body, 'Credenciales guardadas de forma segura');
  }

  function pickCertificate(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(',')[1] ?? '';
      setCert(c => ({ ...c, archivoBase64: base64, nombre: file.name }));
    };
    reader.readAsDataURL(file);
  }

  if (!config) {
    return <div className="py-24 text-center text-sm text-[#6e7681]">Cargando configuración...</div>;
  }

  const { estado, credenciales } = config;
  const n = config.numeracion;
  const rangoTotal = n?.rangoDesde != null && n.rangoHasta != null ? n.rangoHasta - n.rangoDesde + 1 : 0;
  const usados = rangoTotal - (n?.disponibles ?? 0);
  const rangePercent = rangoTotal ? Math.min(100, (usados / rangoTotal) * 100) : 0;
  const fieldE = (key: keyof EmpresaForm) => ({
    value: empresa[key],
    disabled: !canEdit,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEmpresa(f => ({ ...f, [key]: e.target.value })),
  });
  const fieldN = (key: keyof NumeracionForm) => ({
    value: numeracion[key],
    disabled: !canEdit,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNumeracion(f => ({ ...f, [key]: e.target.value })),
  });

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'empresa', label: 'Datos empresa', icon: '⊙' },
    { id: 'numeracion', label: 'Numeración DIAN', icon: '≡' },
    // HU-13: las credenciales y el certificado no son visibles para Facturación.
    ...(canEdit ? [{ id: 'dian' as Tab, label: 'Credenciales DIAN', icon: '◈' }] : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Configuración de Empresa y DIAN</h1>
          <p className="text-sm text-[#6e7681] mt-0.5">
            HU-13 · Parámetros fiscales y de facturación electrónica{!canEdit && ' · Solo consulta'}
          </p>
        </div>
        <Badge variant={estado.puedeEmitir ? 'active' : 'warning'}>
          {estado.puedeEmitir ? 'Lista para facturar' : 'Configuración incompleta'}
        </Badge>
      </div>

      {(!estado.puedeEmitir || !estado.puedeTransmitir) && (
        <div className="px-4 py-3 bg-yellow-500/10 border border-yellow-500/25 rounded-[6px] flex flex-col gap-1.5">
          {!estado.puedeEmitir && (
            <div>
              <div className="text-sm font-semibold text-yellow-300">⚠ No se pueden generar facturas</div>
              <div className="text-xs text-yellow-400/80">Falta: {estado.faltantesEmision.join(', ')}</div>
            </div>
          )}
          {estado.faltantesTransmision.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-yellow-300">⚠ No se podrán transmitir a la DIAN (HU-07)</div>
              <div className="text-xs text-yellow-400/80">Falta: {estado.faltantesTransmision.join(', ')}</div>
            </div>
          )}
        </div>
      )}

      <div className="flex border-b border-[#30363d]">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm border-b-2 transition-colors ${
              tab === t.id ? 'border-[#f97316] text-[#f97316] font-semibold' : 'border-transparent text-[#6e7681] hover:text-[#e6edf3]'
            }`}
          >
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-[8px] p-6">
        {tab === 'empresa' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={sectionTitle}>Identificación fiscal</div>
            <div className="flex gap-2">
              <div className="flex-1"><Input label="NIT (sin DV) *" placeholder="901234567" {...fieldE('nit')} /></div>
              <div className="w-20"><Input label="DV *" maxLength={1} placeholder="8" {...fieldE('digitoVerificacion')} /></div>
            </div>
            <Input label="Razón social *" {...fieldE('razonSocial')} />
            <Input label="Nombre comercial" {...fieldE('nombreComercial')} />
            <Select
              label="Tipo de persona *"
              options={tipoPersonaOptions}
              value={empresa.tipoPersona}
              disabled={!canEdit}
              onChange={e => setEmpresa(f => ({ ...f, tipoPersona: e.target.value }))}
            />
            <Input label="Responsabilidades fiscales (RUT) *" placeholder="O-13;O-15 o R-99-PN" {...fieldE('responsabilidadesFiscales')} />
            <Input label="Régimen fiscal" placeholder="Responsable de IVA" {...fieldE('regimenFiscal')} />
            <div className={`${sectionTitle} mt-2`}>Contacto y ubicación</div>
            <Input label="Dirección *" {...fieldE('direccion')} />
            <Input label="Ciudad / Municipio *" {...fieldE('ciudad')} />
            <Input label="Departamento *" {...fieldE('departamento')} />
            <Input label="Código DANE municipio *" maxLength={5} placeholder="05001" {...fieldE('codigoMunicipio')} />
            <Input label="Teléfono *" {...fieldE('telefono')} />
            <Input label="Correo de facturación *" type="email" {...fieldE('email')} />
            {canEdit && (
              <div className="sm:col-span-2 flex justify-end">
                <Button onClick={saveEmpresa} loading={saving}>Guardar datos de la empresa</Button>
              </div>
            )}
          </div>
        )}

        {tab === 'numeracion' && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={sectionTitle}>Resolución de numeración</div>
              <Select
                label="Ambiente DIAN *"
                options={ambienteOptions}
                value={numeracion.ambiente}
                disabled={!canEdit}
                onChange={e => setNumeracion(f => ({ ...f, ambiente: e.target.value }))}
              />
              <Input label="N° de resolución *" {...fieldN('numeroResolucion')} />
              <Input label="Fecha de resolución *" type="date" {...fieldN('fechaResolucion')} />
              <Input
                label="Prefijo (si aplica)"
                maxLength={4}
                placeholder="FE"
                {...fieldN('prefijoFacturacion')}
                onChange={e => setNumeracion(f => ({ ...f, prefijoFacturacion: e.target.value.toUpperCase() }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Desde *" type="number" min={1} {...fieldN('rangoDesde')} />
                <Input label="Hasta *" type="number" min={1} {...fieldN('rangoHasta')} />
              </div>
              <div />
              <Input label="Vigencia desde *" type="date" {...fieldN('vigenciaDesde')} />
              <Input label="Vigencia hasta *" type="date" {...fieldN('vigenciaHasta')} />
            </div>

            {n && n.rangoDesde != null && (
              <div className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-4 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#8b949e]">Uso del rango autorizado</span>
                  <span className="font-mono text-xs text-[#6e7681]">{usados} / {rangoTotal} facturas emitidas</span>
                </div>
                <div className="h-2 bg-[#21262d] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${rangePercent > 80 ? 'bg-red-500' : rangePercent > 60 ? 'bg-yellow-500' : 'bg-[#f97316]'}`}
                    style={{ width: `${rangePercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#6e7681] font-mono mt-1">
                  <span>{n.prefijoFacturacion ?? ''}{n.rangoDesde}</span>
                  <span className="text-[#f97316]">
                    Próxima: {n.prefijoFacturacion ?? ''}{n.siguienteConsecutivo} · {n.disponibles} disponibles
                  </span>
                  <span>{n.prefijoFacturacion ?? ''}{n.rangoHasta}</span>
                </div>
              </div>
            )}

            <p className="text-xs text-[#6e7681]">
              Registrar la resolución aquí no equivale a una autorización de la DIAN: los datos deben coincidir con la
              resolución expedida para el taller. El consecutivo lo asigna el sistema y nunca retrocede.
            </p>

            {canEdit && (
              <div className="flex justify-end">
                <Button onClick={saveNumeracion} loading={saving}>Guardar numeración</Button>
              </div>
            )}
          </div>
        )}

        {tab === 'dian' && credenciales && (
          <div className="flex flex-col gap-5">
            <div className="px-4 py-3 bg-[#f97316]/10 border border-[#f97316]/20 rounded-[6px] text-xs text-[#f97316]">
              🔒 El PIN, la clave técnica y la contraseña del certificado se guardan cifrados en Supabase Vault y el
              certificado en almacenamiento privado. Nunca se muestran de nuevo; deje un campo vacío para no cambiarlo.
              {!credenciales.servicioSecretosDisponible && ' El backend no tiene SUPABASE_SERVICE_ROLE_KEY: no se pueden guardar.'}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={sectionTitle}>Software de facturación (habilitación DIAN)</div>
              <Input label="Software ID *" value={cred.softwareId} onChange={e => setCred(c => ({ ...c, softwareId: e.target.value }))} />
              <Input label="TestSetId (habilitación)" value={cred.testSetId} onChange={e => setCred(c => ({ ...c, testSetId: e.target.value }))} />
              <Input
                label={`PIN del software * ${credenciales.pinConfigurado ? '(configurado)' : ''}`}
                type="password"
                autoComplete="new-password"
                placeholder={credenciales.pinConfigurado ? '•••••• (sin cambios)' : ''}
                value={cred.pin}
                onChange={e => setCred(c => ({ ...c, pin: e.target.value }))}
              />
              <Input
                label={`Clave técnica de la resolución * ${credenciales.claveTecnicaConfigurada ? '(configurada)' : ''}`}
                type="password"
                autoComplete="new-password"
                placeholder={credenciales.claveTecnicaConfigurada ? '•••••• (sin cambios)' : ''}
                value={cred.claveTecnica}
                onChange={e => setCred(c => ({ ...c, claveTecnica: e.target.value }))}
              />
              <div className="sm:col-span-2 flex justify-end">
                <Button onClick={saveCredenciales} loading={saving}>Guardar credenciales</Button>
              </div>
            </div>

            <div className="border border-[#30363d] rounded-[6px] p-4 flex flex-col gap-3">
              <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">Certificado digital (firma electrónica)</div>
              <div className="text-sm">
                {credenciales.certificadoCargado
                  ? <span className="text-emerald-400">✓ Certificado cargado · vence {credenciales.certificadoExpira}</span>
                  : <span className="text-[#6e7681]">Sin certificado. Se necesita para firmar y transmitir (HU-07).</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <label className="flex flex-col gap-1 text-xs text-[#8b949e]">
                  <span className="font-medium uppercase tracking-wider">Archivo .p12 / .pfx</span>
                  <input type="file" accept=".p12,.pfx" onChange={e => pickCertificate(e.target.files?.[0])} className="text-xs text-[#e6edf3]" />
                </label>
                <Input label="Contraseña" type="password" autoComplete="new-password" value={cert.password} onChange={e => setCert(c => ({ ...c, password: e.target.value }))} />
                <Input label="Fecha de vencimiento" type="date" value={cert.expira} onChange={e => setCert(c => ({ ...c, expira: e.target.value }))} />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => save('certificado', { archivoBase64: cert.archivoBase64, password: cert.password, expira: cert.expira }, 'Certificado cargado')}
                  loading={saving}
                  disabled={!cert.archivoBase64 || !cert.password || !cert.expira}
                >
                  {credenciales.certificadoCargado ? 'Reemplazar certificado' : 'Cargar certificado'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
