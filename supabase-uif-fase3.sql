-- ============================================================
-- MOJARRA DIGITAL — FASE 3 UIF
-- Manual versionado · Audit logs · Screening · Revisiones externas
-- Migración aditiva
-- ============================================================

-- ============================================================
-- 1. MANUAL DE PROCEDIMIENTOS PLA/FT (versionado)
-- ============================================================
CREATE TABLE IF NOT EXISTS manual_procedimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,                 -- ej: "1.0", "2.1"
  titulo TEXT NOT NULL DEFAULT 'Manual de procedimientos PLA/FT',
  contenido TEXT NOT NULL,               -- markdown
  resumen_cambios TEXT,                  -- changelog
  vigente BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_vigencia DATE,
  pdf_url TEXT,
  aprobado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  fecha_aprobacion TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(version)
);

-- Solo un manual vigente a la vez
CREATE OR REPLACE FUNCTION manual_solo_uno_vigente()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vigente = TRUE THEN
    UPDATE manual_procedimientos SET vigente = FALSE
    WHERE id != NEW.id AND vigente = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS manual_unico_vigente ON manual_procedimientos;
CREATE TRIGGER manual_unico_vigente
  AFTER INSERT OR UPDATE OF vigente ON manual_procedimientos
  FOR EACH ROW WHEN (NEW.vigente = TRUE)
  EXECUTE FUNCTION manual_solo_uno_vigente();

-- Acuses de lectura del manual por cada empleado
CREATE TABLE IF NOT EXISTS manual_acuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id UUID NOT NULL REFERENCES manual_procedimientos(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fecha_acuse TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_acuse TEXT,
  observaciones TEXT,
  UNIQUE(manual_id, profile_id)
);

-- ============================================================
-- 2. REVISIONES EXTERNAS (Res. 242/2023)
-- ============================================================
CREATE TABLE IF NOT EXISTS revisiones_externas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  revisor_nombre TEXT NOT NULL,
  revisor_matricula TEXT,
  revisor_email TEXT,
  alcance TEXT,                       -- qué se revisó
  hallazgos TEXT,                     -- conclusiones
  plan_accion TEXT,                   -- qué se va a hacer
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'en_proceso', 'completada', 'archivada')),
  informe_url TEXT,
  acta_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS revisiones_updated ON revisiones_externas;
CREATE TRIGGER revisiones_updated
  BEFORE UPDATE ON revisiones_externas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 3. LISTAS DE SANCIONES Y PEP
-- ============================================================
-- Tabla genérica para almacenar entradas de listas externas
-- (PEP, OFAC, ONU, GAFI, etc.)
CREATE TABLE IF NOT EXISTS listas_sancion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origen TEXT NOT NULL CHECK (origen IN ('PEP_AR', 'OFAC', 'ONU', 'UE', 'GAFI', 'INTERPOL', 'OTRO')),
  nombre_completo TEXT NOT NULL,
  alias TEXT,
  documento TEXT,
  pais TEXT,
  fecha_nacimiento DATE,
  cargo TEXT,
  motivo TEXT,
  fecha_inclusion DATE,
  observaciones TEXT,
  vigente BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listas_origen ON listas_sancion(origen);
CREATE INDEX IF NOT EXISTS idx_listas_nombre ON listas_sancion(nombre_completo);
CREATE INDEX IF NOT EXISTS idx_listas_documento ON listas_sancion(documento) WHERE documento IS NOT NULL;
-- Búsqueda fuzzy con trigram
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_listas_nombre_trgm ON listas_sancion USING gin (nombre_completo gin_trgm_ops);

-- Resultado de screening por cliente
CREATE TABLE IF NOT EXISTS screening_resultados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  cliente_juridico_id UUID REFERENCES clientes_juridicos(id) ON DELETE CASCADE,
  lista_id UUID NOT NULL REFERENCES listas_sancion(id) ON DELETE CASCADE,
  similitud NUMERIC(5, 2) NOT NULL,    -- 0-100
  motivo_match TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'confirmado', 'descartado')),
  observaciones TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screening_cliente ON screening_resultados(cliente_id);
CREATE INDEX IF NOT EXISTS idx_screening_estado ON screening_resultados(estado);

-- Función para hacer screening de un cliente humano
CREATE OR REPLACE FUNCTION screen_cliente(p_cliente_id UUID)
RETURNS TABLE(
  lista_id UUID,
  origen TEXT,
  nombre_lista TEXT,
  similitud NUMERIC
) AS $$
DECLARE
  v_nombre TEXT;
  v_apellido TEXT;
  v_dni TEXT;
  v_full TEXT;
BEGIN
  SELECT c.nombre, c.apellido, c.dni
  INTO v_nombre, v_apellido, v_dni
  FROM clientes c WHERE c.id = p_cliente_id;

  v_full = v_nombre || ' ' || v_apellido;

  RETURN QUERY
  SELECT
    l.id,
    l.origen,
    l.nombre_completo,
    GREATEST(
      similarity(l.nombre_completo, v_full) * 100,
      CASE WHEN l.documento IS NOT NULL AND l.documento = v_dni THEN 100 ELSE 0 END
    )::NUMERIC(5,2) AS sim
  FROM listas_sancion l
  WHERE l.vigente = TRUE
    AND (
      similarity(l.nombre_completo, v_full) > 0.4
      OR (l.documento IS NOT NULL AND l.documento = v_dni)
    )
  ORDER BY sim DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 4. AUDIT LOGS (trazabilidad completa)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_email TEXT,
  accion TEXT NOT NULL,            -- INSERT, UPDATE, DELETE, LOGIN, EXPORT, etc.
  tabla TEXT NOT NULL,
  registro_id UUID,
  cambios JSONB,                    -- diff
  ip TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_logs(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_tabla ON audit_logs(tabla);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_registro ON audit_logs(registro_id);

-- Trigger genérico para registrar cambios en tablas sensibles
CREATE OR REPLACE FUNCTION audit_change()
RETURNS TRIGGER AS $$
DECLARE
  v_actor UUID;
  v_email TEXT;
  v_changes JSONB;
BEGIN
  v_actor = auth.uid();
  IF v_actor IS NOT NULL THEN
    SELECT email INTO v_email FROM profiles WHERE id = v_actor;
  END IF;

  IF (TG_OP = 'INSERT') THEN
    v_changes = to_jsonb(NEW);
    INSERT INTO audit_logs(actor_id, actor_email, accion, tabla, registro_id, cambios)
      VALUES (v_actor, v_email, 'INSERT', TG_TABLE_NAME, NEW.id, v_changes);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_changes = jsonb_build_object('antes', to_jsonb(OLD), 'despues', to_jsonb(NEW));
    INSERT INTO audit_logs(actor_id, actor_email, accion, tabla, registro_id, cambios)
      VALUES (v_actor, v_email, 'UPDATE', TG_TABLE_NAME, NEW.id, v_changes);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_changes = to_jsonb(OLD);
    INSERT INTO audit_logs(actor_id, actor_email, accion, tabla, registro_id, cambios)
      VALUES (v_actor, v_email, 'DELETE', TG_TABLE_NAME, OLD.id, v_changes);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar audit trigger a tablas críticas (idempotente)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clientes', 'clientes_juridicos', 'tramites',
    'declaraciones_juradas', 'ros_reportes', 'beneficiarios_finales',
    'autoevaluaciones_riesgo', 'manual_procedimientos'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I_trigger ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER audit_%I_trigger AFTER INSERT OR UPDATE OR DELETE ON %I
       FOR EACH ROW EXECUTE FUNCTION audit_change()', t, t);
  END LOOP;
END $$;

-- ============================================================
-- 5. RLS
-- ============================================================
ALTER TABLE manual_procedimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_acuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE revisiones_externas ENABLE ROW LEVEL SECURITY;
ALTER TABLE listas_sancion ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_resultados ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff lee manual" ON manual_procedimientos FOR SELECT USING (is_staff());
CREATE POLICY "Escribano edita manual" ON manual_procedimientos FOR ALL USING (is_escribano());

CREATE POLICY "Staff registra acuse" ON manual_acuses FOR INSERT WITH CHECK (is_staff() AND profile_id = auth.uid());
CREATE POLICY "Staff lee acuses" ON manual_acuses FOR SELECT USING (is_staff());

CREATE POLICY "Staff gestiona revisiones" ON revisiones_externas FOR ALL USING (is_staff());

CREATE POLICY "Staff lee listas" ON listas_sancion FOR SELECT USING (is_staff());
CREATE POLICY "Escribano gestiona listas" ON listas_sancion FOR ALL USING (is_escribano());

CREATE POLICY "Staff gestiona screening" ON screening_resultados FOR ALL USING (is_staff());

CREATE POLICY "Staff lee logs propios" ON audit_logs FOR SELECT USING (is_staff());

-- ============================================================
-- 6. SEED DATOS DE PEP NACIONAL (ejemplos)
-- ============================================================
-- Algunos nombres de PEPs argentinos públicos para que el screening funcione de demo
INSERT INTO listas_sancion (origen, nombre_completo, cargo, pais, fecha_inclusion, motivo) VALUES
  ('PEP_AR', 'Javier Milei', 'Presidente de la Nación', 'AR', '2023-12-10', 'Funcionario público de máxima jerarquía'),
  ('PEP_AR', 'Victoria Villarruel', 'Vicepresidenta de la Nación', 'AR', '2023-12-10', 'Funcionaria pública'),
  ('PEP_AR', 'Luis Caputo', 'Ministro de Economía', 'AR', '2023-12-10', 'Funcionario público'),
  ('PEP_AR', 'Patricia Bullrich', 'Ministra de Seguridad', 'AR', '2023-12-10', 'Funcionaria pública'),
  ('PEP_AR', 'Mauricio Macri', 'Ex Presidente', 'AR', '2015-12-10', 'PEP por antecedente'),
  ('PEP_AR', 'Cristina Fernández de Kirchner', 'Ex Presidenta', 'AR', '2007-12-10', 'PEP por antecedente'),
  ('PEP_AR', 'Alberto Fernández', 'Ex Presidente', 'AR', '2019-12-10', 'PEP por antecedente'),
  ('PEP_AR', 'Axel Kicillof', 'Gobernador Buenos Aires', 'AR', '2019-12-10', 'Funcionario público'),
  ('PEP_AR', 'Jorge Macri', 'Jefe de Gobierno CABA', 'AR', '2023-12-10', 'Funcionario público'),
  ('OFAC', 'Vladimir Putin', 'Presidente Federación Rusa', 'RU', '2022-02-24', 'Sanción OFAC SDN'),
  ('ONU', 'Kim Jong-un', 'Líder supremo Corea del Norte', 'KP', '2017-09-11', 'Sanción ONU 2371')
ON CONFLICT DO NOTHING;
