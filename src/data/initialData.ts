import { Customer, CatalogItem, Order, Reminder, CompanyConfig, Invoice, CreditNote, UsabilitySession } from '../types';

export const initialCustomers: Customer[] = [
  {
    id: 1, idType: 'CC', idNumber: '1098765432', name: 'Juan Carlos Pérez', phone: '3201234567', email: 'juanperez@gmail.com',
    motorcycles: [
      { id: 1, plate: 'BYK456', brand: 'Yamaha', model: 'FZ25', year: 2021 },
      { id: 2, plate: 'MNO789', brand: 'Honda', model: 'CB190R', year: 2020 },
    ],
  },
  {
    id: 2, idType: 'CC', idNumber: '52456789', name: 'María Fernanda Gómez', phone: '3156789012', email: 'mfgomez@outlook.com',
    motorcycles: [{ id: 3, plate: 'QRS321', brand: 'Suzuki', model: 'GN125', year: 2019 }],
  },
  {
    id: 3, idType: 'NIT', idNumber: '900234567-1', name: 'Transportes Veloces S.A.S', phone: '6014567890', email: 'admin@tveloces.co',
    motorcycles: [],
  },
];

export const initialCatalog: CatalogItem[] = [
  { id: 1, code: 'SRV-001', name: 'Cambio de aceite', description: 'Cambio de aceite de motor 4T', type: 'service', price: 45000, active: true },
  { id: 2, code: 'SRV-002', name: 'Afinación general', description: 'Revisión y ajuste de carburación, bujía y frenos', type: 'service', price: 120000, active: true },
  { id: 3, code: 'REP-001', name: 'Filtro de aire', description: 'Filtro de aire universal para 125cc', type: 'part', price: 28000, active: true },
  { id: 4, code: 'REP-002', name: 'Bujía NGK', description: 'Bujía original NGK CR7HSA', type: 'part', price: 18500, active: true },
  { id: 5, code: 'SRV-003', name: 'Lavado completo', description: 'Lavado exterior y engrase de cadena', type: 'service', price: 35000, active: false },
];

export const initialOrders: Order[] = [
  {
    id: 1, orderNumber: 'ORD-2026-001',
    customerId: 1, customerName: 'Juan Carlos Pérez', customerIdNumber: '1098765432',
    motorcycleId: 1, motorcyclePlate: 'BYK456', motorcycleBrand: 'Yamaha', motorcycleModel: 'FZ25', motorcycleYear: 2021,
    createdAt: '2026-09-10T09:15:00', kilometrage: 12450,
    problem: 'Cambio de aceite programado y revisión general',
    observations: 'Ruido leve en cadena. Se lubricó y ajustó tensión.',
    status: 'finished',
    items: [
      { id: 1, catalogId: 1, code: 'SRV-001', name: 'Cambio de aceite', type: 'service', quantity: 1, unitPrice: 45000, subtotal: 45000 },
      { id: 2, catalogId: 2, code: 'SRV-002', name: 'Afinación general', type: 'service', quantity: 1, unitPrice: 120000, subtotal: 120000 },
      { id: 3, catalogId: 4, code: 'REP-002', name: 'Bujía NGK', type: 'part', quantity: 1, unitPrice: 18500, subtotal: 18500 },
    ],
    subtotalServices: 165000, subtotalParts: 18500, tax: 3515, total: 187015,
  },
  {
    id: 2, orderNumber: 'ORD-2026-002',
    customerId: 2, customerName: 'María Fernanda Gómez', customerIdNumber: '52456789',
    motorcycleId: 3, motorcyclePlate: 'QRS321', motorcycleBrand: 'Suzuki', motorcycleModel: 'GN125', motorcycleYear: 2019,
    createdAt: '2026-09-18T14:30:00', kilometrage: 28700,
    problem: 'Moto no enciende fácilmente, consume mucha gasolina',
    observations: '',
    status: 'finished',
    items: [
      { id: 4, catalogId: 2, code: 'SRV-002', name: 'Afinación general', type: 'service', quantity: 1, unitPrice: 120000, subtotal: 120000 },
      { id: 5, catalogId: 3, code: 'REP-001', name: 'Filtro de aire', type: 'part', quantity: 1, unitPrice: 28000, subtotal: 28000 },
      { id: 6, catalogId: 4, code: 'REP-002', name: 'Bujía NGK', type: 'part', quantity: 2, unitPrice: 18500, subtotal: 37000 },
    ],
    subtotalServices: 120000, subtotalParts: 65000, tax: 12350, total: 197350,
  },
  {
    id: 3, orderNumber: 'ORD-2026-003',
    customerId: 1, customerName: 'Juan Carlos Pérez', customerIdNumber: '1098765432',
    motorcycleId: 2, motorcyclePlate: 'MNO789', motorcycleBrand: 'Honda', motorcycleModel: 'CB190R', motorcycleYear: 2020,
    createdAt: '2026-09-22T11:00:00', kilometrage: 9300,
    problem: 'Mantenimiento preventivo 10.000 km',
    observations: '',
    status: 'open',
    items: [
      { id: 7, catalogId: 1, code: 'SRV-001', name: 'Cambio de aceite', type: 'service', quantity: 1, unitPrice: 45000, subtotal: 45000 },
    ],
    subtotalServices: 45000, subtotalParts: 0, tax: 0, total: 45000,
  },
];

export const initialReminders: Reminder[] = [
  {
    id: 1, motorcycleId: 1, motorcyclePlate: 'BYK456', motorcycleBrand: 'Yamaha', motorcycleModel: 'FZ25',
    customerId: 1, customerName: 'Juan Carlos Pérez', customerEmail: 'juanperez@gmail.com',
    maintenanceType: 'Cambio de aceite', triggerType: 'both',
    scheduledDate: '2026-10-10', scheduledKm: 14500,
    observations: 'Siguiente cambio de aceite.', status: 'pending',
    createdAt: '2026-09-10T09:45:00', notificationSent: false,
  },
  {
    id: 2, motorcycleId: 3, motorcyclePlate: 'QRS321', motorcycleBrand: 'Suzuki', motorcycleModel: 'GN125',
    customerId: 2, customerName: 'María Fernanda Gómez', customerEmail: 'mfgomez@outlook.com',
    maintenanceType: 'Revisión de frenos', triggerType: 'date',
    scheduledDate: '2026-09-20',
    observations: 'Revisar pastillas traseras.', status: 'pending',
    createdAt: '2026-09-18T15:00:00', notificationSent: true,
  },
];

export const initialCompanyConfig: CompanyConfig = {
  nit: '901234567', verificationDigit: '8',
  businessName: 'Taller Moto Express S.A.S.', tradeName: 'Moto Express',
  address: 'Cra 45 # 80-23, Local 2', city: 'Medellín, Antioquia',
  phone: '3004567890', email: 'facturacion@motoexpress.co',
  invoicePrefix: 'FE', resolutionNumber: '18764000000123', resolutionDate: '2026-01-15',
  rangeFrom: 1, rangeTo: 5000, validFrom: '2026-01-15', validTo: '2027-01-15',
  currentNumber: 3,
  dianEnv: 'testing', dianClientId: 'demo-client-id', dianClientSecret: 'demo-secret',
  hasCertificate: false, certificateName: '',
};

export const initialInvoices: Invoice[] = [
  {
    id: 1, invoiceNumber: 'FE-0001', orderId: 1, orderNumber: 'ORD-2026-001',
    customerId: 1, customerName: 'Juan Carlos Pérez', customerIdType: 'CC', customerIdNumber: '1098765432',
    customerEmail: 'juanperez@gmail.com', customerPhone: '3201234567', motorcyclePlate: 'BYK456',
    issuedAt: '2026-09-10T10:00:00', dueDate: '2026-09-10',
    paymentType: 'cash', paymentStatus: 'paid', paidAmount: 187015,
    items: [
      { id: 1, code: 'SRV-001', name: 'Cambio de aceite', type: 'service', quantity: 1, unitPrice: 45000, subtotal: 45000, taxRate: 0, taxAmount: 0, total: 45000 },
      { id: 2, code: 'SRV-002', name: 'Afinación general', type: 'service', quantity: 1, unitPrice: 120000, subtotal: 120000, taxRate: 0, taxAmount: 0, total: 120000 },
      { id: 3, code: 'REP-002', name: 'Bujía NGK', type: 'part', quantity: 1, unitPrice: 18500, subtotal: 18500, taxRate: 19, taxAmount: 3515, total: 22015 },
    ],
    subtotalServices: 165000, subtotalParts: 18500, taxBase: 18500, taxAmount: 3515, total: 187015,
    creditNotesTotal: 0,
    cufe: 'a3f7b91c2d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b',
    status: 'accepted', dianStatus: 'validated',
    dianResponse: 'Documento validado exitosamente por la DIAN.',
    dianResponseCode: 'ZD09',
    transmissionAttempts: 1, lastTransmissionAt: '2026-09-10T10:05:00',
    observations: '',
  },
  {
    id: 2, invoiceNumber: 'FE-0002', orderId: 2, orderNumber: 'ORD-2026-002',
    customerId: 2, customerName: 'María Fernanda Gómez', customerIdType: 'CC', customerIdNumber: '52456789',
    customerEmail: 'mfgomez@outlook.com', customerPhone: '3156789012', motorcyclePlate: 'QRS321',
    issuedAt: '2026-09-18T15:00:00', dueDate: '2026-09-25',
    paymentType: 'credit', paymentStatus: 'pending', paidAmount: 0,
    items: [
      { id: 4, code: 'SRV-002', name: 'Afinación general', type: 'service', quantity: 1, unitPrice: 120000, subtotal: 120000, taxRate: 0, taxAmount: 0, total: 120000 },
      { id: 5, code: 'REP-001', name: 'Filtro de aire', type: 'part', quantity: 1, unitPrice: 28000, subtotal: 28000, taxRate: 19, taxAmount: 5320, total: 33320 },
      { id: 6, code: 'REP-002', name: 'Bujía NGK', type: 'part', quantity: 2, unitPrice: 18500, subtotal: 37000, taxRate: 19, taxAmount: 7030, total: 44030 },
    ],
    subtotalServices: 120000, subtotalParts: 65000, taxBase: 65000, taxAmount: 12350, total: 197350,
    creditNotesTotal: 0,
    cufe: 'b4e8c02d3e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0b2c',
    status: 'generated', dianStatus: 'pending',
    transmissionAttempts: 0,
    observations: 'Pago acordado 7 días.',
  },
  {
    id: 3, invoiceNumber: 'FE-0003', orderId: 99, orderNumber: 'ORD-2026-000',
    customerId: 3, customerName: 'Transportes Veloces S.A.S', customerIdType: 'NIT', customerIdNumber: '900234567-1',
    customerEmail: 'admin@tveloces.co', customerPhone: '6014567890', motorcyclePlate: '—',
    issuedAt: '2026-09-05T09:00:00', dueDate: '2026-09-19',
    paymentType: 'credit', paymentStatus: 'partial', paidAmount: 50000,
    items: [
      { id: 7, code: 'SRV-002', name: 'Afinación general', type: 'service', quantity: 3, unitPrice: 120000, subtotal: 360000, taxRate: 0, taxAmount: 0, total: 360000 },
    ],
    subtotalServices: 360000, subtotalParts: 0, taxBase: 0, taxAmount: 0, total: 360000,
    creditNotesTotal: 0,
    cufe: 'c5f9d13e4f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0c3d',
    status: 'transmitted', dianStatus: 'sent',
    transmissionAttempts: 1, lastTransmissionAt: '2026-09-05T09:10:00',
    observations: '',
  },
];

export const initialCreditNotes: CreditNote[] = [
  {
    id: 1, creditNoteNumber: 'NC-0001', cude: 'd6a0e24f5a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0d4e',
    invoiceId: 1, invoiceNumber: 'FE-0001',
    customerId: 1, customerName: 'Juan Carlos Pérez',
    reasonCode: '2', reason: 'Descuento comercial',
    amount: 10000,
    issuedAt: '2026-09-12T11:00:00',
    status: 'validated', dianStatus: 'validated',
    dianResponse: 'Nota crédito validada por la DIAN.',
    transmissionAttempts: 1, lastTransmissionAt: '2026-09-12T11:05:00',
    observations: 'Descuento acordado post-facturación.',
  },
];

export const initialUsabilitySessions: UsabilitySession[] = [
  {
    id: 1,
    participantName: 'Carlos M.',
    participantRole: 'Mecánico / Administrador',
    sessionDate: '2026-09-25',
    tasksCompleted: 4,
    totalTasks: 5,
    observations: 'Dificultad para encontrar el historial de moto. El formulario de orden es intuitivo.',
    answers: [1,2,3,4,5,6,7,8,9,10].map((q,i) => ({ question: q, score: [4,2,4,2,4,1,4,2,4,2][i] })),
    susScore: 72.5,
    findings: [
      { id: 1, description: 'Historial de moto difícil de localizar desde clientes', priority: 'high', screen: 'Clientes', resolved: false },
      { id: 2, description: 'Botón "Facturar" confundido con "Ver detalle"', priority: 'medium', screen: 'Órdenes', resolved: false },
    ],
  },
];
