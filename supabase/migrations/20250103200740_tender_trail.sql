/*
  # Initial Schema Setup

  1. New Tables
    - users (managed by Supabase Auth)
    - categories
      - id (uuid, primary key)
      - name (text)
      - created_at (timestamp)
    - products
      - id (uuid, primary key)
      - code (text, unique)
      - name (text)
      - category_id (uuid, foreign key)
      - purchase_price (numeric)
      - sale_price (numeric)
      - stock (integer)
      - image_url (text)
      - created_at (timestamp)
    - sales
      - id (uuid, primary key)
      - date (timestamp)
      - payment_method (text)
      - total (numeric)
      - created_at (timestamp)
    - sale_items
      - id (uuid, primary key)
      - sale_id (uuid, foreign key)
      - product_id (uuid, foreign key)
      - quantity (integer)
      - price (numeric)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Categories Table
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Products Table
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category_id uuid REFERENCES categories(id),
  purchase_price numeric NOT NULL,
  sale_price numeric NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Sales Table
CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date timestamptz DEFAULT now(),
  payment_method text NOT NULL CHECK (payment_method IN ('QR', 'EFECTIVO')),
  total numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Sale Items Table
CREATE TABLE sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL,
  price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Allow full access to authenticated users" ON categories
  FOR ALL TO authenticated
  USING (true);

CREATE POLICY "Allow full access to authenticated users" ON products
  FOR ALL TO authenticated
  USING (true);

CREATE POLICY "Allow full access to authenticated users" ON sales
  FOR ALL TO authenticated
  USING (true);

CREATE POLICY "Allow full access to authenticated users" ON sale_items
  FOR ALL TO authenticated
  USING (true);

-- Insert initial categories
INSERT INTO categories (name) VALUES
  ('Juguetes'),
  ('Bisutería'),
  ('Otros');