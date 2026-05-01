-- Columnas dedicadas para nombre del padre y de la madre del cliente.
-- Antes esto se guardaba con prefijo en `notas` ([Padres: Padre: X, Madre: Y]).

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS nombre_padre text,
  ADD COLUMN IF NOT EXISTS nombre_madre text;

COMMENT ON COLUMN clientes.nombre_padre IS 'Nombre completo del padre (necesario para solteros).';
COMMENT ON COLUMN clientes.nombre_madre IS 'Nombre completo de la madre (necesario para solteros).';

-- Migración de datos legacy: extrae padre/madre del campo `notas` si tiene el prefijo
DO $$
DECLARE
  c record;
  m_padre text;
  m_madre text;
BEGIN
  FOR c IN
    SELECT id, notas FROM clientes
    WHERE notas LIKE '[Padres:%' AND (nombre_padre IS NULL OR nombre_madre IS NULL)
  LOOP
    -- Extraer Padre
    m_padre := substring(c.notas FROM 'Padre: ([^,\]]+)');
    -- Extraer Madre
    m_madre := substring(c.notas FROM 'Madre: ([^\]]+)');

    UPDATE clientes
      SET nombre_padre = COALESCE(nombre_padre, trim(m_padre)),
          nombre_madre = COALESCE(nombre_madre, trim(m_madre)),
          notas = trim(regexp_replace(c.notas, '^\[Padres:[^\]]*\]\s*', ''))
      WHERE id = c.id;
  END LOOP;
END $$;
