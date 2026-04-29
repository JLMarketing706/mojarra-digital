-- ============================================================
-- MOJARRA DIGITAL — FASE 6 MULTI-TENANCY
-- Aislamiento de datos por escribanía + sistema de invitaciones
-- ============================================================

-- ============================================================
-- 1. TABLA ESCRIBANIAS (tenants)
-- ============================================================
CREATE TABLE IF NOT EXISTS escribanias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identificación
  razon_social TEXT NOT NULL,
  nombre_fantasia TEXT,
  cuit TEXT UNIQUE,
  -- Datos notariales
  matricula TEXT,
  registro_notarial TEXT,
  jurisdiccion TEXT,             -- CABA, Buenos Aires, etc.
  -- Domicilio
  dom_calle TEXT,
  dom_numero TEXT,
  dom_piso TEXT,
  dom_localidad TEXT,
  dom_provincia TEXT,
  dom_codigo_postal TEXT,
  dom_pais TEXT DEFAULT 'AR',
  -- Contacto
  telefono TEXT,
  email TEXT,
  sitio_web TEXT,
  -- Plan y estado
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'basico', 'profesional', 'estudio')),
  estado TEXT NOT NULL DEFAULT 'trial' CHECK (estado IN ('trial', 'activa', 'suspendida', 'cancelada')),
  max_usuarios INTEGER NOT NULL DEFAULT 5,
  trial_until DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  -- Modo soporte: el Titular activa este modo para que el Super Admin
  -- pueda ver datos PII durante un período acotado.
  soporte_habilitado_until TIMESTAMPTZ,
  soporte_habilitado_por UUID,
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS escribanias_updated_at ON escribanias;
CREATE TRIGGER escribanias_updated_at
  BEFORE UPDATE ON escribanias
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_escribanias_estado ON escribanias(estado);
CREATE INDEX IF NOT EXISTS idx_escribanias_plan ON escribanias(plan);

-- ============================================================
-- 2. SUPER ADMINS (creador del SaaS)
-- ============================================================
CREATE TABLE IF NOT EXISTS super_admins (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
-- Solo super admins pueden leer la tabla
CREATE POLICY "Solo super admins leen super_admins" ON super_admins
  FOR SELECT USING (profile_id = auth.uid());
-- INSERT/UPDATE/DELETE solo por SQL (vía service role o asignación manual)

-- ============================================================
-- 3. INVITACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS invitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escribania_id UUID NOT NULL REFERENCES escribanias(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN (
    'escribano_titular', 'oficial_cumplimiento', 'escribano_adscripto', 'empleado_admin'
  )),
  token TEXT NOT NULL UNIQUE,
  mensaje TEXT,
  expira_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  aceptada_at TIMESTAMPTZ,
  aceptada_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cancelada_at TIMESTAMPTZ,
  invitado_por UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitaciones_token ON invitaciones(token);
CREATE INDEX IF NOT EXISTS idx_invitaciones_email ON invitaciones(email);
CREATE INDEX IF NOT EXISTS idx_invitaciones_escribania ON invitaciones(escribania_id);

-- ============================================================
-- 4. AGREGAR escribania_id a profiles + activo
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS escribania_id UUID REFERENCES escribanias(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS desactivado_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS desactivado_por UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_escribania ON profiles(escribania_id);

-- ============================================================
-- 5. ESCRIBANÍA DEMO + asignar datos existentes
-- ============================================================
-- Esta escribanía contiene todos los datos existentes (los de prueba)
-- para que la migración sea no-destructiva.
INSERT INTO escribanias (id, razon_social, nombre_fantasia, plan, estado, max_usuarios)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Escribanía Demo (datos de prueba)',
  'Demo',
  'estudio',
  'activa',
  999
)
ON CONFLICT (id) DO NOTHING;

UPDATE profiles
SET escribania_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE escribania_id IS NULL
  AND rol IN ('escribano_titular', 'oficial_cumplimiento', 'escribano_adscripto', 'empleado_admin', 'secretaria', 'protocolista', 'escribano');

-- ============================================================
-- 6. AGREGAR escribania_id A TABLAS CRÍTICAS
-- ============================================================
-- Nota: ON DELETE de la FK la dejamos sin acción (RESTRICT por default)
-- para que no se borren datos por error si se borra una escribanía.

DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'clientes',
    'clientes_juridicos',
    'tramites',
    'tramite_hitos',
    'documentos',
    'indice_notarial',
    'alertas_uif',
    'turnos',
    'notificaciones',
    'entregas',
    'inmuebles',
    'operacion_pagos',
    'beneficiarios_finales',
    'declaraciones_juradas',
    'ros_reportes',
    'autoevaluaciones_riesgo',
    'capacitaciones',
    'capacitacion_asistentes',
    'manual_procedimientos',
    'manual_acuses',
    'revisiones_externas',
    'screening_resultados',
    'configuracion',
    'informes_registrales',
    'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tablas
  LOOP
    -- Agregar columna si no existe
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS escribania_id UUID REFERENCES escribanias(id) ON DELETE SET NULL',
      t
    );
    -- Crear índice
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%I_escribania ON %I(escribania_id)',
      t, t
    );
    -- Backfill: todos los registros sin escribania_id van a la demo
    EXECUTE format(
      'UPDATE %I SET escribania_id = ''00000000-0000-0000-0000-000000000001''::uuid WHERE escribania_id IS NULL',
      t
    );
  END LOOP;
END $$;

-- ============================================================
-- 7. FUNCIONES HELPER
-- ============================================================

-- Devuelve la escribanía del usuario autenticado actual (NULL si super_admin sin escribanía)
CREATE OR REPLACE FUNCTION current_escribania_id()
RETURNS UUID AS $$
  SELECT escribania_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ¿Es super admin el usuario actual?
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM super_admins WHERE profile_id = auth.uid());
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ¿Tiene la escribanía X habilitado el modo soporte ahora?
CREATE OR REPLACE FUNCTION soporte_habilitado(p_escribania UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM escribanias
    WHERE id = p_escribania
      AND soporte_habilitado_until IS NOT NULL
      AND soporte_habilitado_until > NOW()
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ¿El usuario actual puede ver datos de la escribanía X?
-- Sí si: pertenece a la escribanía OR (es super admin Y modo soporte activo)
CREATE OR REPLACE FUNCTION puede_ver_escribania(p_escribania UUID)
RETURNS BOOLEAN AS $$
  SELECT
    p_escribania = current_escribania_id()
    OR (is_super_admin() AND soporte_habilitado(p_escribania));
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Reescribir is_staff() para considerar escribanía + activo
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND rol IN (
        'escribano_titular', 'oficial_cumplimiento', 'escribano_adscripto', 'empleado_admin',
        'secretaria', 'protocolista', 'escribano'
      )
      AND activo = TRUE
      AND desactivado_at IS NULL
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Sólo Titulares pueden gestionar usuarios y plan
CREATE OR REPLACE FUNCTION is_titular()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND rol IN ('escribano_titular', 'escribano')
      AND activo = TRUE
      AND desactivado_at IS NULL
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================
-- 8. RLS GENÉRICO POR ESCRIBANÍA
-- ============================================================
-- Reemplazamos las policies de las tablas críticas para filtrar por escribanía.
-- Patrón:
--   - Lectura: pertenece a la escribanía (o super_admin con soporte activo)
--   - Modificación: staff de la escribanía (o super_admin con soporte activo)

-- Función helper que devuelve true si el usuario es staff Y pertenece a la escribanía dada
CREATE OR REPLACE FUNCTION is_staff_de(p_escribania UUID)
RETURNS BOOLEAN AS $$
  SELECT (
    is_staff() AND p_escribania = current_escribania_id()
  ) OR (
    is_super_admin() AND soporte_habilitado(p_escribania)
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Aplicar RLS por escribanía a tablas con datos sensibles
DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'clientes',
    'clientes_juridicos',
    'tramites',
    'tramite_hitos',
    'documentos',
    'indice_notarial',
    'alertas_uif',
    'turnos',
    'inmuebles',
    'operacion_pagos',
    'beneficiarios_finales',
    'declaraciones_juradas',
    'ros_reportes',
    'autoevaluaciones_riesgo',
    'capacitaciones',
    'capacitacion_asistentes',
    'manual_procedimientos',
    'manual_acuses',
    'revisiones_externas',
    'screening_resultados',
    'informes_registrales'
  ];
  policy_name TEXT;
BEGIN
  FOREACH t IN ARRAY tablas
  LOOP
    -- Borrar policies anteriores que filtraban solo por is_staff() / is_escribano()
    -- (las dejamos en versiones previas; ahora migramos a versión por escribanía)
    FOR policy_name IN
      SELECT policyname FROM pg_policies WHERE tablename = t AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, t);
    END LOOP;

    -- Nueva policy: SELECT/UPDATE/DELETE por escribanía
    EXECUTE format(
      'CREATE POLICY "Tenant isolation %s" ON %I FOR ALL USING (is_staff_de(escribania_id)) WITH CHECK (is_staff_de(escribania_id))',
      t, t
    );
  END LOOP;
END $$;

-- ============================================================
-- 9. RLS específicas que requieren acceso del cliente final
-- ============================================================

-- CLIENTES: el cliente final puede ver SU propio registro
CREATE POLICY "Cliente ve su registro" ON clientes
  FOR SELECT USING (user_id = auth.uid());

-- TRÁMITES: el cliente puede ver sus propios trámites
CREATE POLICY "Cliente ve sus tramites" ON tramites
  FOR SELECT USING (
    cliente_id IN (SELECT id FROM clientes WHERE user_id = auth.uid())
  );

-- HITOS: el cliente ve hitos de sus trámites
CREATE POLICY "Cliente ve hitos" ON tramite_hitos
  FOR SELECT USING (
    tramite_id IN (
      SELECT t.id FROM tramites t
      JOIN clientes c ON c.id = t.cliente_id
      WHERE c.user_id = auth.uid()
    )
  );

-- DOCUMENTOS: el cliente ve sus documentos visibles
CREATE POLICY "Cliente ve documentos visibles" ON documentos
  FOR SELECT USING (
    visible_cliente = TRUE
    AND tramite_id IN (
      SELECT t.id FROM tramites t
      JOIN clientes c ON c.id = t.cliente_id
      WHERE c.user_id = auth.uid()
    )
  );

-- ============================================================
-- 10. ESCRIBANIAS — RLS
-- ============================================================
ALTER TABLE escribanias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff ve su escribania" ON escribanias FOR SELECT
  USING (id = current_escribania_id() OR is_super_admin());

CREATE POLICY "Titular actualiza su escribania" ON escribanias FOR UPDATE
  USING ((id = current_escribania_id() AND is_titular()) OR is_super_admin())
  WITH CHECK ((id = current_escribania_id() AND is_titular()) OR is_super_admin());

CREATE POLICY "Super admin gestiona escribanias" ON escribanias FOR ALL
  USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ============================================================
-- 11. INVITACIONES — RLS
-- ============================================================
ALTER TABLE invitaciones ENABLE ROW LEVEL SECURITY;

-- Solo Titulares de la escribanía pueden gestionar invitaciones
CREATE POLICY "Titular gestiona invitaciones de su escribania" ON invitaciones FOR ALL
  USING (
    (escribania_id = current_escribania_id() AND is_titular())
    OR is_super_admin()
  )
  WITH CHECK (
    (escribania_id = current_escribania_id() AND is_titular())
    OR is_super_admin()
  );

-- ============================================================
-- 12. CONFIGURACION — RLS por escribanía
-- ============================================================
DROP POLICY IF EXISTS "Staff puede leer configuración" ON configuracion;
DROP POLICY IF EXISTS "Escribano puede modificar configuración" ON configuracion;
DROP POLICY IF EXISTS "Escribano puede insertar configuración" ON configuracion;

CREATE POLICY "Configuracion por escribania - read" ON configuracion FOR SELECT
  USING (escribania_id = current_escribania_id() OR is_super_admin());

CREATE POLICY "Configuracion por escribania - write" ON configuracion FOR ALL
  USING ((escribania_id = current_escribania_id() AND is_titular()) OR is_super_admin())
  WITH CHECK ((escribania_id = current_escribania_id() AND is_titular()) OR is_super_admin());

-- ============================================================
-- 13. AUDIT LOGS — RLS
-- ============================================================
DROP POLICY IF EXISTS "Staff lee logs propios" ON audit_logs;

CREATE POLICY "Audit logs por escribania" ON audit_logs FOR SELECT
  USING (
    escribania_id = current_escribania_id()
    OR is_super_admin()
  );

-- DELETE/UPDATE permanecen denegados (Fase 5)

-- ============================================================
-- 14. NOTIFICACIONES — el destinatario puede leer las suyas
-- ============================================================
DROP POLICY IF EXISTS "Usuario puede leer sus notificaciones" ON notificaciones;
DROP POLICY IF EXISTS "Usuario puede marcar sus notificaciones como leídas" ON notificaciones;
DROP POLICY IF EXISTS "Staff puede insertar notificaciones" ON notificaciones;

CREATE POLICY "Usuario lee sus notificaciones" ON notificaciones FOR SELECT
  USING (destinatario_id = auth.uid());

CREATE POLICY "Usuario actualiza sus notificaciones" ON notificaciones FOR UPDATE
  USING (destinatario_id = auth.uid());

CREATE POLICY "Staff inserta notificaciones de su escribania" ON notificaciones FOR INSERT
  WITH CHECK (is_staff_de(escribania_id));

-- ============================================================
-- 15. ENTREGAS — incluye acceso del cliente
-- ============================================================
CREATE POLICY "Cliente ve sus entregas" ON entregas FOR SELECT
  USING (
    tramite_id IN (
      SELECT t.id FROM tramites t
      JOIN clientes c ON c.id = t.cliente_id
      WHERE c.user_id = auth.uid()
    )
  );

-- ============================================================
-- 16. TURNOS — el cliente puede solicitar
-- ============================================================
CREATE POLICY "Cliente ve sus turnos" ON turnos FOR SELECT
  USING (cliente_id IN (SELECT id FROM clientes WHERE user_id = auth.uid()));

-- ============================================================
-- 17. TRIGGER: auto-fill escribania_id en INSERTS
-- ============================================================
-- Cuando un staff hace INSERT en una tabla con escribania_id sin
-- especificarlo, el sistema lo completa con su propia escribanía.
CREATE OR REPLACE FUNCTION auto_set_escribania_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.escribania_id IS NULL THEN
    NEW.escribania_id := current_escribania_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'clientes',
    'clientes_juridicos',
    'tramites',
    'tramite_hitos',
    'documentos',
    'indice_notarial',
    'alertas_uif',
    'turnos',
    'inmuebles',
    'operacion_pagos',
    'beneficiarios_finales',
    'declaraciones_juradas',
    'ros_reportes',
    'autoevaluaciones_riesgo',
    'capacitaciones',
    'capacitacion_asistentes',
    'manual_procedimientos',
    'manual_acuses',
    'revisiones_externas',
    'screening_resultados',
    'configuracion',
    'informes_registrales'
  ];
BEGIN
  FOREACH t IN ARRAY tablas
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS auto_escribania_%I ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER auto_escribania_%I BEFORE INSERT ON %I
       FOR EACH ROW EXECUTE FUNCTION auto_set_escribania_id()',
      t, t
    );
  END LOOP;
END $$;

-- También para audit_logs
DROP TRIGGER IF EXISTS auto_escribania_audit_logs ON audit_logs;
CREATE TRIGGER auto_escribania_audit_logs BEFORE INSERT ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION auto_set_escribania_id();

-- ============================================================
-- 18. TOKEN GENERATOR PARA INVITACIONES
-- ============================================================
CREATE OR REPLACE FUNCTION generar_token_invitacion()
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- 32 caracteres hex aleatorios
  v_token := encode(gen_random_bytes(24), 'hex');
  RETURN v_token;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ============================================================
-- 19. NOMBRAR PRIMER SUPER ADMIN
-- ============================================================
-- El usuario inicial (juanlazarte2024@gmail.com) queda como super admin
INSERT INTO super_admins (profile_id, notas)
SELECT id, 'Creador del SaaS — alta automática'
FROM profiles
WHERE email = 'juanlazarte2024@gmail.com'
ON CONFLICT (profile_id) DO NOTHING;
