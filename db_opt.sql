--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 16.6 (Ubuntu 16.6-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;
SET search_path TO public;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT categories_pkey PRIMARY KEY (id)
);

--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    category_id uuid,
    purchase_price numeric(10,2) NOT NULL,
    sale_price numeric(10,2) NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT now(),
    is_hidden boolean DEFAULT false,
    CONSTRAINT products_pkey PRIMARY KEY (id),
    CONSTRAINT products_code_key UNIQUE (code),
    CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id)
);



CREATE TABLE sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date timestamp with time zone DEFAULT now() NOT NULL, -- Columna de partición
    payment_method text NOT NULL,
    total numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sales_pkey PRIMARY KEY (id, date), -- Clave primaria compuesta
    CONSTRAINT sales_payment_method_check CHECK (payment_method = ANY (ARRAY['QR'::text, 'EFECTIVO'::text]))
) PARTITION BY RANGE (date);

--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE sale_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    sale_date timestamp with time zone NOT NULL, -- Nueva columna para referencia compuesta
    product_id uuid NOT NULL,
    quantity integer NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sale_items_pkey PRIMARY KEY (id),
    CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT sale_items_sale_fkey FOREIGN KEY (sale_id, sale_date) REFERENCES sales(id, date) ON DELETE CASCADE
);


CREATE TABLE sales_2025 PARTITION OF sales
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE sales_2026 PARTITION OF sales
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE sales_2027 PARTITION OF sales
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
CREATE TABLE sales_2028 PARTITION OF sales
    FOR VALUES FROM ('2028-01-01') TO ('2029-01-01');
CREATE TABLE sales_2029 PARTITION OF sales
    FOR VALUES FROM ('2029-01-01') TO ('2030-01-01');
CREATE TABLE sales_2030 PARTITION OF sales
    FOR VALUES FROM ('2030-01-01') TO ('2031-01-01');

-- Políticas para la base de datos
CREATE POLICY "Allow full access to authenticated users" ON categories TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON products TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON sale_items TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON sales TO authenticated USING (true);

-- Políticas para almacenamiento
CREATE POLICY "Permitir acceso público a imágenes de productos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');

CREATE POLICY "Permitir gestión de imágenes a autenticados"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

--
-- Name: sale_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

--
-- Name: sales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;


-- Índices BRIN para fechas (ideal para particiones)
CREATE INDEX idx_sales_date ON sales USING brin(date);
CREATE INDEX idx_sale_items_created ON sale_items USING brin(created_at);

-- Índices B-tree para búsquedas frecuentes
CREATE INDEX idx_products_code ON products USING btree(code);
CREATE INDEX idx_products_category ON products USING btree(category_id);
CREATE INDEX idx_sale_items_product ON sale_items USING btree(product_id);

CREATE OR REPLACE FUNCTION cleanup_unused_images()
RETURNS void AS $$
BEGIN
    -- Eliminar imágenes de productos ocultos o eliminados
    UPDATE products
    SET image_url = NULL
    WHERE image_url IS NOT NULL
    AND image_url NOT IN (
        SELECT DISTINCT image_url 
        FROM products 
        WHERE image_url IS NOT NULL 
        AND is_hidden = false
    );
END;
$$ LANGUAGE plpgsql;

-- Crea después de las tablas principales
CREATE MATERIALIZED VIEW sales_stats AS
SELECT
    date_trunc('month', date) as month,
    COUNT(*) as total_sales,
    SUM(total) as total_amount,
    payment_method
FROM sales
GROUP BY date_trunc('month', date), payment_method
WITH DATA;

-- Índice único para la vista
CREATE UNIQUE INDEX sales_stats_month_payment ON sales_stats (month, payment_method);

-- Función para refrescar la vista
CREATE OR REPLACE FUNCTION refresh_sales_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY sales_stats;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar automáticamente la vista
CREATE OR REPLACE FUNCTION update_sales_stats()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        PERFORM refresh_sales_stats();
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sales_stats
AFTER INSERT OR UPDATE OR DELETE ON sales
FOR EACH STATEMENT
EXECUTE FUNCTION update_sales_stats();