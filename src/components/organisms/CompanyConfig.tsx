import React, { useState } from 'react';
import Button from '../atoms/Button';
import Badge from '../atoms/Badge';
import Input from '../atoms/Input';
import Select from '../atoms/Select';
import { ToastItem } from '../molecules/ToastContainer';
import { CompanyConfig } from '../../types';

const REQUIRED_FIELDS: (keyof CompanyConfig)[] = [
  'nit', 'verificationDigit', 'businessName', 'address', 'city', 'phone', 'email',
  'invoicePrefix', 'resolutionNumber', 'resolutionDate', 'rangeFrom', 'rangeTo', 'validFrom', 'validTo',
];

function checkCompletion(cfg: CompanyConfig) {
  const missing = REQUIRED_FIELDS.filter(f => !cfg[f] || String(cfg[f]).trim() === '' || cfg[f] === 0);
  const hasCreds = cfg.dianClientId.trim() && cfg.dianClientSecret.trim();
  return { missing, hasCreds, complete: missing.length === 0 && hasCreds };
}

const dianEnvOptions = [
  { value: 'testing', label: 'Habilitación / Pruebas' },
  { value: 'production', label: 'Producción' },
];

type Tab = 'empresa' | 'numeracion' | 'dian';

interface Props {
  config: CompanyConfig;
  setConfig: React.Dispatch<React.SetStateAction<CompanyConfig>>;
  addToast: (t: Omit<ToastItem, 'id'>) => void;
}

export default function CompanyConfigPage({ config, setConfig, addToast }: Props) {
  const [tab, setTab] = useState<Tab>('empresa');
  const [draft, setDraft] = useState<CompanyConfig>({ ...config });
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [certFile, setCertFile] = useState<string>('');

  const { missing, hasCreds, complete } = checkCompletion(config);

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setConfig({ ...draft });
      addToast({ message: 'Configuración guardada correctamente', type: 'success' });
      setSaving(false);
    }, 600);
  }

  function handleDiscard() {
    setDraft({ ...config });
    addToast({ message: 'Cambios descartados', type: 'warning' });
  }

  const isDirty = JSON.stringify(draft) !== JSON.stringify(config);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'empresa', label: 'Datos empresa', icon: '⊙' },
    { id: 'numeracion', label: 'Numeración DIAN', icon: '≡' },
    { id: 'dian', label: 'Credenciales DIAN', icon: '◈' },
  ];

  const remaining = draft.rangeTo - draft.currentNumber;
  const rangePercent = Math.max(0, Math.min(100, ((draft.currentNumber - draft.rangeFrom) / (draft.rangeTo - draft.rangeFrom)) * 100));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#e6edf3]">Configuración de Empresa y DIAN</h1>
          <p className="text-sm text-[#6e7681] mt-0.5">HU-13 · Parámetros fiscales y de facturación electrónica</p>
        </div>
        {/* Config status badge */}
        <div className="flex items-center gap-2">
          <Badge variant={complete ? 'active' : 'warning'}>
            {complete ? 'Configuración completa' : `${missing.length} campo${missing.length > 1 ? 's' : ''} faltante${missing.length > 1 ? 's' : ''}`}
          </Badge>
        </div>
      </div>

      {/* Blocking alert */}
      {!complete && (
        <div className="px-4 py-3 bg-yellow-500/10 border border-yellow-500/25 rounded-[6px]">
          <div className="flex items-start gap-3">
            <span className="text-yellow-400 text-lg mt-0.5">⚠</span>
            <div>
              <div className="text-sm font-semibold text-yellow-300 mb-1">Configuración incompleta — No se pueden emitir documentos electrónicos</div>
              {missing.length > 0 && (
                <div className="text-xs text-yellow-400/80">
                  Campos requeridos faltantes: {missing.join(', ')}
                </div>
              )}
              {!hasCreds && (
                <div className="text-xs text-yellow-400/80 mt-0.5">Credenciales DIAN no configuradas.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#30363d] gap-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm border-b-2 transition-colors ${
              tab === t.id
                ? 'border-[#f97316] text-[#f97316] font-semibold'
                : 'border-transparent text-[#6e7681] hover:text-[#e6edf3]'
            }`}
          >
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-[8px] p-6">
        {tab === 'empresa' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 text-xs font-semibold text-[#8b949e] uppercase tracking-wider pb-1 border-b border-[#30363d]">Identificación fiscal</div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label="NIT *"
                  value={draft.nit}
                  onChange={e => setDraft(d => ({ ...d, nit: e.target.value }))}
                  placeholder="901234567"
                />
              </div>
              <div className="w-20">
                <Input
                  label="DV *"
                  value={draft.verificationDigit}
                  onChange={e => setDraft(d => ({ ...d, verificationDigit: e.target.value.slice(0, 1) }))}
                  placeholder="8"
                />
              </div>
            </div>
            <Input
              label="Razón social *"
              value={draft.businessName}
              onChange={e => setDraft(d => ({ ...d, businessName: e.target.value }))}
              placeholder="Taller Moto Express S.A.S."
            />
            <Input
              label="Nombre comercial"
              value={draft.tradeName}
              onChange={e => setDraft(d => ({ ...d, tradeName: e.target.value }))}
              placeholder="Moto Express"
            />
            <div className="sm:col-span-2 text-xs font-semibold text-[#8b949e] uppercase tracking-wider pb-1 border-b border-[#30363d] mt-2">Contacto y ubicación</div>
            <Input
              label="Dirección *"
              value={draft.address}
              onChange={e => setDraft(d => ({ ...d, address: e.target.value }))}
              placeholder="Cra 45 # 80-23, Local 2"
            />
            <Input
              label="Ciudad / Municipio *"
              value={draft.city}
              onChange={e => setDraft(d => ({ ...d, city: e.target.value }))}
              placeholder="Medellín, Antioquia"
            />
            <Input
              label="Teléfono *"
              value={draft.phone}
              onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))}
              placeholder="3004567890"
            />
            <Input
              label="Correo facturación *"
              type="email"
              value={draft.email}
              onChange={e => setDraft(d => ({ ...d, email: e.target.value }))}
              placeholder="facturacion@taller.co"
            />
          </div>
        )}

        {tab === 'numeracion' && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 text-xs font-semibold text-[#8b949e] uppercase tracking-wider pb-1 border-b border-[#30363d]">Autorización de numeración</div>
              <Input
                label="N° de resolución DIAN *"
                value={draft.resolutionNumber}
                onChange={e => setDraft(d => ({ ...d, resolutionNumber: e.target.value }))}
                placeholder="18764000000123"
              />
              <Input
                label="Fecha de resolución *"
                type="date"
                value={draft.resolutionDate}
                onChange={e => setDraft(d => ({ ...d, resolutionDate: e.target.value }))}
              />
              <div className="sm:col-span-2 text-xs font-semibold text-[#8b949e] uppercase tracking-wider pb-1 border-b border-[#30363d] mt-2">Rango y prefijo</div>
              <Input
                label="Prefijo facturación *"
                value={draft.invoicePrefix}
                onChange={e => setDraft(d => ({ ...d, invoicePrefix: e.target.value.toUpperCase() }))}
                placeholder="FE"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Desde *"
                  type="number"
                  value={draft.rangeFrom}
                  onChange={e => setDraft(d => ({ ...d, rangeFrom: Number(e.target.value) }))}
                  placeholder="1"
                />
                <Input
                  label="Hasta *"
                  type="number"
                  value={draft.rangeTo}
                  onChange={e => setDraft(d => ({ ...d, rangeTo: Number(e.target.value) }))}
                  placeholder="5000"
                />
              </div>
              <Input
                label="Vigencia desde *"
                type="date"
                value={draft.validFrom}
                onChange={e => setDraft(d => ({ ...d, validFrom: e.target.value }))}
              />
              <Input
                label="Vigencia hasta *"
                type="date"
                value={draft.validTo}
                onChange={e => setDraft(d => ({ ...d, validTo: e.target.value }))}
              />
            </div>

            {/* Usage gauge */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-[6px] px-4 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#8b949e]">Uso del rango de numeración</span>
                <span className="font-mono text-xs text-[#6e7681]">
                  {config.currentNumber - config.rangeFrom} / {config.rangeTo - config.rangeFrom} facturas emitidas
                </span>
              </div>
              <div className="h-2 bg-[#21262d] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${rangePercent > 80 ? 'bg-red-500' : rangePercent > 60 ? 'bg-yellow-500' : 'bg-[#f97316]'}`}
                  style={{ width: `${rangePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#6e7681] font-mono mt-1">
                <span>{config.invoicePrefix}-{String(config.rangeFrom).padStart(4, '0')}</span>
                <span className="text-[#f97316]">{remaining} disponibles</span>
                <span>{config.invoicePrefix}-{String(config.rangeTo).padStart(4, '0')}</span>
              </div>
              {new Date(config.validTo) < new Date() && (
                <div className="mt-2 text-xs text-red-400 flex items-center gap-1.5">
                  <span>⚠</span> La vigencia de la resolución ha vencido. Renueva antes de emitir facturas.
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'dian' && (
          <div className="flex flex-col gap-5">
            <div className="px-4 py-3 bg-[#f97316]/10 border border-[#f97316]/20 rounded-[6px] text-xs text-[#f97316]">
              ⚠ Las credenciales se gestionan solo en la interfaz y nunca se almacenan en el código fuente. En producción deben configurarse como variables de entorno seguras.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Select
                  label="Ambiente DIAN"
                  options={dianEnvOptions}
                  value={draft.dianEnv}
                  onChange={e => setDraft(d => ({ ...d, dianEnv: e.target.value as 'testing' | 'production' }))}
                />
              </div>
              <Input
                label="Client ID"
                value={draft.dianClientId}
                onChange={e => setDraft(d => ({ ...d, dianClientId: e.target.value }))}
                placeholder="dian-client-id"
              />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Client Secret</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={draft.dianClientSecret}
                    onChange={e => setDraft(d => ({ ...d, dianClientSecret: e.target.value }))}
                    placeholder="••••••••••••"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-[6px] px-3 py-2 pr-10 text-sm text-[#e6edf3] placeholder-[#6e7681] focus:outline-none focus:border-[#f97316]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e7681] hover:text-[#e6edf3] text-xs"
                  >
                    {showSecret ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              </div>
            </div>

            {/* Certificate */}
            <div className="border border-[#30363d] rounded-[6px] p-4 flex flex-col gap-3">
              <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">Certificado digital (firma electrónica)</div>
              {draft.hasCertificate ? (
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 text-lg">✓</span>
                  <div>
                    <div className="text-sm text-emerald-300 font-medium">{draft.certificateName}</div>
                    <div className="text-xs text-[#6e7681]">Certificado cargado</div>
                  </div>
                  <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setDraft(d => ({ ...d, hasCertificate: false, certificateName: '' }))}>
                    Eliminar
                  </Button>
                </div>
              ) : (
                <div>
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#30363d] rounded-[6px] px-6 py-6 cursor-pointer hover:border-[#f97316]/50 transition-colors">
                    <span className="text-2xl text-[#6e7681]">⊕</span>
                    <span className="text-sm text-[#6e7681]">Cargar certificado .p12 / .pfx</span>
                    <span className="text-xs text-[#6e7681]/60">Selecciona el archivo del certificado digital</span>
                    <input
                      type="file"
                      accept=".p12,.pfx"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setDraft(d => ({ ...d, hasCertificate: true, certificateName: file.name }));
                          setCertFile(file.name);
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Verification */}
            <div className="border border-[#30363d] rounded-[6px] p-4">
              <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-3">Verificación de configuración</div>
              <div className="space-y-2">
                {[
                  { label: 'Datos empresa completos', ok: ['nit','businessName','address','email'].every(f => !!config[f as keyof CompanyConfig]) },
                  { label: 'Numeración configurada', ok: !!(config.resolutionNumber && config.invoicePrefix && config.rangeFrom && config.rangeTo) },
                  { label: 'Vigencia activa', ok: config.validTo ? new Date(config.validTo) >= new Date() : false },
                  { label: 'Credenciales DIAN', ok: hasCreds },
                  { label: 'Certificado digital', ok: config.hasCertificate },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 text-sm">
                    <span className={item.ok ? 'text-emerald-400' : 'text-red-400'}>{item.ok ? '✓' : '✕'}</span>
                    <span className={item.ok ? 'text-[#e6edf3]' : 'text-[#6e7681]'}>{item.label}</span>
                    {!item.ok && <Badge variant="warning">Requerido</Badge>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {isDirty && (
          <Button variant="ghost" onClick={handleDiscard}>Descartar cambios</Button>
        )}
        <Button onClick={handleSave} loading={saving} disabled={!isDirty}>
          Guardar configuración
        </Button>
      </div>
    </div>
  );
}
