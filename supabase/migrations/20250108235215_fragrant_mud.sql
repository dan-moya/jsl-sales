/*
  # Add is_deleted column to products table

  1. Changes
    - Add is_deleted column to products table to support soft deletion
    - Update existing RLS policies to consider is_deleted flag
*/

-- Add is_deleted column
ALTER TABLE products ADD COLUMN is_deleted boolean DEFAULT false;

-- Update RLS policies to exclude deleted products
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON products;

CREATE POLICY "Allow full access to authenticated users" ON products
  FOR ALL TO authenticated
  USING (
    CASE 
      WHEN current_setting('request.method', true) = 'GET' THEN
        COALESCE(is_deleted, false) = false
      ELSE 
        true
    END
  );