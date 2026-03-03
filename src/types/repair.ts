export type RepairStatus = 
  | "received" 
  | "diagnosing" 
  | "waiting_for_parts" 
  | "repairing" 
  | "testing" 
  | "completed" 
  | "delivered";

export type PaymentStatus = "pending" | "paid" | "partial";

export interface RepairOrder {
  id: string;
  trackingId: string;
  customerName: string;
  customerPhone: string;
  mobileModel: string;
  mobileBrand: string;
  imeiNumber: string;
  issueDescription: string;
  repairDetails: string;
  status: RepairStatus;
  quotation: number;
  paymentStatus: PaymentStatus;
  paymentLink: string;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_LABELS: Record<RepairStatus, string> = {
  received: "Device Received",
  diagnosing: "Diagnosing Issue",
  waiting_for_parts: "Waiting for Parts",
  repairing: "Repairing",
  testing: "Testing",
  completed: "Repair Completed",
  delivered: "Delivered",
};

export const STATUS_ORDER: RepairStatus[] = [
  "received",
  "diagnosing",
  "waiting_for_parts",
  "repairing",
  "testing",
  "completed",
  "delivered",
];
