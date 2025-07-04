import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Profile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SharedOSS {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  user_id: string;
  date: string;
  shift_type: 'morning' | 'afternoon' | 'evening';
  max_stations: number;
  created_at: string;
  updated_at: string;
  assignments?: Assignment[];
}

export interface Assignment {
  id: string;
  user_id: string;
  employee_id: string;
  shift_id: string;
  station_number: number;
  created_at: string;
  updated_at: string;
  employee?: Employee | SharedOSS;
  shared_oss_id?: string;
}