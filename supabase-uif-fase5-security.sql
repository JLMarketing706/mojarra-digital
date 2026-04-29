-- ============================================================
-- MOJARRA DIGITAL — FASE 5 SECURITY HARDENING
-- Fixes para vulnerabilidades críticas detectadas en revisión
-- ============================================================

-- ============================================================
-- 1. CRÍTICO: bloquear privilege escalation en signup
-- ============================================================
-- El trigger handle_new_user confiaba en raw_user_meta_data->>'rol'
-- Ahora SIEMPRE se crea el usuario como 'cliente'.
-- Solo un escribano titular puede promover roles vía UPDATE manual.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nombre, apellido, email, rol)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nombre', ''), 'Sin nombre'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'apellido', ''), 'Sin apellido'),
    COALESCE(NEW.email, ''),
    'cliente'  -- HARDCODED: nunca aceptar rol del cliente
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. Bloquear que un usuario cambie su propio rol vía UPDATE
-- ============================================================
DROP POLICY IF EXISTS "Usuario puede actualizar su propio perfil" ON profiles;
CREATE POLICY "Usuario actualiza datos propios sin rol" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Trigger BEFORE UPDATE: si el usuario que actualiza no es escribano titular
-- ni oficial de cumplimiento, conserva el rol antiguo.
CREATE OR REPLACE FUNCTION profiles_proteger_rol()
RETURNS TRIGGER AS $$
DECLARE
  v_rol_solicitante TEXT;
BEGIN
  -- Si no hay sesión (insert por trigger handle_new_user con SECURITY DEFINER),
  -- dejar pasar.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT rol INTO v_rol_solicitante FROM profiles WHERE id = auth.uid();

  -- Solo escribano titular puede cambiar roles
  IF NEW.rol IS DISTINCT FROM OLD.rol THEN
    IF v_rol_solicitante NOT IN ('escribano_titular', 'escribano') THEN
      NEW.rol := OLD.rol;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profiles_proteger_rol ON profiles;
CREATE TRIGGER profiles_proteger_rol
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_proteger_rol();

-- ============================================================
-- 3. Bloquear que un INSERT manual a profiles fije rol staff
-- ============================================================
DROP POLICY IF EXISTS "Nuevo usuario puede insertar su perfil" ON profiles;
CREATE POLICY "Nuevo usuario inserta su perfil como cliente" ON profiles
  FOR INSERT
  WITH CHECK (id = auth.uid() AND rol = 'cliente');

-- ============================================================
-- 4. Storage: restringir uploads del cliente al path de su uid
-- ============================================================
DROP POLICY IF EXISTS "Cliente puede subir sus documentos" ON storage.objects;
CREATE POLICY "Cliente sube en su propio path" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos-privados'
    AND auth.uid() IS NOT NULL
    AND (
      -- staff puede subir donde quiera
      is_staff()
      OR
      -- cliente solo puede subir bajo su propio path
      (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- ============================================================
-- 5. Audit logs INMUTABLES (no DELETE ni UPDATE)
-- ============================================================
DROP POLICY IF EXISTS "Nadie borra audit" ON audit_logs;
CREATE POLICY "Nadie borra audit" ON audit_logs FOR DELETE USING (false);

DROP POLICY IF EXISTS "Nadie modifica audit" ON audit_logs;
CREATE POLICY "Nadie modifica audit" ON audit_logs FOR UPDATE USING (false);

-- ============================================================
-- 6. Limitar inserción pública de presupuestos (anti-spam)
-- ============================================================
-- Mantener public insert pero con límite de tamaño básico
DROP POLICY IF EXISTS "Inserción pública para presupuestos" ON presupuestos;
CREATE POLICY "Insercion publica presupuestos limitada" ON presupuestos
  FOR INSERT
  WITH CHECK (
    char_length(COALESCE(nombre, '')) BETWEEN 2 AND 100
    AND char_length(COALESCE(email, '')) BETWEEN 5 AND 100
    AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    AND char_length(COALESCE(telefono, '')) <= 30
    AND char_length(COALESCE(descripcion, '')) <= 2000
  );

-- ============================================================
-- 7. Función helper: generar URL firmada corta on-demand
-- ============================================================
-- Esta función la llamamos desde un endpoint API para generar
-- URLs de 1 hora cuando un usuario quiere descargar un doc.
-- (la generación efectiva la hace el endpoint con service role)

-- ============================================================
-- 8. Función para limpiar URLs viejas en columna `documentos.url`
-- ============================================================
-- Vaciar la columna url para forzar regeneración on-demand
-- (los docs siguen existiendo en storage, solo se invalida la URL persistida)
UPDATE documentos
SET url = ''
WHERE url LIKE '%/storage/v1/object/sign/%'
  AND storage_path IS NOT NULL;

-- ============================================================
-- 9. Verificar que no haya datos huérfanos
-- ============================================================
-- Identificar perfiles con rol staff creados antes del fix
-- (por si alguien ya escaló privilegios). Solo log, no auto-fix.
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM profiles p
  WHERE p.rol IN ('escribano_titular', 'oficial_cumplimiento', 'escribano_adscripto', 'empleado_admin', 'escribano', 'protocolista', 'secretaria')
  AND p.created_at > NOW() - INTERVAL '90 days';
  -- (no bloqueamos, solo informamos en los logs de Postgres)
  RAISE NOTICE 'Profiles staff creados últimos 90 días: %', v_count;
END $$;
