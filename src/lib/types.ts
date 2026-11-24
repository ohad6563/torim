export type Business = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  category: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
  timezone: string;
  slot_interval_min: number;
  min_notice_min: number;
  max_days_ahead: number;
};

export type Service = {
  id: string;
  business_id: string;
  name: string;
  duration_min: number;
  price: number | null;
  is_active: boolean;
  sort_order: number;
};

export type WorkingHours = {
  id: string;
  business_id: string;
  weekday: number;
  start_time: string; // "HH:MM:SS"
  end_time: string;
};

export type TimeOff = {
  id: string;
  business_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

export type Customer = {
  id: string;
  business_id: string;
  name: string;
  /** null for walk-ins without a number and for customers who deleted their account. */
  phone: string | null;
  notes: string | null;
  created_at: string;
};

export type AppointmentStatus = 'booked' | 'cancelled' | 'completed' | 'no_show';

export type Appointment = {
  id: string;
  business_id: string;
  service_id: string | null;
  customer_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  service_name: string;
  price: number | null;
  notes: string | null;
  source: 'online' | 'owner';
  local_date: string;
  customer_name: string;
  customer_phone: string | null;
};

export type PublicAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  service_name: string;
  price: number | null;
  customer_name: string;
  business_name: string;
  business_slug: string;
  business_phone: string | null;
  business_address: string | null;
  timezone: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  username: string | null;
  /** When the customer accepted the terms of use and privacy policy (migration 0005). */
  terms_accepted_at?: string | null;
};

export type MyAppointment = {
  id: string;
  cancel_token: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  service_name: string;
  price: number | null;
  business_name: string;
  business_slug: string;
  business_phone: string | null;
  business_address: string | null;
  timezone: string;
};
