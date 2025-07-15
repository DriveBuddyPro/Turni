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

    try {
      // Prima prova a recuperare i turni esistenti
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

      // Se non ci sono turni per questa data, crea i turni di default
      if (!transformedShifts || transformedShifts.length === 0) {
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

        // Usa upsert per evitare conflitti
        const { data: newShifts, error: createError } = await supabase
          .from('shifts')
          .upsert(defaultShifts, { 
            onConflict: 'user_id,date,shift_type',
            ignoreDuplicates: false 
          })
          .select(`
            *,
            assignments (
              *,
              employee:shared_oss!employee_id(*)
            )
          `);

        if (createError) {
          console.error('Error creating default shifts:', createError);
          // Se c'è un errore nella creazione, prova a recuperare di nuovo i turni esistenti
          const { data: retryShifts } = await supabase
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

          transformedShifts = retryShifts?.map(shift => ({
            ...shift,
            assignments: shift.assignments?.map((assignment: any) => ({
              ...assignment,
              employee: assignment.employee
            })) || []
          })) || [];
        } else {
          transformedShifts = newShifts?.map(shift => ({
            ...shift,
            assignments: shift.assignments?.map((assignment: any) => ({
              ...assignment,
              employee: assignment.employee
            })) || []
          })) || [];
        }
      } else {
        // Controlla se mancano alcuni tipi di turno e creali
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

          const { data: newShifts } = await supabase
            .from('shifts')
            .upsert(missingShifts, { 
              onConflict: 'user_id,date,shift_type',
              ignoreDuplicates: true 
            })
            .select(`
              *,
              assignments (
                *,
                employee:shared_oss!employee_id(*)
              )
            `);

          if (newShifts) {
            const transformedNewShifts = newShifts.map(shift => ({
              ...shift,
              assignments: shift.assignments?.map((assignment: any) => ({
                ...assignment,
                employee: assignment.employee
              })) || []
            }));

            transformedShifts = [...transformedShifts, ...transformedNewShifts];
          }
        }
      }

      // Ordina i turni per tipo
      const shiftOrder = { morning: 0, afternoon: 1, evening: 2 };
      transformedShifts.sort((a, b) => 
        shiftOrder[a.shift_type as keyof typeof shiftOrder] - 
        shiftOrder[b.shift_type as keyof typeof shiftOrder]
      );

      return transformedShifts;
    } catch (error) {
      console.error('Error in getByDate:', error);
      throw error;
    }
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

    // Check if shift already has assignments from another user
    const { data: existingShiftAssignments, error: shiftCheckError } = await supabase
      .from('assignments')
      .select('user_id, created_by')
      .eq('shift_id', assignment.shift_id)
      .limit(1);

    if (shiftCheckError && shiftCheckError.code !== 'PGRST116') {
      console.error('Error checking shift assignments:', shiftCheckError);
      throw new Error('Errore nella verifica del turno');
    }

    if (existingShiftAssignments && existingShiftAssignments.length > 0) {
      const existingAssignment = existingShiftAssignments[0];
      if (existingAssignment.created_by !== user.id) {
        throw new Error('Questo turno è già stato compilato da un altro utente. Puoi solo visualizzarlo.');
      }
    }

    // Get employee name for duplicate check
    const { data: employeeData, error: employeeError } = await supabase
      .from('shared_oss')
      .select('name')
      .eq('id', assignment.employee_id)
      .single();

    if (employeeError) {
      console.error('Error fetching employee data:', employeeError);
      throw new Error('Errore nel recupero dei dati OSS');
    }

    // Get shift date for duplicate check
    const { data: shiftData, error: shiftError } = await supabase
      .from('shifts')
      .select('date')
      .eq('id', assignment.shift_id)
      .eq('user_id', user.id)
      .single();

    if (shiftError) {
      console.error('Error fetching shift data:', shiftError);
      throw new Error('Errore nel recupero dei dati del turno');
    }

    // Check for daily duplicates by name using the database function
    const { data: duplicateCheck, error: duplicateError } = await supabase
      .rpc('check_daily_duplicate_by_name', {
        p_employee_name: employeeData.name,
        p_shift_date: shiftData.date,
        p_user_id: user.id
      });

    if (duplicateError) {
      console.error('Error checking daily duplicates:', duplicateError);
      throw new Error('Errore nella verifica dei duplicati');
    }

    if (duplicateCheck) {
      throw new Error(`${employeeData.name} è già assegnato/a a un turno in questa giornata. Ogni OSS può lavorare solo un turno al giorno.`);
    }

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

    const { data, error } = await supabase
      .from('assignments')
      .insert([{
        employee_id: assignment.employee_id,
        shift_id: assignment.shift_id,
        station_number: assignment.station_number,
        user_id: user.id,
        created_by: user.id
      }])
      .select(`
        *,
        employee:shared_oss!employee_id(*),
        created_by_profile:profiles!created_by(full_name, email)
      `)
      .single();

    if (error) {
      console.error('Error creating assignment:', error);
      throw new Error('Errore nell\'assegnazione');
    }

    // Transform the response to match expected format
    return {
      ...data,
      employee: data.employee,
      created_by_info: data.created_by_profile
    };
  },

  update: async (assignmentId: string, updates: { station_number: number }): Promise<Assignment> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utente non autenticato');

    // Check if user can modify this assignment
    const { data: assignmentCheck, error: checkError } = await supabase
      .from('assignments')
      .select('created_by')
      .eq('id', assignmentId)
      .single();

    if (checkError) {
      console.error('Error checking assignment ownership:', checkError);
      throw new Error('Errore nella verifica dei permessi');
    }

    if (assignmentCheck.created_by !== user.id) {
      throw new Error('Non hai i permessi per modificare questa assegnazione. Puoi modificare solo le tue assegnazioni.');
    }

    const { data, error } = await supabase
      .from('assignments')
      .update(updates)
      .eq('id', assignmentId)
      .eq('created_by', user.id)
      .select(`
        *,
        employee:shared_oss!employee_id(*),
        created_by_profile:profiles!created_by(full_name, email),
        modified_by_profile:profiles!modified_by(full_name, email)
      `)
      .single();

    if (error) {
      console.error('Error updating assignment:', error);
      if (error.code === 'PGRST116') {
        throw new Error('Assegnazione non trovata o non hai i permessi per modificarla');
      }
      throw new Error('Errore nell\'aggiornamento dell\'assegnazione');
    }

    // Transform the response to match expected format
    return {
      ...data,
      employee: data.employee,
      created_by_info: data.created_by_profile,
      modified_by_info: data.modified_by_profile
    };
  },

  delete: async (assignmentId: string): Promise<{ message: string }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utente non autenticato');

    // Check if user can delete this assignment
    const { data: assignmentCheck, error: checkError } = await supabase
      .from('assignments')
      .select('created_by')
      .eq('id', assignmentId)
      .single();

    if (checkError) {
      console.error('Error checking assignment ownership:', checkError);
      throw new Error('Errore nella verifica dei permessi');
    }

    if (assignmentCheck.created_by !== user.id) {
      throw new Error('Non hai i permessi per eliminare questa assegnazione. Puoi eliminare solo le tue assegnazioni.');
    }

    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId)
      .eq('created_by', user.id);

    if (error) {
      console.error('Error deleting assignment:', error);
      if (error.code === 'PGRST116') {
        throw new Error('Assegnazione non trovata o non hai i permessi per eliminarla');
      }
      throw new Error('Errore nell\'eliminazione dell\'assegnazione');
    }

    return { message: 'Assegnazione eliminata' };
  },

  // New function to get assignment details with ownership info
  getAssignmentDetails: async (date: string): Promise<any[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utente non autenticato');

    const { data, error } = await supabase
      .rpc('get_assignment_details', {
        p_user_id: user.id,
        p_date: date
      });

    if (error) {
      console.error('Error fetching assignment details:', error);
      throw new Error('Errore nel caricamento dei dettagli delle assegnazioni');
    }

    return data || [];
  },

  // Function to get assignment history
  getAssignmentHistory: async (assignmentId: string): Promise<any[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utente non autenticato');

    const { data, error } = await supabase
      .from('assignment_history')
      .select(`
        *,
        changed_by_profile:profiles!changed_by(full_name, email)
      `)
      .eq('assignment_id', assignmentId)
      .eq('user_id', user.id)
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('Error fetching assignment history:', error);
      throw new Error('Errore nel caricamento dello storico');
    }

    return data || [];
  }
};