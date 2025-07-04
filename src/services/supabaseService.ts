import { supabase } from '../lib/supabase';
import type { Employee, Shift, Assignment } from '../lib/supabase';

// Station names configuration
export const STATION_NAMES = {
  morning: ['S1', 'S2', 'S3', 'OBI', 'FLUSSO', 'JOLLY', 'A.R', 'ALA EST'],
  afternoon: ['S1', 'S2', 'S3', 'OBI', 'FLUSSO', 'JOLLY', 'A.R', 'ALA EST'],
  evening: ['S1', 'S2', 'S3', 'OBI', 'FLUSSO', 'JOLLY/PEDIATRIA']
};

// Shared OSS interface
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

// Employee services - now using shared OSS
export const employeeService = {
  getAll: async (): Promise<SharedOSS[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utente non autenticato');

    const { data, error } = await supabase
      .from('shared_oss')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching shared OSS:', error);
      throw new Error('Errore nel caricamento degli OSS');
    }

    return data || [];
  },

  create: async (employee: Omit<SharedOSS, 'id' | 'created_at' | 'updated_at'>): Promise<SharedOSS> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utente non autenticato');

    // For now, we don't allow creating new shared OSS from the frontend
    // This would typically be an admin-only function
    throw new Error('La creazione di nuovi OSS non è consentita. Contatta l\'amministratore.');
  },

  update: async (id: string, employee: Omit<SharedOSS, 'id' | 'created_at' | 'updated_at'>): Promise<SharedOSS> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utente non autenticato');

    // For now, we don't allow updating shared OSS from the frontend
    // This would typically be an admin-only function
    throw new Error('La modifica degli OSS non è consentita. Contatta l\'amministratore.');
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utente non autenticato');

    // For now, we don't allow deleting shared OSS from the frontend
    // This would typically be an admin-only function
    throw new Error('L\'eliminazione degli OSS non è consentita. Contatta l\'amministratore.');
  }
};

// Shift services
export const shiftService = {
  getAll: async (): Promise<Shift[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utente non autenticato');

    const { data, error } = await supabase
      .from('shifts')
      .select(`
        *,
        assignments (
          *,
          employee:shared_oss!employee_id(*)
        )
      `)
      .eq('user_id', user.id)
      .order('date');

    if (error) {
      console.error('Error fetching shifts:', error);
      throw new Error('Errore nel caricamento dei turni');
    }

    // Transform the data to match the expected format
    const transformedData = data?.map(shift => ({
      ...shift,
      assignments: shift.assignments?.map((assignment: any) => ({
        ...assignment,
        employee: assignment.employee
      })) || []
    })) || [];

    return transformedData;
  },

  getByDate: async (date: string): Promise<Shift[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utente non autenticato');

    const { data: existingShifts, error: fetchError } = await supabase
      .from('shifts')
      .select(`
        *,
        assignments (
          *,
          employee:shared_oss!employee_id(*)
        )
      `)
      .eq('user_id', user.id)
      .eq('date', date)
      .order('shift_type');

    if (fetchError) {
      console.error('Error fetching shifts by date:', fetchError);
      throw new Error('Errore nel caricamento dei turni');
    }

    // Transform the data to match the expected format
    let transformedShifts = existingShifts?.map(shift => ({
      ...shift,
      assignments: shift.assignments?.map((assignment: any) => ({
        ...assignment,
        employee: assignment.employee
      })) || []
    })) || [];

    // If no shifts exist for this date, create missing shifts
    if (!transformedShifts || transformedShifts.length === 0) {
      // Create all three default shifts
      const defaultShifts = [
        { 
          date, 
          shift_type: 'morning' as const, 
          max_stations: STATION_NAMES.morning.length,
          user_id: user.id
        },
        { 
          date, 
          shift_type: 'afternoon' as const, 
          max_stations: STATION_NAMES.afternoon.length,
          user_id: user.id
        },
        { 
          date, 
          shift_type: 'evening' as const, 
          max_stations: STATION_NAMES.evening.length,
          user_id: user.id
        }
      ];

      const { data: newShifts, error: createError } = await supabase
        .from('shifts')
        .insert(defaultShifts)
        .select(`
          *,
          assignments (
            *,
            employee:shared_oss!employee_id(*)
          )
        `);

      if (createError) {
        console.error('Error creating default shifts:', createError);
        throw new Error('Errore nella creazione dei turni');
      }

      transformedShifts = newShifts?.map(shift => ({
        ...shift,
        assignments: shift.assignments?.map((assignment: any) => ({
          ...assignment,
          employee: assignment.employee
        })) || []
      })) || [];
    } else {
      // Check if we have all three shift types, create missing ones
      const existingShiftTypes = transformedShifts.map(shift => shift.shift_type);
      const allShiftTypes = ['morning', 'afternoon', 'evening'] as const;
      const missingShiftTypes = allShiftTypes.filter(type => !existingShiftTypes.includes(type));

      if (missingShiftTypes.length > 0) {
        const missingShifts = missingShiftTypes.map(shiftType => ({
          date,
          shift_type: shiftType,
          max_stations: STATION_NAMES[shiftType].length,
          user_id: user.id
        }));

        const { data: newShifts, error: createError } = await supabase
          .from('shifts')
          .insert(missingShifts)
          .select(`
            *,
            assignments (
              *,
              employee:shared_oss!employee_id(*)
            )
          `);

        if (createError) {
          console.error('Error creating missing shifts:', createError);
          // Don't throw error here, just log it and continue with existing shifts
        } else {
          // Add the new shifts to the existing ones
          const transformedNewShifts = newShifts?.map(shift => ({
            ...shift,
            assignments: shift.assignments?.map((assignment: any) => ({
              ...assignment,
              employee: assignment.employee
            })) || []
          })) || [];

          transformedShifts = [...transformedShifts, ...transformedNewShifts];
        }
      }

      // Final fetch to ensure we have all shifts for the date
      const { data: finalShifts, error: finalError } = await supabase
        .from('shifts')
        .select(`
          *,
          assignments (
            *,
            employee:shared_oss!employee_id(*)
          )
        `)
        .eq('user_id', user.id)
        .eq('date', date)
        .order('shift_type');

      if (!finalError && finalShifts) {
        transformedShifts = finalShifts.map(shift => ({
          ...shift,
          assignments: shift.assignments?.map((assignment: any) => ({
            ...assignment,
            employee: assignment.employee
          })) || []
        }));
      }
    }

    return transformedShifts;
  }
};

// Assignment services
export const assignmentService = {
  create: async (assignment: {
    employee_id: string;
    shift_id: string;
    station_number: number;
  }): Promise<Assignment> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utente non autenticato');

    // Check if station is already occupied
    const { data: existingAssignment, error: stationError } = await supabase
      .from('assignments')
      .select('id')
      .eq('shift_id', assignment.shift_id)
      .eq('station_number', assignment.station_number)
      .eq('user_id', user.id);

    if (stationError && stationError.code !== 'PGRST116') {
      console.error('Error checking existing station assignment:', stationError);
      throw new Error('Errore nella verifica della postazione');
    }

    if (existingAssignment && existingAssignment.length > 0) {
      throw new Error('Postazione già occupata');
    }

    // Check if OSS is already assigned to this shift
    const { data: existingOSSAssignment, error: ossError } = await supabase
      .from('assignments')
      .select('id')
      .eq('shift_id', assignment.shift_id)
      .eq('employee_id', assignment.employee_id)
      .eq('user_id', user.id);

    if (ossError && ossError.code !== 'PGRST116') {
      console.error('Error checking existing OSS assignment:', ossError);
      throw new Error('Errore nella verifica dell\'assegnazione OSS');
    }

    if (existingOSSAssignment && existingOSSAssignment.length > 0) {
      throw new Error('OSS già assegnato a questo turno');
    }

    const { data, error } = await supabase
      .from('assignments')
      .insert([{
        employee_id: assignment.employee_id,
        shift_id: assignment.shift_id,
        station_number: assignment.station_number,
        user_id: user.id
      }])
      .select(`
        *,
        employee:shared_oss!employee_id(*)
      `)
      .single();

    if (error) {
      console.error('Error creating assignment:', error);
      throw new Error('Errore nell\'assegnazione');
    }

    // Transform the response to match expected format
    return {
      ...data,
      employee: data.employee
    };
  },

  update: async (assignmentId: string, updates: { station_number: number }): Promise<Assignment> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utente non autenticato');

    const { data, error } = await supabase
      .from('assignments')
      .update(updates)
      .eq('id', assignmentId)
      .eq('user_id', user.id)
      .select(`
        *,
        employee:shared_oss!employee_id(*)
      `)
      .single();

    if (error) {
      console.error('Error updating assignment:', error);
      throw new Error('Errore nell\'aggiornamento dell\'assegnazione');
    }

    // Transform the response to match expected format
    return {
      ...data,
      employee: data.employee
    };
  },

  delete: async (assignmentId: string): Promise<{ message: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utente non autenticato');

    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting assignment:', error);
      throw new Error('Errore nell\'eliminazione dell\'assegnazione');
    }

    return { message: 'Assegnazione eliminata' };
  }
};