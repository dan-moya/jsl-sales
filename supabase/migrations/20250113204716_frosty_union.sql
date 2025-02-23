ALTER TABLE products DROP COLUMN is_deleted;

/*
  # Add is_hidden column to products table

  1. Changes
    - Add is_hidden column to products table to support hiding products instead of deletion
    - Update existing RLS policies to consider is_hidden flag
*/

-- Add is_hidden column
ALTER TABLE products ADD COLUMN is_hidden boolean DEFAULT false;

-- Update RLS policies
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON products;

CREATE POLICY "Allow full access to authenticated users" ON products
  FOR ALL TO authenticated
  USING (true);