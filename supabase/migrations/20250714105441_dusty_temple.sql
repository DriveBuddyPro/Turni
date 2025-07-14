/*
  # Sistema di gestione turni OSS con tracciamento

  1. Modifiche alla tabella assignments
    - Aggiunta colonna `created_by` per tracciare chi ha inserito l'assegnazione
    - Aggiunta colonna `created_at_detailed` per timestamp preciso
    - Aggiunta colonna `modified_by` per tracciare le modifiche
    - Aggiunta colonna `modified_at` per timestamp delle modifiche

  2. Nuova tabella assignment_history
    - Storico completo delle modifiche alle assegnazioni
    - Tracciamento di chi, quando e cosa ha modificato

  3. Funzioni per controllo duplicati
    - Funzione per verificare duplicati giornalieri per nome/cognome
    - Controlli automatici prima dell'inserimento

  4. Politiche RLS aggiornate
    - Tutti possono vedere tutte le assegnazioni
    - Solo il creatore può modificare/eliminare le proprie assegnazioni
*/

-- Aggiungi colonne di tracciamento alla tabella assignments
DO $$
BEGIN
  -- Aggiungi created_by se non esiste
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE assignments ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;

  -- Aggiungi modified_by se non esiste
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'modified_by'
  ) THEN
    ALTER TABLE assignments ADD COLUMN modified_by uuid REFERENCES auth.users(id);
  END IF;

  -- Aggiungi modified_at se non esiste
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'modified_at'
  ) THEN
    ALTER TABLE assignments ADD COLUMN modified_at timestamptz;
  END IF;
END $$;

-- Aggiorna i record esistenti per impostare created_by = user_id
UPDATE assignments 
SET created_by = user_id 
WHERE created_by IS NULL;

-- Rendi created_by NOT NULL dopo aver aggiornato i record esistenti
ALTER TABLE assignments ALTER COLUMN created_by SET NOT NULL;

-- Crea tabella per lo storico delle modifiche
CREATE TABLE IF NOT EXISTS assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id)
);

-- Abilita RLS sulla tabella assignment_history
ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY;

-- Politiche per assignment_history
CREATE POLICY "Users can read own assignment history"
  ON assignment_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert assignment history"
  ON assignment_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = changed_by);

-- Funzione per controllare duplicati giornalieri per nome
CREATE OR REPLACE FUNCTION check_daily_duplicate_by_name(
  p_employee_name text,
  p_shift_date date,
  p_user_id uuid,
  p_assignment_id uuid DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
  duplicate_count integer;
BEGIN
  -- Conta le assegnazioni esistenti per lo stesso nome nella stessa data
  SELECT COUNT(*)
  INTO duplicate_count
  FROM assignments a
  JOIN shifts s ON a.shift_id = s.id
  JOIN shared_oss so ON a.employee_id = so.id
  WHERE LOWER(TRIM(so.name)) = LOWER(TRIM(p_employee_name))
    AND s.date = p_shift_date
    AND s.user_id = p_user_id
    AND (p_assignment_id IS NULL OR a.id != p_assignment_id);
  
  RETURN duplicate_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per registrare le modifiche nello storico
CREATE OR REPLACE FUNCTION log_assignment_change() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO assignment_history (
      assignment_id, action, new_data, changed_by, user_id
    ) VALUES (
      NEW.id, 'created', to_jsonb(NEW), NEW.created_by, NEW.user_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Aggiorna modified_by e modified_at
    NEW.modified_by = auth.uid();
    NEW.modified_at = now();
    
    INSERT INTO assignment_history (
      assignment_id, action, old_data, new_data, changed_by, user_id
    ) VALUES (
      NEW.id, 'updated', to_jsonb(OLD), to_jsonb(NEW), auth.uid(), NEW.user_id
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO assignment_history (
      assignment_id, action, old_data, changed_by, user_id
    ) VALUES (
      OLD.id, 'deleted', to_jsonb(OLD), auth.uid(), OLD.user_id
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crea trigger per il logging automatico
DROP TRIGGER IF EXISTS assignment_history_trigger ON assignments;
CREATE TRIGGER assignment_history_trigger
  AFTER INSERT OR UPDATE OR DELETE ON assignments
  FOR EACH ROW EXECUTE FUNCTION log_assignment_change();

-- Aggiorna le politiche RLS per assignments
DROP POLICY IF EXISTS "Users can create own assignments" ON assignments;
DROP POLICY IF EXISTS "Users can read own assignments" ON assignments;
DROP POLICY IF EXISTS "Users can update own assignments" ON assignments;
DROP POLICY IF EXISTS "Users can delete own assignments" ON assignments;

-- Nuove politiche RLS più specifiche
CREATE POLICY "Users can read all assignments"
  ON assignments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create assignments"
  ON assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND auth.uid() = created_by);

CREATE POLICY "Users can update own created assignments"
  ON assignments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own created assignments"
  ON assignments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Funzione per ottenere informazioni dettagliate sulle assegnazioni
CREATE OR REPLACE FUNCTION get_assignment_details(p_user_id uuid, p_date date)
RETURNS TABLE (
  assignment_id uuid,
  shift_id uuid,
  shift_type text,
  station_number integer,
  employee_name text,
  employee_role text,
  created_by uuid,
  created_by_email text,
  created_at timestamptz,
  modified_by uuid,
  modified_by_email text,
  modified_at timestamptz,
  can_modify boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as assignment_id,
    a.shift_id,
    s.shift_type,
    a.station_number,
    so.name as employee_name,
    so.role as employee_role,
    a.created_by,
    cp.email as created_by_email,
    a.created_at,
    a.modified_by,
    mp.email as modified_by_email,
    a.modified_at,
    (a.created_by = p_user_id) as can_modify
  FROM assignments a
  JOIN shifts s ON a.shift_id = s.id
  JOIN shared_oss so ON a.employee_id = so.id
  LEFT JOIN auth.users cp ON a.created_by = cp.id
  LEFT JOIN auth.users mp ON a.modified_by = mp.id
  WHERE s.user_id = p_user_id AND s.date = p_date
  ORDER BY s.shift_type, a.station_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;