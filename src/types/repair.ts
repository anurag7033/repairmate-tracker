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
  advancePaid: number;
  discountAmount: number;
  paymentStatus: PaymentStatus;
  paymentLink: string;
  createdAt: string;
  updatedAt: string;
}

export const COMMON_ISSUES = [
  "Screen Replacement",
  "Battery Replacement",
  "Charging Port Repair / Replacement",
  "Speaker Repair",
  "Microphone Repair",
  "Camera Replacement (Front)",
  "Camera Replacement (Rear)",
  "Back Glass Replacement",
  "Power Button Repair",
  "Volume Button Repair",
  "SIM Tray Repair",
  "Software Issue",
  "Water Damage Repair",
  "Motherboard Repair",
  "Other",
];

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
