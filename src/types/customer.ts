export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerWithStats extends Customer {
  totalRepairs: number;
  pendingRepairs: number;
  lastVisit: string | null;
  totalSpent: number;
}
