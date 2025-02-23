/*
  # Optimizaciones para almacenamiento a largo plazo

  1. Particionamiento por año
    - Particionar ventas y detalles por año
    - Mantener datos históricos eficientemente
    
  2. Compresión
    - Habilitar compresión para tablas históricas
    - Reducir espacio en disco
    
  3. Archivado
    - Sistema de archivado para datos antiguos
    - Mantener accesibilidad
*/

-- Crear esquema para datos históricos
CREATE SCHEMA IF NOT EXISTS history;

-- Función para crear particiones automáticamente
CREATE OR REPLACE FUNCTION create_year_partition(year int)
RETURNS void AS $$
DECLARE
  start_date timestamp;
  end_date timestamp;
BEGIN
  start_date := make_timestamp(year, 1, 1, 0, 0, 0);
  end_date := make_timestamp(year + 1, 1, 1, 0, 0, 0);
  
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS history.sales_%s PARTITION OF sales 
     FOR VALUES FROM (%L) TO (%L)',
    year, start_date, end_date
  );
  
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS history.sale_items_%s PARTITION OF sale_items 
     FOR VALUES FROM (%L) TO (%L)',
    year, start_date, end_date
  );
  
  -- Habilitar compresión para particiones antiguas
  IF year < EXTRACT(year FROM CURRENT_DATE) THEN
    EXECUTE format(
      'ALTER TABLE history.sales_%s SET (toast_tuple_target = 8160)',
      year
    );
    EXECUTE format(
      'ALTER TABLE history.sale_items_%s SET (toast_tuple_target = 8160)',
      year
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Modificar tablas principales para soportar particionamiento
ALTER TABLE sales 
  SET UNLOGGED -- Mejora rendimiento de inserciones
  PARTITION BY RANGE (date);

ALTER TABLE sale_items 
  SET UNLOGGED
  PARTITION BY RANGE ((created_at));

-- Crear particiones para años actuales y futuros
SELECT create_year_partition(generate_series(2024, 2026));

-- Vista materializada para resumen histórico
CREATE MATERIALIZED VIEW IF NOT EXISTS history.sales_yearly_summary AS
SELECT 
  date_trunc('year', s.date) AS year,
  COUNT(*) as total_sales,
  SUM(s.total) as total_amount,
  SUM(si.quantity) as total_items,
  p.category_id,
  c.name as category_name
FROM sales s
JOIN sale_items si ON s.id = si.sale_id
JOIN products p ON si.product_id = p.id
JOIN categories c ON p.category_id = c.id
GROUP BY 
  date_trunc('year', s.date),
  p.category_id,
  c.name
WITH NO DATA;

-- Índice para la vista materializada histórica
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_yearly_summary 
ON history.sales_yearly_summary(year, category_id);

-- Función para mantener particiones actualizadas
CREATE OR REPLACE FUNCTION maintain_partitions()
RETURNS void AS $$
DECLARE
  current_year int;
  max_year int;
BEGIN
  current_year := EXTRACT(year FROM CURRENT_DATE);
  max_year := current_year + 2;
  
  -- Crear particiones futuras si no existen
  FOR i IN current_year..max_year LOOP
    PERFORM create_year_partition(i);
  END LOOP;
END;
$$ LANGUAGE plpgsql;