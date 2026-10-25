// ─── Core entities ─────────────────────────────────────────────────────────

export interface Motorcycle {
  id: number;
  plate: string;
  brand: string;
  model: string;
  year: number;
}

export interface Customer {
  id: number;
  idType: string;
  idNumber: string;
  name: string;
  phone: string;
  email: string;
  motorcycles: Motorcycle[];
}

export interface CatalogItem {
  id: number;
  code: string;
  name: string;
  description: string;
  type: 'service' | 'part';
  price: number;
  active: boolean;
}

// ─── Orders ────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: number;
  catalogId: number;
  code: string;
  name: string;
  type: 'service' | 'part';
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export type OrderStatus = 'open' | 'in_process' | 'finished' | 'cancelled';

export interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  customerIdNumber: string;
  motorcycleId: number;
  motorcyclePlate: string;
  motorcycleBrand: string;
  motorcycleModel: string;
  motorcycleYear: number;
  createdAt: string;
  kilometrage: number;
  problem: string;
  observations: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotalServices: number;
  subtotalParts: number;
  tax: number;
  total: number;
}

// ─── Reminders (HU-11) ─────────────────────────────────────────────────────

export type ReminderStatus = 'pending' | 'completed' | 'cancelled';
export type ReminderTrigger = 'date' | 'km' | 'both';

export interface Reminder {
  id: number;
  motorcycleId: number;
  motorcyclePlate: string;
  motorcycleBrand: string;
  motorcycleModel: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  maintenanceType: string;
  triggerType: ReminderTrigger;
  scheduledDate?: string;
  scheduledKm?: number;
  observations: string;
  status: ReminderStatus;
  createdAt: string;
  completedAt?: string;
  notificationSent: boolean;
}

// ─── Company / DIAN config (HU-13) ────────────────────────────────────────

// ─── Invoices (HU-06 / HU-07 / HU-10) ────────────────────────────────────

export type InvoiceStatus = 'draft' | 'generated' | 'transmitted' | 'accepted' | 'cancelled';
export type DIANTransmissionStatus = 'pending' | 'sent' | 'validated' | 'rejected' | 'error';
export type PaymentType = 'cash' | 'credit';
export type PaymentStatus = 'pending' | 'partial' | 'paid';

export interface InvoiceItem {
  id: number;
  code: string;
  name: string;
  type: 'service' | 'part';
  quantity: number;
  unitPrice: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  orderId: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  customerIdType: string;
  customerIdNumber: string;
  customerEmail: string;
  customerPhone: string;
  motorcyclePlate: string;
  issuedAt: string;
  dueDate: string;
  paymentType: PaymentType;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  items: InvoiceItem[];
  subtotalServices: number;
  subtotalParts: number;
  taxBase: number;
  taxAmount: number;
  total: number;
  creditNotesTotal: number;       // sum of credit notes applied
  cufe: string;
  status: InvoiceStatus;
  dianStatus: DIANTransmissionStatus;
  dianResponse?: string;
  dianResponseCode?: string;
  transmissionAttempts: number;
  lastTransmissionAt?: string;
  observations: string;
}

// ─── Credit Notes (HU-08) ─────────────────────────────────────────────────

export type CreditNoteStatus = 'generated' | 'transmitted' | 'validated' | 'rejected';

export interface CreditNote {
  id: number;
  creditNoteNumber: string;
  cude: string;
  invoiceId: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  reasonCode: string;
  reason: string;
  amount: number;
  issuedAt: string;
  status: CreditNoteStatus;
  dianStatus: DIANTransmissionStatus;
  dianResponse?: string;
  transmissionAttempts: number;
  lastTransmissionAt?: string;
  observations: string;
}

// ─── Usability Testing (HU-14) ────────────────────────────────────────────

export interface SUSAnswer { question: number; score: number; }

export interface UsabilityFinding {
  id: number;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  screen: string;
  resolved: boolean;
}

export interface UsabilitySession {
  id: number;
  participantName: string;
  participantRole: string;
  sessionDate: string;
  tasksCompleted: number;
  totalTasks: number;
  observations: string;
  answers: SUSAnswer[];
  susScore: number;
  findings: UsabilityFinding[];
}
