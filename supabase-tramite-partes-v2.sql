-- Mejora #15: vincular "otros" (cónyuges, apoderados, padres) a un comprador/vendedor específico.
-- Antes las partes eran flat. Ahora una parte puede tener una "parte_padre" (la principal).

-- 1) Columna self-reference. Si la parte_padre se borra, el "otro" se borra también.
ALTER TABLE tramite_partes
  ADD COLUMN IF NOT EXISTS parte_padre_id uuid REFERENCES tramite_partes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tramite_partes_padre ON tramite_partes(parte_padre_id);

-- 2) Agregar roles que faltaban para "otros" en escrituras
DO $$
BEGIN
  -- padre del titular
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'padre'
                                        AND enumtypid = 'rol_parte'::regtype) THEN
    ALTER TYPE rol_parte ADD VALUE IF NOT EXISTS 'padre';
  END IF;
  -- madre del titular
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'madre'
                                        AND enumtypid = 'rol_parte'::regtype) THEN
    ALTER TYPE rol_parte ADD VALUE IF NOT EXISTS 'madre';
  END IF;
  -- conviviente (parejas no casadas)
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'conviviente'
                                        AND enumtypid = 'rol_parte'::regtype) THEN
    ALTER TYPE rol_parte ADD VALUE IF NOT EXISTS 'conviviente';
  END IF;
  -- fiador / garante
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'fiador'
                                        AND enumtypid = 'rol_parte'::regtype) THEN
    ALTER TYPE rol_parte ADD VALUE IF NOT EXISTS 'fiador';
  END IF;
END $$;

COMMENT ON COLUMN tramite_partes.parte_padre_id IS
  'Si esta parte es un "otro" (cónyuge/apoderado/padre) que comparece junto a una principal, apunta al ID de esa principal. NULL si la parte misma es principal.';
