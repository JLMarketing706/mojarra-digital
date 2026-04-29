-- ============================================================
-- MOJARRA DIGITAL — FASE 2 UIF
-- DDJJ digitales · ROS con plazos · RSA anual · Rol OC
-- Migración aditiva — no rompe datos existentes
-- ============================================================

-- ============================================================
-- 1. DECLARACIONES JURADAS
-- ============================================================
-- Cada DDJJ es un registro inmutable: se genera, se firma y se guarda.
-- Las distintas DDJJ se distinguen por `tipo`.
CREATE TABLE IF NOT EXISTS declaraciones_juradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN (
    'pep',                    -- Persona Expuesta Políticamente
    'sujeto_obligado',        -- Sujeto Obligado UIF
    'origen_fondos',          -- Origen y licitud de fondos
    'beneficiario_final',     -- Beneficiario final (PJ)
    'domicilio',              -- Declaración de domicilio
    'datos_personales',       -- Consentimiento Ley 25.326
    'gafi',                   -- No estar en listas GAFI
    'situacion_fiscal'        -- Situación fiscal (legacy)
  )),
  -- Vínculos: al menos uno
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  cliente_juridico_id UUID REFERENCES clientes_juridicos(id) ON DELETE CASCADE,
  tramite_id UUID REFERENCES tramites(id) ON DELETE SET NULL,
  beneficiario_final_id UUID REFERENCES beneficiarios_finales(id) ON DELETE SET NULL,
  -- Contenido
  contenido JSONB,            -- estructura específica según tipo
  pdf_url TEXT,               -- URL del PDF generado/firmado
  firmada BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_firma DATE,
  metodo_firma TEXT CHECK (metodo_firma IN ('digital', 'fisica', 'electronica')),
  ip_firma TEXT,
  -- Vigencia
  vigente BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  -- Auditoría
  emitido_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ddjj_cliente ON declaraciones_juradas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ddjj_tramite ON declaraciones_juradas(tramite_id);
CREATE INDEX IF NOT EXISTS idx_ddjj_tipo ON declaraciones_juradas(tipo);
CREATE INDEX IF NOT EXISTS idx_ddjj_vigente ON declaraciones_juradas(vigente) WHERE vigente = TRUE;

-- ============================================================
-- 2. REPORTES DE OPERACIÓN SOSPECHOSA (ROS)
-- ============================================================
-- Trazabilidad del flujo: inusual → en análisis → sospechosa → reportada
CREATE TABLE IF NOT EXISTS ros_reportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id UUID NOT NULL REFERENCES tramites(id) ON DELETE CASCADE,
  -- Tipo de ROS
  tipo TEXT NOT NULL CHECK (tipo IN ('LA', 'FT', 'FP')),
  -- Estado del flujo
  estado TEXT NOT NULL DEFAULT 'inusual' CHECK (estado IN (
    'inusual',           -- detectada como inusual (interno)
    'en_analisis',       -- bajo análisis del OC
    'sospechosa',        -- el OC concluye que es sospechosa, lista para reportar
    'reportada',         -- enviada a UIF, con número de constancia
    'descartada'         -- el análisis concluyó que no era sospechosa
  )),
  -- Motivos / análisis
  motivos_inusualidad TEXT,         -- por qué se la marcó como inusual
  analisis_oc TEXT,                 -- análisis del oficial de cumplimiento
  hechos_sospechosos TEXT,          -- los hechos concretos que justifican
  -- Plazos
  fecha_deteccion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_conclusion_sospecha TIMESTAMPTZ,    -- cuando el OC concluyó que era sospechosa
  fecha_limite_reporte TIMESTAMPTZ,         -- 24h desde la conclusión
  fecha_reportado TIMESTAMPTZ,
  -- Constancia UIF
  numero_constancia TEXT,
  acuse_url TEXT,
  -- Operación tentada o concretada
  operacion_concretada BOOLEAN NOT NULL DEFAULT TRUE,
  -- Auditoría
  detectado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reportado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ros_tramite ON ros_reportes(tramite_id);
CREATE INDEX IF NOT EXISTS idx_ros_estado ON ros_reportes(estado);
CREATE INDEX IF NOT EXISTS idx_ros_limite ON ros_reportes(fecha_limite_reporte) WHERE estado IN ('sospechosa', 'en_analisis');

-- Trigger: cuando se concluye que es sospechosa, calcular fecha límite (24h)
CREATE OR REPLACE FUNCTION ros_calcular_plazos()
RETURNS TRIGGER AS $$
BEGIN
  -- Si pasa a sospechosa, registrar fecha de conclusión y plazo de 24h
  IF NEW.estado = 'sospechosa' AND OLD.estado != 'sospechosa' THEN
    IF NEW.fecha_conclusion_sospecha IS NULL THEN
      NEW.fecha_conclusion_sospecha = NOW();
    END IF;
    NEW.fecha_limite_reporte = NEW.fecha_conclusion_sospecha + INTERVAL '24 hours';
  END IF;
  -- Si pasa a reportada, registrar fecha
  IF NEW.estado = 'reportada' AND OLD.estado != 'reportada' THEN
    IF NEW.fecha_reportado IS NULL THEN
      NEW.fecha_reportado = NOW();
    END IF;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ros_plazos_trigger ON ros_reportes;
CREATE TRIGGER ros_plazos_trigger
  BEFORE UPDATE ON ros_reportes
  FOR EACH ROW EXECUTE FUNCTION ros_calcular_plazos();

-- Trigger: al insertar con estado=sospechosa, también calcular plazo
CREATE OR REPLACE FUNCTION ros_plazos_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'sospechosa' AND NEW.fecha_limite_reporte IS NULL THEN
    IF NEW.fecha_conclusion_sospecha IS NULL THEN
      NEW.fecha_conclusion_sospecha = NOW();
    END IF;
    NEW.fecha_limite_reporte = NEW.fecha_conclusion_sospecha + INTERVAL '24 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ros_plazos_insert_trigger ON ros_reportes;
CREATE TRIGGER ros_plazos_insert_trigger
  BEFORE INSERT ON ros_reportes
  FOR EACH ROW EXECUTE FUNCTION ros_plazos_insert();

-- ============================================================
-- 3. AUTOEVALUACIÓN ANUAL DE RIESGOS (RSA)
-- ============================================================
CREATE TABLE IF NOT EXISTS autoevaluaciones_riesgo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anio INTEGER NOT NULL UNIQUE,
  -- Resumen anual (datos calculados al cerrar)
  total_clientes INTEGER DEFAULT 0,
  clientes_riesgo_alto INTEGER DEFAULT 0,
  clientes_riesgo_medio INTEGER DEFAULT 0,
  clientes_riesgo_bajo INTEGER DEFAULT 0,
  total_operaciones INTEGER DEFAULT 0,
  operaciones_uif INTEGER DEFAULT 0,
  total_pep INTEGER DEFAULT 0,
  total_bf_identificados INTEGER DEFAULT 0,
  total_ros INTEGER DEFAULT 0,
  total_ros_la INTEGER DEFAULT 0,
  total_ros_ft INTEGER DEFAULT 0,
  total_ros_fp INTEGER DEFAULT 0,
  -- Análisis cualitativo (texto extenso)
  metodologia TEXT,
  riesgos_identificados TEXT,
  controles_aplicados TEXT,
  plan_mitigacion TEXT,
  conclusiones TEXT,
  -- Estado
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'cerrado', 'presentado')),
  fecha_cierre DATE,
  fecha_presentacion DATE,
  numero_constancia TEXT,
  -- PDFs
  informe_pdf_url TEXT,
  acuse_url TEXT,
  -- Auditoría
  preparado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  firmado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS autoeval_updated_trigger ON autoevaluaciones_riesgo;
CREATE TRIGGER autoeval_updated_trigger
  BEFORE UPDATE ON autoevaluaciones_riesgo
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 4. CAPACITACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS capacitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  titulo TEXT NOT NULL,
  contenido TEXT,
  instructor TEXT,
  duracion_horas NUMERIC(4, 1),
  modalidad TEXT CHECK (modalidad IN ('presencial', 'virtual', 'mixta')),
  norma_origen TEXT DEFAULT 'Res. UIF 242/2023',
  constancia_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capacitacion_asistentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capacitacion_id UUID NOT NULL REFERENCES capacitaciones(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  asistio BOOLEAN NOT NULL DEFAULT FALSE,
  evaluacion_aprobada BOOLEAN,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(capacitacion_id, profile_id)
);

-- ============================================================
-- 5. RLS
-- ============================================================
ALTER TABLE declaraciones_juradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ros_reportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE autoevaluaciones_riesgo ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacitacion_asistentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff gestiona DDJJ" ON declaraciones_juradas FOR ALL USING (is_staff());
CREATE POLICY "Cliente ve sus DDJJ" ON declaraciones_juradas FOR SELECT USING (
  cliente_id IN (SELECT id FROM clientes WHERE user_id = auth.uid())
);

CREATE POLICY "Staff gestiona ROS" ON ros_reportes FOR ALL USING (is_staff());
CREATE POLICY "Staff gestiona autoevaluaciones" ON autoevaluaciones_riesgo FOR ALL USING (is_staff());
CREATE POLICY "Staff gestiona capacitaciones" ON capacitaciones FOR ALL USING (is_staff());
CREATE POLICY "Staff gestiona asistentes capacitación" ON capacitacion_asistentes FOR ALL USING (is_staff());

-- ============================================================
-- 6. FUNCIÓN AGREGADORA: STATS PARA RSA
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_stats_rsa(p_anio INTEGER)
RETURNS TABLE(
  total_clientes BIGINT,
  clientes_alto BIGINT,
  clientes_medio BIGINT,
  clientes_bajo BIGINT,
  total_operaciones BIGINT,
  operaciones_uif BIGINT,
  total_pep BIGINT,
  total_bf BIGINT,
  total_ros BIGINT,
  total_ros_la BIGINT,
  total_ros_ft BIGINT,
  total_ros_fp BIGINT
) AS $$
DECLARE
  v_inicio DATE = make_date(p_anio, 1, 1);
  v_fin DATE = make_date(p_anio, 12, 31);
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM clientes WHERE created_at::date BETWEEN v_inicio AND v_fin),
    (SELECT COUNT(*) FROM clientes WHERE nivel_riesgo = 'alto' AND created_at::date BETWEEN v_inicio AND v_fin),
    (SELECT COUNT(*) FROM clientes WHERE nivel_riesgo = 'medio' AND created_at::date BETWEEN v_inicio AND v_fin),
    (SELECT COUNT(*) FROM clientes WHERE nivel_riesgo = 'bajo' AND created_at::date BETWEEN v_inicio AND v_fin),
    (SELECT COUNT(*) FROM tramites WHERE COALESCE(fecha_escritura, created_at::date) BETWEEN v_inicio AND v_fin),
    (SELECT COUNT(*) FROM tramites WHERE dispara_uif = TRUE AND COALESCE(fecha_escritura, created_at::date) BETWEEN v_inicio AND v_fin),
    (SELECT COUNT(*) FROM clientes WHERE es_pep = TRUE AND created_at::date BETWEEN v_inicio AND v_fin),
    (SELECT COUNT(*) FROM beneficiarios_finales WHERE created_at::date BETWEEN v_inicio AND v_fin),
    (SELECT COUNT(*) FROM ros_reportes WHERE estado = 'reportada' AND fecha_reportado::date BETWEEN v_inicio AND v_fin),
    (SELECT COUNT(*) FROM ros_reportes WHERE estado = 'reportada' AND tipo = 'LA' AND fecha_reportado::date BETWEEN v_inicio AND v_fin),
    (SELECT COUNT(*) FROM ros_reportes WHERE estado = 'reportada' AND tipo = 'FT' AND fecha_reportado::date BETWEEN v_inicio AND v_fin),
    (SELECT COUNT(*) FROM ros_reportes WHERE estado = 'reportada' AND tipo = 'FP' AND fecha_reportado::date BETWEEN v_inicio AND v_fin);
END;
$$ LANGUAGE plpgsql STABLE;
