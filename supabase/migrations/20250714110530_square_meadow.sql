/*
  # Fix foreign key relationships for assignments table

  1. Changes
    - Update foreign key constraints to reference profiles table instead of users table
    - Add proper foreign key for created_by and modified_by columns
    - Ensure referential integrity with profiles table

  2. Security
    - Maintain existing RLS policies
    - No changes to security model
*/

-- First, remove existing foreign key constraints that reference users table
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_created_by_fkey;
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_modified_by_fkey;

-- Add new foreign key constraints that reference profiles table
ALTER TABLE assignments 
ADD CONSTRAINT assignments_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES profiles(id);

ALTER TABLE assignments 
ADD CONSTRAINT assignments_modified_by_fkey 
FOREIGN KEY (modified_by) REFERENCES profiles(id);

-- Also fix assignment_history table foreign keys
ALTER TABLE assignment_history DROP CONSTRAINT IF EXISTS assignment_history_changed_by_fkey;
ALTER TABLE assignment_history DROP CONSTRAINT IF EXISTS assignment_history_user_id_fkey;

ALTER TABLE assignment_history 
ADD CONSTRAINT assignment_history_changed_by_fkey 
FOREIGN KEY (changed_by) REFERENCES profiles(id);

ALTER TABLE assignment_history 
ADD CONSTRAINT assignment_history_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id);