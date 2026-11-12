export type UserRole = 'admin' | 'billing' | 'operator';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
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
  // GET /clientes las incluye; el detalle y la creacion no.
  motocicletas?: BackendMotocicleta[];
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

export type EstadoDian = 'PENDIENTE_ENVIO' | 'ENVIADA' | 'VALIDADA' | 'RECHAZADA';
export type FormaPago = 'CONTADO' | 'CREDITO';

export type BackendFactura = {
  id: string;
  ordenId: string;
  clienteId: string;
  prefijo: string | null;
  consecutivo: number;
  numero: string;
  fechaEmision: string;
  fechaVencimiento: string | null;
  formaPago: FormaPago;
  subtotal: string;
  impuestos: string;
  total: string;
  cufe: string | null;
  xmlPath: string | null;
  estadoDian: EstadoDian;
  cliente: Pick<BackendCliente, 'id' | 'tipoIdentificacion' | 'numeroIdentificacion' | 'nombreRazonSocial'>;
  orden: {
    id: string;
    numero: string;
    motocicletaId: string;
    motocicleta: Pick<BackendMotocicleta, 'id' | 'placa' | 'marca' | 'modelo'>;
  };
};

export type BackendDetalleFactura = {
  id: string;
  codigoItem: string | null;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  tarifaIva: string;
  subtotal: string;
  impuesto: string;
  total: string;
  detalleOrden: { tipoItem: 'SERVICIO' | 'REPUESTO'; tratamientoIva: TratamientoIva } | null;
};

export type BackendFacturaCompleta = Omit<BackendFactura, 'cliente' | 'orden'> & {
  cliente: BackendCliente;
  orden: {
    id: string;
    numero: string;
    fechaIngreso: string;
    kilometrajeIngreso: number;
    motivoIngreso: string;
    motocicleta: BackendMotocicleta;
  };
  detallesFacturas: BackendDetalleFactura[];
};

export type BackendEmpresa = {
  nit: string;
  digitoVerificacion: string | null;
  razonSocial: string;
  nombreComercial: string | null;
  tipoPersona: 'JURIDICA' | 'NATURAL';
  regimenFiscal: string | null;
  responsabilidadesFiscales: string | null;
  direccion: string | null;
  ciudad: string | null;
  departamento: string | null;
  codigoMunicipio: string | null;
  telefono: string | null;
  email: string | null;
};

export type BackendNumeracion = {
  ambiente: 'HABILITACION' | 'PRODUCCION';
  prefijoFacturacion: string | null;
  numeroResolucion: string | null;
  fechaResolucion: string | null;
  rangoDesde: number | null;
  rangoHasta: number | null;
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
  consecutivoActual: number | null;
  siguienteConsecutivo: number | null;
  disponibles: number;
};

export type BackendConfiguracion = {
  empresa: BackendEmpresa | null;
  numeracion: BackendNumeracion | null;
  // Solo llega para el administrador (HU-13); nunca trae valores secretos.
  credenciales?: {
    softwareId: string | null;
    testSetId: string | null;
    pinConfigurado: boolean;
    claveTecnicaConfigurada: boolean;
    certificadoCargado: boolean;
    certificadoExpira: string | null;
    servicioSecretosDisponible: boolean;
  };
  estado: {
    puedeEmitir: boolean;
    faltantesEmision: string[];
    puedeTransmitir: boolean;
    faltantesTransmision: string[];
    advertencias: string[];
  };
};

export type BackendEnvioDian = {
  id: string;
  numeroIntento: number;
  fechaEnvio: string;
  estado: 'PENDIENTE' | 'ENVIADO' | 'VALIDADO' | 'RECHAZADO' | 'ERROR_CONEXION';
  codigoRespuesta: string | null;
  mensajeRespuesta: string | null;
};

export type ResultadoEnvioDian = {
  estado: 'VALIDADO' | 'RECHAZADO';
  codigo: string;
  mensaje: string;
  errores: { regla: string; mensaje: string }[];
};

export type TipoAjusteNota = 'TOTAL' | 'PARCIAL';

export type BackendNotaCredito = {
  id: string;
  facturaId: string;
  numero: string;
  tipoAjuste: TipoAjusteNota;
  motivo: string;
  fechaEmision: string;
  subtotal: string;
  impuestos: string;
  total: string;
  cude: string | null;
  estadoDian: EstadoDian;
  factura: {
    id: string;
    numero: string;
    cufe: string | null;
    fechaEmision: string;
    total: string;
    cliente: Pick<BackendCliente, 'id' | 'tipoIdentificacion' | 'numeroIdentificacion' | 'nombreRazonSocial'>;
  };
};

export type BackendDetalleNotaCredito = {
  id: string;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  tarifaIva: string;
  subtotal: string;
  impuesto: string;
  total: string;
  detalleFactura: { id: string; codigoItem: string | null; detalleOrden: { tipoItem: 'SERVICIO' | 'REPUESTO'; tratamientoIva: TratamientoIva } | null } | null;
};

export type BackendNotaCreditoCompleta = BackendNotaCredito & { detallesNotaCreditos: BackendDetalleNotaCredito[] };

export type LineaAcreditable = {
  id: string;
  codigoItem: string | null;
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  tarifaIva: string;
  tratamientoIva: TratamientoIva;
  disponible: string;
};

export type BackendAcreditable = {
  facturaId: string;
  numero: string;
  estadoDian: EstadoDian;
  puedeAcreditar: boolean;
  lineas: LineaAcreditable[];
};

export type Antiguedad = 'AL_DIA' | 'D1_30' | 'D31_60' | 'D61_90' | 'MAS_90';
export type EstadoPago = 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'ANULADA';
export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'OTRO';

export type CuentaFactura = {
  id: string;
  numero: string;
  fechaEmision: string;
  formaPago: FormaPago;
  vencimiento: string;
  estadoDian: EstadoDian;
  total: string;
  cliente: Pick<BackendCliente, 'id' | 'tipoIdentificacion' | 'numeroIdentificacion' | 'nombreRazonSocial' | 'telefono' | 'email'>;
  acreditado: string;
  pagado: string;
  saldo: string;
  diasVencida: number;
  antiguedad: Antiguedad;
  estadoPago: EstadoPago;
};

export type ResumenCartera = {
  porCobrar: string;
  vencido: string;
  facturasConSaldo: number;
  facturasVencidas: number;
  porAntiguedad: Record<Antiguedad, string>;
};

export type BackendCartera = { resumen: ResumenCartera; facturas: CuentaFactura[] };

export type BackendPago = {
  id: string;
  fechaPago: string;
  monto: string;
  metodoPago: MetodoPago;
  referencia: string | null;
  observaciones: string | null;
};

export type EstadoCuentaFactura = {
  facturaId: string;
  total: string;
  vencimiento: string;
  acreditado: string;
  pagado: string;
  saldo: string;
  diasVencida: number;
  antiguedad: Antiguedad;
  estadoPago: EstadoPago;
  pagos: BackendPago[];
  notasCredito: { id: string; numero: string; tipoAjuste: TipoAjusteNota; total: string; estadoDian: EstadoDian }[];
};

export type ReporteFacturacion = {
  rango: { desde: string; hasta: string };
  totales: {
    facturas: number;
    facturado: string;
    subtotal: string;
    iva: string;
    notasCredito: string;
    neto: string;
    recaudado: string;
    ticketPromedio: string;
  };
  porEstadoDian: Partial<Record<EstadoDian, number>>;
  porFormaPago: Partial<Record<FormaPago, number>>;
  recaudoPorMetodo: Partial<Record<MetodoPago, string>>;
  serie: { fecha: string; facturas: number; total: string }[];
  topItems: { codigo: string | null; descripcion: string; cantidad: string; total: string }[];
  topClientes: { id: string; nombre: string; documento: string; facturas: number; total: string }[];
  cartera: ResumenCartera;
};
