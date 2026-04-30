-- ============================================================
-- FIX: handle_new_user no debe romper la creación de auth users
-- ============================================================
-- Problema observado: admin.auth.admin.createUser falla con
-- "Database error creating new user" (unexpected_failure).
-- Causa probable: alguna cascada de triggers (audit, escribania)
-- está fallando al insertar en profiles.
--
-- Fix: hacer handle_new_user tolerante a fallos. Si la inserción
-- en profiles falla por cualquier razón, NO rompe la creación
-- del auth user. El profile se puede crear/corregir después
-- desde un endpoint con service_role.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO profiles (id, nombre, apellido, email, rol)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'nombre', ''), 'Sin nombre'),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'apellido', ''), 'Sin apellido'),
      COALESCE(NEW.email, ''),
      'cliente'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Si algo falla (audit trigger, RLS, lo que sea) no rompemos
    -- la creación del auth user. El profile se completa después
    -- desde el endpoint server-side.
    RAISE WARNING 'handle_new_user falló al crear profile: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar que el trigger sigue activo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
