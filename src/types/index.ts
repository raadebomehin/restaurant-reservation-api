export interface Restaurant {
  id?: number;
  name: string;
  opening_time: string;
  closing_time: string;
  total_tables: number;
  created_at?: string;
  updated_at?: string;
}

export interface Table {
  id?: number;
  restaurant_id: number;
  table_number: number;
  capacity: number;
  is_available?: boolean;
  created_at?: string;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Reservation {
  id?: number;
  restaurant_id: number;
  table_id: number;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  duration_hours: number;
  status: ReservationStatus;
  created_at?: string;
  updated_at?: string;
}

export interface TimeSlot {
  time: string;
  availableTables: number;
}

export interface AvailabilityResult {
  available: boolean;
  tables: TableWithOptimal[];
  alternativeSlots?: TimeSlot[];
}

export interface TableWithOptimal extends Table {
  isOptimal?: boolean;
}

export interface ReservationWithDetails extends Reservation {
  table_number?: number;
  end_time?: string;
}

export interface ApiError {
  message: string;
  code: string;
  details?: any;
}