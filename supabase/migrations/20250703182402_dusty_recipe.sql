/*
  # Update assignments foreign key to reference shared_oss

  1. Changes
    - Drop existing foreign key constraint from assignments.employee_id to employees.id
    - Add new foreign key constraint from assignments.employee_id to shared_oss.id
    - This allows assignments to reference shared OSS personnel instead of user-specific employees

  2. Security
    - No changes to RLS policies needed
    - Existing policies remain intact
*/

-- Drop the existing foreign key constraint
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_employee_id_fkey;

-- Add new foreign key constraint to shared_oss table
ALTER TABLE assignments ADD CONSTRAINT assignments_employee_id_fkey 
  FOREIGN KEY (employee_id) REFERENCES shared_oss(id) ON DELETE CASCADE;