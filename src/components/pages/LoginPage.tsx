import React, { useState } from 'react';
import Button from '../atoms/Button';
import Input from '../atoms/Input';

interface LoginPageProps {
  onLogin: (email: string, role: 'admin' | 'operator') => void;
}

const DEMO_USERS = [
  { email: 'admin@factux.co', password: 'admin123', role: 'admin' as const },
  { email: 'pedro.mecanico@factux.co', password: 'operador123', role: 'operator' as const },
];

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Ingresa tu correo y contraseña.'); return; }
    setLoading(true);
    setTimeout(() => {
      const user = DEMO_USERS.find(u => u.email === email && u.password === password);
      if (user) {
        onLogin(user.email, user.role);
      } else {
        setError('Las credenciales ingresadas son incorrectas.');
      }
      setLoading(false);
    }, 800);
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#161b22] border-r border-[#30363d] p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 60px, #f97316 60px, #f97316 61px), repeating-linear-gradient(90deg, transparent, transparent 60px, #f97316 60px, #f97316 61px)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#f97316] rounded-[6px] flex items-center justify-center font-bold text-[#0d1117] text-lg">FX</div>
            <div>
              <div className="font-bold text-[#e6edf3] text-xl">FactuX</div>
              <div className="text-[10px] text-[#6e7681] font-mono uppercase tracking-widest">Sistema de Talleres</div>
            </div>
          </div>
        </div>
        <div className="relative z-10 space-y-8">
          <div className="space-y-2">
            <div className="text-4xl font-bold text-[#e6edf3] leading-tight">Gestión integral<br />de tu taller.</div>
            <p className="text-[#6e7681] text-base max-w-xs">Catálogo de servicios, clientes, motocicletas y facturación electrónica en un solo lugar.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Catálogo', desc: 'Servicios y repuestos' },
              { label: 'Clientes', desc: 'Y sus motocicletas' },
              { label: 'Órdenes', desc: 'Control del taller' },
              { label: 'Facturación', desc: 'Electrónica DIAN' },
            ].map(item => (
              <div key={item.label} className="bg-[#0d1117]/60 border border-[#30363d] rounded-[6px] px-4 py-3">
                <div className="text-sm font-semibold text-[#f97316]">{item.label}</div>
                <div className="text-xs text-[#6e7681] mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-xs text-[#6e7681] font-mono">Colombia · DIAN · 2025</div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-[#f97316] rounded flex items-center justify-center font-bold text-[#0d1117] text-sm">FX</div>
            <div className="font-bold text-[#e6edf3]">FactuX</div>
          </div>

          <h1 className="text-2xl font-bold text-[#e6edf3] mb-1">Iniciar sesión</h1>
          <p className="text-sm text-[#6e7681] mb-8">Accede a tu panel de gestión</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@factux.co"
              autoComplete="email"
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            {error && (
              <div className="px-4 py-3 rounded-[6px] bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-sm">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full mt-1" size="lg">
              Ingresar
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-[#161b22] border border-[#30363d] rounded-[6px]">
            <p className="text-xs text-[#6e7681] font-semibold mb-2 uppercase tracking-wider">Demo — credenciales de prueba</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-mono text-[#8b949e]">admin@factux.co</span>
                <span className="font-mono text-[#6e7681]">admin123</span>
                <span className="text-[#f97316]">Administrador</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-mono text-[#8b949e]">pedro.mecanico@factux.co</span>
                <span className="font-mono text-[#6e7681]">operador123</span>
                <span className="text-sky-400">Operador</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
