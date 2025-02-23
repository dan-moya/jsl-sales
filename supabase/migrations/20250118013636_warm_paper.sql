/*
  # Add decrement_stock function

  1. New Functions
    - decrement_stock: Safely decrements product stock
*/

CREATE OR REPLACE FUNCTION decrement_stock(row_id uuid, amount int)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  current_stock int;
BEGIN
  SELECT stock INTO current_stock
  FROM products
  WHERE id = row_id;

  RETURN GREATEST(0, current_stock - amount);
END;
$$;