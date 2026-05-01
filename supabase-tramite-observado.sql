-- Estado "observado" entre "en_registro" y "listo"
-- + fecha límite que el registro otorga para subsanar observaciones

-- 1) Agregar columna para la fecha límite (no hay enum hardcodeado de estado, es text)
ALTER TABLE tramites
  ADD COLUMN IF NOT EXISTS fecha_limite_observacion date;

ALTER TABLE tramites
  ADD COLUMN IF NOT EXISTS observacion_registro text;

COMMENT ON COLUMN tramites.fecha_limite_observacion IS
  'Fecha límite otorgada por el registro para subsanar observaciones (estado=observado).';
COMMENT ON COLUMN tramites.observacion_registro IS
  'Texto de la observación recibida del registro.';

-- 2) Si tu columna `estado` está definida con CHECK constraint, agregá "observado"
--    (ajustá el nombre del constraint según lo que tengas; lo normal es tramites_estado_check)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'tramites'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%estado%'
  LOOP
    EXECUTE format('ALTER TABLE tramites DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- Recrear el check con el estado nuevo (incluye legacy + nuevos)
ALTER TABLE tramites ADD CONSTRAINT tramites_estado_check
  CHECK (estado IN ('borrador','iniciado','en_proceso','en_registro','observado','listo','entregado'));

-- 3) Índice para consultar próximos a vencer
CREATE INDEX IF NOT EXISTS idx_tramites_fecha_limite
  ON tramites (fecha_limite_observacion)
  WHERE estado = 'observado';
