export type Role = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'DISPATCHER' | 'DRIVER';
export type TripStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type AlertType = 'SPEEDING' | 'GEOFENCE_EXIT' | 'IDLE' | 'SOS' | 'ROUTE_DEVIATION';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface Company {
  id: string;
  name: string;
  taxId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  isActive: boolean;
  isOnline: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface Truck {
  id: string;
  companyId: string;
  plateNumber: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  capacityTons: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface Trip {
  id: string;
  companyId: string;
  driverId: string | null;
  truckId: string | null;
  driver: Driver | null;
  truck: Truck | null;
  origin: string;
  destination: string;
  originLat: number | null;
  originLng: number | null;
  destinationLat: number | null;
  destinationLng: number | null;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  status: TripStatus;
  notes: string | null;
  createdAt: string;
}

export interface Alert {
  id: string;
  companyId: string;
  driverId: string | null;
  tripId: string | null;
  type: AlertType;
  severity: Severity;
  message: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface LiveDriver {
  driverId: string;
  firstName: string;
  lastName: string;
  lat: number;
  lng: number;
  speedKmh: number | null;
  heading: number | null;
  isOnline: boolean;
  lastSeenAt: string | null;
  tripId: string | null;
}

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  companyId: string | null;
}
