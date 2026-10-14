export type UserRole = 'admin' | 'billing' | 'operator';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

export type BackendRol = 'ADMINISTRADOR' | 'FACTURACION' | 'OPERADOR';

export type BackendProfile = {
  id: string;
  nombre: string;
  rol: BackendRol;
  activo: boolean;
};

export type BackendUsuario = BackendProfile & {
  email: string | null;
  createdAt: string;
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

export type TratamientoIva = 'GRAVADO' | 'EXENTO' | 'EXCLUIDO';

export type BackendCatalogItem = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tipo: 'SERVICIO' | 'REPUESTO';
  precioVenta: string;
  tratamientoIva: TratamientoIva;
  tarifaIva: string;
  activo: boolean;
};

export type EstadoOrden = 'ABIERTA' | 'EN_PROCESO' | 'FINALIZADA' | 'CANCELADA';

export type BackendOrden = {
  id: string;
  numero: string;
  clienteId: string;
  motocicletaId: string;
  fechaIngreso: string;
  kilometrajeIngreso: number;
  motivoIngreso: string;
  observaciones: string | null;
  estado: EstadoOrden;
  subtotal: string;
  impuestos: string;
  total: string;
  finalizadaAt: string | null;
  cliente?: BackendCliente;
  motocicleta?: BackendMotocicleta;
};

export type BackendDetalleOrden = {
  id: string;
  ordenId: string;
  itemCatalogoId: string;
  codigoItem: string;
  nombreItem: string;
  tipoItem: 'SERVICIO' | 'REPUESTO';
  cantidad: string;
  precioUnitario: string;
  tratamientoIva: TratamientoIva;
  tarifaIva: string;
  subtotal: string;
  impuesto: string;
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
