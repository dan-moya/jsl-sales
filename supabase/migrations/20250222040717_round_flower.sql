/*
  # Optimizaciones de tablas y consultas

  1. Índices
    - Añadir índices para mejorar el rendimiento de las consultas más comunes
    - Índices parciales para reducir el tamaño
    
  2. Particionamiento
    - Particionar la tabla de ventas por fecha para mejor rendimiento
    
  3. Limpieza
    - Eliminar columnas no utilizadas
    - Optimizar tipos de datos
*/

-- Índices optimizados
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code) WHERE NOT is_hidden;
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name text_pattern_ops) WHERE NOT is_hidden;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id) WHERE NOT is_hidden;
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date DESC);

-- Particionamiento de ventas por rango de fechas
CREATE TABLE IF NOT EXISTS sales_partitioned (
  LIKE sales INCLUDING ALL
) PARTITION BY RANGE (date);

-- Crear particiones iniciales
CREATE TABLE IF NOT EXISTS sales_2024 PARTITION OF sales_partitioned
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
  
CREATE TABLE IF NOT EXISTS sales_2025 PARTITION OF sales_partitioned
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Optimizar tipos de datos
ALTER TABLE products 
  ALTER COLUMN code TYPE varchar(50),
  ALTER COLUMN name TYPE varchar(255);

-- Añadir compresión a columnas de texto largo
ALTER TABLE products SET (
  toast_tuple_target = 128
);

-- Configurar autovacuum más agresivo para tablas frecuentemente actualizadas
ALTER TABLE products SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.025
);

ALTER TABLE sales SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

-- Crear vista materializada para reportes
CREATE MATERIALIZED VIEW IF NOT EXISTS sales_summary AS
SELECT 
  date_trunc('day', s.date) AS sale_date,
  COUNT(*) as total_sales,
  SUM(s.total) as total_amount,
  SUM(si.quantity) as total_items,
  p.category_id,
  c.name as category_name
FROM sales s
JOIN sale_items si ON s.id = si.sale_id
JOIN products p ON si.product_id = p.id
JOIN categories c ON p.category_id = c.id
GROUP BY date_trunc('day', s.date), p.category_id, c.name
WITH NO DATA;

-- Crear índice en la vista materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_summary 
ON sales_summary(sale_date, category_id);

-- Función para refrescar la vista materializada
CREATE OR REPLACE FUNCTION refresh_sales_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY sales_summary;
END;
$$ LANGUAGE plpgsql;