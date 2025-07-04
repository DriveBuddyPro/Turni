/*
  # Create shared OSS database

  1. New Tables
    - `shared_oss` - Shared OSS available to all users
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `email` (text, unique)
      - `phone` (text)
      - `role` (text, default 'OSS')
      - `active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on shared_oss table
    - Add policies for all authenticated users to read shared OSS
    - Only allow system/admin to modify shared OSS

  3. Data Migration
    - Insert all the provided OSS names into the shared table
    - Update assignments to reference shared OSS
*/

-- Create shared OSS table
CREATE TABLE IF NOT EXISTS shared_oss (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  role text NOT NULL DEFAULT 'OSS',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on shared_oss
ALTER TABLE shared_oss ENABLE ROW LEVEL SECURITY;

-- Create policies for shared_oss - all authenticated users can read
CREATE POLICY "All authenticated users can read shared OSS"
  ON shared_oss
  FOR SELECT
  TO authenticated
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_shared_oss_updated_at
  BEFORE UPDATE ON shared_oss
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert all the provided OSS (using proper conflict resolution)
INSERT INTO shared_oss (name, email, role, active) VALUES
('Vincenzo Serralunga', 'vincenzo.serralunga@ospedaleniguarda.it', 'OSS', true),
('Ida Tavilla', 'ida.tavilla@ospedaleniguarda.it', 'OSS', true),
('Domenico Liccardo', 'domenico.liccardo@ospedaleniguarda.it', 'OSS', true),
('Ioana Simona Radu', 'ioanasimona.radu@ospedaleniguarda.it', 'OSS', true),
('Antonio Basile', 'antonio.basile@ospedaleniguarda.it', 'OSS', true),
('Simone Mongiardo', 'simone.mongiardo@ospedaleniguarda.it', 'OSS', true),
('Lyudmyla Moskal', 'lyudmyla.moskal@ospedaleniguarda.it', 'OSS', true),
('Catia Angela Garbagnati', 'catiaangela.garbagnati@ospedaleniguarda.it', 'OSS', true),
('Daniela Colico', 'daniela.colico@ospedaleniguarda.it', 'OSS', true),
('Bernardino Matranga', 'bernardino.matranga@ospedaleniguarda.it', 'OSS', true),
('Nadia Belatik', 'nadia.belatik@ospedaleniguarda.it', 'OSS', true),
('Micol Frignani', 'micol.frignani@ospedaleniguarda.it', 'OSS', true),
('Andrea Volpato', 'andrea.volpato@ospedaleniguarda.it', 'OSS', true),
('Carmen Marrapese', 'carmen.marrapese@ospedaleniguarda.it', 'OSS', true),
('Carmen Rosa Quintana Garcia', 'carmenrosa.quintanagarcia@ospedaleniguarda.it', 'OSS', true),
('Maria Violeta Lapadat', 'mariavioleta.lapadat@ospedaleniguarda.it', 'OSS', true),
('Andrea Pugliese', 'andrea.pugliese@ospedaleniguarda.it', 'OSS', true),
('Chiara Pietrarolo', 'chiara.pietrarolo@ospedaleniguarda.it', 'OSS', true),
('Carla Lucenti', 'carla.lucenti@ospedaleniguarda.it', 'OSS', true),
('Antonia Silvestre', 'antonia.silvestre@ospedaleniguarda.it', 'OSS', true),
('Armida Yulia Fernandez Lizarraga', 'armidayulia.fernandezlizarraga@ospedaleniguarda.it', 'OSS', true),
('Nadia D''Eustacchio', 'nadia.deustacchio@ospedaleniguarda.it', 'OSS', true),
('Francesco Mancuso', 'francesco.mancuso@ospedaleniguarda.it', 'OSS', true),
('Domenica Dilonardo', 'domenica.dilonardo@ospedaleniguarda.it', 'OSS', true),
('Martina Stilo', 'martina.stilo@ospedaleniguarda.it', 'OSS', true),
('Maria Crucilla''', 'maria.crucilla@ospedaleniguarda.it', 'OSS', true),
('Nicolae Mihalache', 'nicolae.mihalache@ospedaleniguarda.it', 'OSS', true),
('Maribel Myriam Carlos Rodriguez', 'maribelmyriam.carlosrodriguez@ospedaleniguarda.it', 'OSS', true),
('Orges Amataj', 'orges.amataj@ospedaleniguarda.it', 'OSS', true),
('Vittorio Tricoli', 'vittorio.tricoli@ospedaleniguarda.it', 'OSS', true),
('Shelly Ariana Espin Lomas', 'shellyariana.espinlomas@ospedaleniguarda.it', 'OSS', true),
('Giovanna Battaglia', 'giovanna.battaglia@ospedaleniguarda.it', 'OSS', true),
('Caterina Marino', 'caterina.marino@ospedaleniguarda.it', 'OSS', true),
('Franco De Marco', 'franco.demarco@ospedaleniguarda.it', 'OSS', true),
('Lilia Catherine Fernandez Orellana', 'liliacatherine.fernandezorellana@ospedaleniguarda.it', 'OSS', true),
('Caterina Marchi', 'caterina.marchi@ospedaleniguarda.it', 'OSS', true),
('Stefania Monteduro', 'stefania.monteduro@ospedaleniguarda.it', 'OSS', true),
('Corrado Giovanni Alescio', 'corradogiovanni.alescio@ospedaleniguarda.it', 'OSS', true),
('Gabriele Cicirello', 'gabriele.cicirello@ospedaleniguarda.it', 'OSS', true),
('Anna Maria Antonietta Di Tolve', 'annamariaantonietta.ditolve@ospedaleniguarda.it', 'OSS', true),
('Teresa Rocca', 'teresa.rocca@ospedaleniguarda.it', 'OSS', true)
ON CONFLICT (email) DO NOTHING;

-- Update assignments table to reference shared_oss instead of employees
DO $$
BEGIN
  -- Add new column for shared_oss_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignments' AND column_name = 'shared_oss_id'
  ) THEN
    ALTER TABLE assignments ADD COLUMN shared_oss_id uuid REFERENCES shared_oss(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS assignments_shared_oss_id_idx ON assignments(shared_oss_id);

-- Update unique constraints to use shared_oss_id instead of employee_id
DO $$
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'assignments_shift_id_employee_id_key'
  ) THEN
    ALTER TABLE assignments DROP CONSTRAINT assignments_shift_id_employee_id_key;
  END IF;
  
  -- Add new constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'assignments_shift_id_shared_oss_id_key'
  ) THEN
    ALTER TABLE assignments ADD CONSTRAINT assignments_shift_id_shared_oss_id_key UNIQUE (shift_id, shared_oss_id);
  END IF;
END $$;