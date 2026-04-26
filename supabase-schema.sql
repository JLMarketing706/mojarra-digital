-- ============================================================
-- MOJARRA DIGITAL — Schema completo
-- Ejecutar en Supabase SQL Editor (en orden)
-- ============================================================

-- ============================================================
-- 1. EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. TABLAS
-- ============================================================

-- Perfiles de usuario (espejo de auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  rol TEXT NOT NULL DEFAULT 'cliente' CHECK (rol IN ('secretaria', 'protocolista', 'escribano', 'cliente')),
  avatar_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT,
  cuil TEXT,
  estado_civil TEXT,
  domicilio TEXT,
  email TEXT,
  telefono TEXT,
  es_pep BOOLEAN NOT NULL DEFAULT FALSE,
  es_sujeto_obligado BOOLEAN NOT NULL DEFAULT FALSE,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trámites
CREATE TABLE IF NOT EXISTS tramites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_referencia TEXT,
  tipo TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'iniciado'
    CHECK (estado IN ('iniciado', 'en_proceso', 'en_registro', 'listo', 'entregado')),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  escribano_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  descripcion TEXT,
  monto NUMERIC(14, 2),
  requiere_uif BOOLEAN NOT NULL DEFAULT FALSE,
  notas_internas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hitos / historial de trámite
CREATE TABLE IF NOT EXISTS tramite_hitos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id UUID NOT NULL REFERENCES tramites(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  autor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documentos adjuntos
CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id UUID REFERENCES tramites(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo TEXT,
  url TEXT NOT NULL,
  storage_path TEXT,
  visible_cliente BOOLEAN NOT NULL DEFAULT FALSE,
  subido_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice notarial
CREATE TABLE IF NOT EXISTS indice_notarial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_escritura INTEGER NOT NULL,
  folio TEXT,
  fecha DATE NOT NULL,
  tipo_acto TEXT NOT NULL,
  partes TEXT,
  inmueble TEXT,
  observaciones TEXT,
  escribano_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  tramite_id UUID REFERENCES tramites(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_indice_numero_anio
  ON indice_notarial (numero_escritura, EXTRACT(YEAR FROM fecha));

-- Alertas UIF
CREATE TABLE IF NOT EXISTS alertas_uif (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id UUID NOT NULL REFERENCES tramites(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('monto', 'pep', 'sujeto_obligado', 'otro')),
  descripcion TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'reportado', 'archivado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Turnos / agenda
CREATE TABLE IF NOT EXISTS turnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  motivo TEXT NOT NULL,
  fecha_hora TIMESTAMPTZ NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'confirmado', 'cancelado', 'realizado')),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Entregas
CREATE TABLE IF NOT EXISTS entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id UUID NOT NULL REFERENCES tramites(id) ON DELETE CASCADE,
  receptor_nombre TEXT NOT NULL,
  receptor_dni TEXT,
  receptor_relacion TEXT,
  notas TEXT,
  entregado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Presupuestos / consultas públicas
CREATE TABLE IF NOT EXISTS presupuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  tipo_tramite TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo', 'contactado', 'presupuestado', 'cerrado')),
  notas_internas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Configuración del sistema
CREATE TABLE IF NOT EXISTS configuracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Valores por defecto de configuración
INSERT INTO configuracion (clave, valor) VALUES
  ('nombre_escribania', 'Escribanía'),
  ('titular_escribano', ''),
  ('matricula', ''),
  ('domicilio', ''),
  ('telefono', ''),
  ('email', ''),
  ('salario_minimo', '800000')
ON CONFLICT (clave) DO NOTHING;

-- ============================================================
-- 3. TRIGGER: updated_at en tramites
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tramites_updated_at ON tramites;
CREATE TRIGGER tramites_updated_at
  BEFORE UPDATE ON tramites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 4. TRIGGER: crear profile al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nombre, apellido, email, rol)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nombre', ''), 'Sin nombre'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'apellido', ''), 'Sin apellido'),
    COALESCE(NEW.email, ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'rol', ''), 'cliente')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tramites ENABLE ROW LEVEL SECURITY;
ALTER TABLE tramite_hitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE indice_notarial ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_uif ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- Helper: ¿es staff el usuario autenticado?
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND rol IN ('secretaria', 'protocolista', 'escribano')
    AND activo = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: ¿es escribano o protocolista?
CREATE OR REPLACE FUNCTION is_escribano()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND rol IN ('escribano', 'protocolista')
    AND activo = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ---- profiles ----
CREATE POLICY "Cualquiera puede leer su propio perfil" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Staff puede leer todos los perfiles" ON profiles
  FOR SELECT USING (is_staff());

CREATE POLICY "Usuario puede actualizar su propio perfil" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Nuevo usuario puede insertar su perfil" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ---- clientes ----
CREATE POLICY "Staff puede gestionar clientes" ON clientes
  FOR ALL USING (is_staff());

CREATE POLICY "Cliente puede ver su propio registro" ON clientes
  FOR SELECT USING (user_id = auth.uid());

-- ---- tramites ----
CREATE POLICY "Staff puede gestionar trámites" ON tramites
  FOR ALL USING (is_staff());

CREATE POLICY "Cliente puede ver sus propios trámites" ON tramites
  FOR SELECT USING (
    cliente_id IN (
      SELECT id FROM clientes WHERE user_id = auth.uid()
    )
  );

-- ---- tramite_hitos ----
CREATE POLICY "Staff puede gestionar hitos" ON tramite_hitos
  FOR ALL USING (is_staff());

CREATE POLICY "Cliente puede ver hitos de sus trámites" ON tramite_hitos
  FOR SELECT USING (
    tramite_id IN (
      SELECT t.id FROM tramites t
      JOIN clientes c ON c.id = t.cliente_id
      WHERE c.user_id = auth.uid()
    )
  );

-- ---- documentos ----
CREATE POLICY "Staff puede gestionar documentos" ON documentos
  FOR ALL USING (is_staff());

CREATE POLICY "Cliente puede ver sus documentos visibles" ON documentos
  FOR SELECT USING (
    visible_cliente = TRUE
    AND tramite_id IN (
      SELECT t.id FROM tramites t
      JOIN clientes c ON c.id = t.cliente_id
      WHERE c.user_id = auth.uid()
    )
  );

-- ---- indice_notarial ----
CREATE POLICY "Staff puede gestionar índice notarial" ON indice_notarial
  FOR ALL USING (is_staff());

-- ---- alertas_uif ----
CREATE POLICY "Staff puede gestionar alertas UIF" ON alertas_uif
  FOR ALL USING (is_staff());

-- ---- turnos ----
CREATE POLICY "Staff puede gestionar todos los turnos" ON turnos
  FOR ALL USING (is_staff());

CREATE POLICY "Cliente puede ver e insertar sus turnos" ON turnos
  FOR SELECT USING (cliente_user_id = auth.uid());

CREATE POLICY "Cliente puede solicitar turno" ON turnos
  FOR INSERT WITH CHECK (cliente_user_id = auth.uid());

-- ---- notificaciones ----
CREATE POLICY "Usuario puede leer sus notificaciones" ON notificaciones
  FOR SELECT USING (destinatario_id = auth.uid());

CREATE POLICY "Usuario puede marcar sus notificaciones como leídas" ON notificaciones
  FOR UPDATE USING (destinatario_id = auth.uid());

CREATE POLICY "Staff puede insertar notificaciones" ON notificaciones
  FOR INSERT WITH CHECK (is_staff());

-- También permitir que el sistema (service_role) inserte notificaciones
-- (necesario para triggers y API routes con service key)

-- ---- entregas ----
CREATE POLICY "Staff puede gestionar entregas" ON entregas
  FOR ALL USING (is_staff());

CREATE POLICY "Cliente puede ver sus entregas" ON entregas
  FOR SELECT USING (
    tramite_id IN (
      SELECT t.id FROM tramites t
      JOIN clientes c ON c.id = t.cliente_id
      WHERE c.user_id = auth.uid()
    )
  );

-- ---- presupuestos ----
CREATE POLICY "Inserción pública para presupuestos" ON presupuestos
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Staff puede gestionar presupuestos" ON presupuestos
  FOR ALL USING (is_staff());

-- ---- configuracion ----
CREATE POLICY "Staff puede leer configuración" ON configuracion
  FOR SELECT USING (is_staff());

CREATE POLICY "Escribano puede modificar configuración" ON configuracion
  FOR UPDATE USING (is_escribano());

CREATE POLICY "Escribano puede insertar configuración" ON configuracion
  FOR INSERT WITH CHECK (is_escribano());

-- ============================================================
-- 6. STORAGE BUCKETS
-- ============================================================

-- Bucket privado para documentos de clientes y trámites
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos-privados',
  'documentos-privados',
  FALSE,
  10485760,  -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket público para assets (logo, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-publicos', 'documentos-publicos', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: documentos-privados
CREATE POLICY "Staff puede subir documentos privados" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos-privados' AND is_staff()
  );

CREATE POLICY "Staff puede leer documentos privados" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documentos-privados' AND is_staff()
  );

CREATE POLICY "Staff puede eliminar documentos privados" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documentos-privados' AND is_staff()
  );

CREATE POLICY "Cliente puede subir sus documentos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos-privados'
    AND auth.uid() IS NOT NULL
  );

-- Storage policies: documentos-publicos
CREATE POLICY "Cualquiera puede leer documentos públicos" ON storage.objects
  FOR SELECT USING (bucket_id = 'documentos-publicos');

CREATE POLICY "Staff puede gestionar documentos públicos" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documentos-publicos' AND is_staff()
  );

-- ============================================================
-- 7. REALTIME
-- ============================================================

-- Habilitar Realtime para notificaciones (tabla de cambios)
ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;
