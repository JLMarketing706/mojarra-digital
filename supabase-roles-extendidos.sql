-- Agregar roles "escribano_subrogante" e "escribano_interino" al enum existente.
-- Si el campo `rol` en profiles es text en lugar de enum, no es necesario correr esto.

-- Si rol es un ENUM (lo más común):
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_usuario') THEN
    -- Agregar nuevos valores al enum si no existen
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'escribano_subrogante'
                                          AND enumtypid = 'rol_usuario'::regtype) THEN
      ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'escribano_subrogante';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'escribano_interino'
                                          AND enumtypid = 'rol_usuario'::regtype) THEN
      ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'escribano_interino';
    END IF;
  END IF;
END $$;

-- Función para validar el límite de 5 escribanos por escribanía
CREATE OR REPLACE FUNCTION check_max_escribanos_por_escribania()
RETURNS TRIGGER AS $$
DECLARE
  cnt int;
BEGIN
  IF NEW.rol IN ('escribano_titular','escribano_adscripto','escribano_subrogante','escribano_interino')
     AND NEW.escribania_id IS NOT NULL THEN
    SELECT count(*) INTO cnt
    FROM profiles
    WHERE escribania_id = NEW.escribania_id
      AND rol IN ('escribano_titular','escribano_adscripto','escribano_subrogante','escribano_interino')
      AND id <> NEW.id;
    IF cnt >= 5 THEN
      RAISE EXCEPTION 'Esta escribanía ya tiene 5 escribanos asignados (máximo permitido).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_max_escribanos ON profiles;
CREATE TRIGGER check_max_escribanos
  BEFORE INSERT OR UPDATE OF rol, escribania_id ON profiles
  FOR EACH ROW EXECUTE FUNCTION check_max_escribanos_por_escribania();

COMMENT ON FUNCTION check_max_escribanos_por_escribania() IS
  'Limita a 5 el número de escribanos (titular/adscripto/subrogante/interino) por escribanía.';
