export type ApiRequestOptions = {
  token?: string | null;
  skipRefresh?: boolean;
};

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export type TripStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface CurrentUser {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  name: string;
  phone: string;
  role: string;
  companyId: string | null;
  driverId: string | null;
}

export interface Trip {
  id: string;
  status: TripStatus;
  originAddress: string;
  destinationAddress: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  truck?: {
    id: string;
    plateNumber: string;
    brand: string;
    model: string;
  };
}

export interface DriverProfile {
  id: string;
  licenseNumber: string;
  phone: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  user: {
    id: string;
    name: string;
    phone: string;
  };
}
