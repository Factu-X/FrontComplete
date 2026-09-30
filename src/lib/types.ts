export type UserRole = 'admin' | 'operator';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

export type BackendProfile = {
  id: string;
  nombre: string;
  rol: 'ADMINISTRADOR' | 'OPERADOR';
  activo: boolean;
};

export type BackendCliente = {
  id: string;
  tipoIdentificacion: 'CC' | 'CE' | 'NIT' | 'PASAPORTE';
  numeroIdentificacion: string;
  digitoVerificacion: string | null;
  nombreRazonSocial: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
};

export type BackendMotocicleta = {
  id: string;
  clienteId: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number | null;
  cilindraje: number | null;
  kilometrajeActual: number | null;
  activa: boolean;
};

export type BackendCatalogItem = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tipo: 'SERVICIO' | 'REPUESTO';
  precioVenta: string;
  tratamientoIva: 'GRAVADO' | 'EXENTO' | 'EXCLUIDO';
  tarifaIva: string;
  activo: boolean;
};

export type BackendOrden = {
  id: string;
  numero: string;
  clienteId: string;
  motocicletaId: string;
  estado: 'ABIERTA' | 'EN_PROCESO' | 'FINALIZADA' | 'CANCELADA';
  subtotal: string;
  impuestos: string;
  total: string;
};

export type BackendFactura = {
  id: string;
  ordenId: string;
  clienteId: string;
  prefijo: string | null;
  consecutivo: number;
  numero: string;
  fechaEmision: string;
  formaPago: 'CONTADO' | 'CREDITO';
  subtotal: string;
  impuestos: string;
  total: string;
  estadoDian: 'PENDIENTE_ENVIO' | 'ENVIADA' | 'VALIDADA' | 'RECHAZADA';
};
