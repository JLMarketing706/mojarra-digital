-- ============================================================
-- MOJARRA DIGITAL — FASE 1 UIF (Res. 242/2023, 56/2024, 78/2025)
-- Migración aditiva — no rompe datos existentes
-- ============================================================

-- ============================================================
-- 1. TABLA DE SMVM HISTÓRICO
-- ============================================================
CREATE TABLE IF NOT EXISTS smvm_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vigencia_desde DATE NOT NULL UNIQUE,
  valor NUMERIC(14, 2) NOT NULL,
  norma_origen TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO smvm_historico (vigencia_desde, valor, norma_origen) VALUES
  ('2024-08-01', 271571.22, 'Res. CNEPySMVyM 9/2024'),
  ('2024-11-01', 279718.00, 'Res. CNEPySMVyM 10/2024'),
  ('2025-01-01', 286711.00, 'Res. CNEPySMVyM 11/2024'),
  ('2025-06-01', 308200.00, 'Res. CNEPySMVyM (proyección)')
ON CONFLICT (vigencia_desde) DO NOTHING;

-- ============================================================
-- 2. TABLA DE UMBRALES UIF (parametrizable)
-- ============================================================
CREATE TABLE IF NOT EXISTS umbrales_uif (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  unidad TEXT NOT NULL DEFAULT 'SMVM',
  norma_origen TEXT,
  vigencia_desde DATE NOT NULL,
  vigencia_hasta DATE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO umbrales_uif (codigo, descripcion, valor, unidad, norma_origen, vigencia_desde) VALUES
  ('compraventa_efectivo_rsm', 'Compraventa de inmueble en efectivo - umbral RSM', 750, 'SMVM', 'Res. UIF 78/2025', '2025-06-06'),
  ('compraventa_inmueble', 'Sujeción del escribano - compraventa inmuebles', 700, 'SMVM', 'Ley 25.246 art. 20 bis', '2011-01-01'),
  ('admin_bienes', 'Administración de bienes', 150, 'SMVM', 'Ley 25.246', '2011-01-01'),
  ('admin_cuentas', 'Administración de cuentas, ahorros y valores', 50, 'SMVM', 'Ley 25.246', '2011-01-01'),
  ('beneficiario_final_pct', '% de participación que define BF', 10, '%', 'Res. UIF Beneficiario Final', '2018-01-01'),
  ('actualizacion_riesgo_alto', 'Frecuencia actualización legajo riesgo alto', 1, 'AÑOS', 'Res. UIF 242/2023 art. 16', '2024-03-01'),
  ('actualizacion_riesgo_medio', 'Frecuencia actualización legajo riesgo medio', 3, 'AÑOS', 'Res. UIF 242/2023 art. 16', '2024-03-01'),
  ('actualizacion_riesgo_bajo', 'Frecuencia actualización legajo riesgo bajo', 5, 'AÑOS', 'Res. UIF 242/2023 art. 16', '2024-03-01'),
  ('conservacion_documental', 'Conservación de documentación', 5, 'AÑOS', 'Ley 25.246', '2011-01-01'),
  ('plazo_ros_la', 'Plazo ROS Lavado de Activos', 24, 'HORAS', 'Res. UIF 56/2024', '2024-01-01'),
  ('plazo_ros_la_max', 'Plazo máximo ROS LA desde la operación', 90, 'DIAS', 'Res. UIF 56/2024', '2024-01-01'),
  ('plazo_ros_ft', 'Plazo ROS Financiamiento del Terrorismo', 24, 'HORAS', 'Res. UIF 56/2024', '2024-01-01'),
  ('plazo_ros_fp', 'Plazo ROS Financiamiento de Proliferación', 24, 'HORAS', 'Res. UIF 56/2024', '2024-01-01')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- 3. AMPLIAR TABLA `clientes` PARA PERSONA HUMANA COMPLETA
-- ============================================================
-- Discriminador de tipo de cliente
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_persona TEXT NOT NULL DEFAULT 'humana'
  CHECK (tipo_persona IN ('humana', 'juridica', 'fideicomiso'));

-- Identificación detallada
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_documento TEXT
  CHECK (tipo_documento IN ('DNI', 'CI', 'Pasaporte'));
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS sexo TEXT
  CHECK (sexo IN ('F', 'M', 'X'));
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS lugar_nacimiento TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nacionalidad TEXT;

-- Domicilio estructurado (reemplaza el campo `domicilio` libre)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dom_calle TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dom_numero TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dom_piso TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dom_localidad TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dom_provincia TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dom_codigo_postal TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dom_pais TEXT DEFAULT 'AR';

-- Cónyuge / conviviente (para evaluar PEP por parentesco)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS conyuge_nombre TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS conyuge_dni TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS conyuge_es_pep BOOLEAN DEFAULT FALSE;

-- Perfil económico
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS profesion TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS empleador TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ingreso_mensual NUMERIC(14, 2);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS patrimonio_aprox NUMERIC(14, 2);

-- PEP detallado (Res. UIF 35/2023 + 192/2024)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_pep TEXT
  CHECK (tipo_pep IN ('funcionario', 'familiar', 'allegado'));
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cargo_pep TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS jurisdiccion_pep TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS periodo_pep_desde DATE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS periodo_pep_hasta DATE;

-- Sujeto Obligado UIF
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS uif_inscripcion_numero TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS uif_inscripcion_fecha DATE;

-- Documentos KYC (URLs en Storage)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS foto_dni_frente_url TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS foto_dni_dorso_url TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS selfie_kyc_url TEXT;

-- Riesgo y legajo
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nivel_riesgo TEXT
  CHECK (nivel_riesgo IN ('bajo', 'medio', 'alto'));
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS fecha_alta_legajo DATE DEFAULT CURRENT_DATE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS fecha_ultima_actualizacion DATE DEFAULT CURRENT_DATE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS proxima_actualizacion DATE;

-- ============================================================
-- 4. TABLA `clientes_juridicos`
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes_juridicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  -- Identificación
  razon_social TEXT NOT NULL,
  nombre_fantasia TEXT,
  forma_juridica TEXT NOT NULL CHECK (forma_juridica IN
    ('SA', 'SRL', 'SAS', 'SCS', 'SCA', 'Asoc.Civil', 'Fundacion', 'Cooperativa', 'Mutual', 'Fideicomiso', 'Otra')),
  cuit TEXT NOT NULL,
  fecha_constitucion DATE,
  -- Inscripción registral
  registro_publico TEXT,
  inscripcion_numero TEXT,
  inscripcion_fecha DATE,
  -- Capital y actividad
  capital_social NUMERIC(14, 2),
  objeto_social TEXT,
  actividad_real TEXT,
  codigo_actividad TEXT,
  cantidad_empleados INTEGER,
  facturacion_anual NUMERIC(14, 2),
  patrimonio_neto NUMERIC(14, 2),
  -- Domicilios
  dom_legal_calle TEXT, dom_legal_numero TEXT, dom_legal_piso TEXT,
  dom_legal_localidad TEXT, dom_legal_provincia TEXT, dom_legal_pais TEXT DEFAULT 'AR',
  dom_real_calle TEXT, dom_real_numero TEXT, dom_real_piso TEXT,
  dom_real_localidad TEXT, dom_real_provincia TEXT, dom_real_pais TEXT DEFAULT 'AR',
  -- Contacto
  telefono TEXT, email TEXT, sitio_web TEXT,
  cotiza_mercado BOOLEAN DEFAULT FALSE,
  -- Documentos
  estatuto_url TEXT,
  acta_designacion_url TEXT,
  certificado_vigencia_url TEXT,
  ultimo_balance_url TEXT,
  -- Riesgo
  nivel_riesgo TEXT CHECK (nivel_riesgo IN ('bajo', 'medio', 'alto')),
  fecha_alta_legajo DATE DEFAULT CURRENT_DATE,
  fecha_ultima_actualizacion DATE DEFAULT CURRENT_DATE,
  proxima_actualizacion DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_juridicos_cuit ON clientes_juridicos(cuit);
CREATE INDEX IF NOT EXISTS idx_clientes_juridicos_cliente ON clientes_juridicos(cliente_id);

-- ============================================================
-- 5. TABLA `beneficiarios_finales`
-- ============================================================
CREATE TABLE IF NOT EXISTS beneficiarios_finales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_juridico_id UUID REFERENCES clientes_juridicos(id) ON DELETE CASCADE,
  cliente_humano_id UUID REFERENCES clientes(id) ON DELETE RESTRICT,
  pct_directa NUMERIC(5, 2) NOT NULL DEFAULT 0,
  pct_indirecta NUMERIC(5, 2) NOT NULL DEFAULT 0,
  pct_voto NUMERIC(5, 2) NOT NULL DEFAULT 0,
  tipo_control TEXT CHECK (tipo_control IN ('capital', 'voto', 'contrato', 'otro')),
  cadena_titularidad TEXT,
  organigrama_url TEXT,
  bf_es_pep BOOLEAN DEFAULT FALSE,
  ddjj_bf_url TEXT,
  ddjj_bf_fecha DATE,
  sin_bf_administrador BOOLEAN DEFAULT FALSE,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. TABLA `inmuebles`
-- ============================================================
CREATE TABLE IF NOT EXISTS inmuebles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_inmueble TEXT CHECK (tipo_inmueble IN
    ('Casa', 'Departamento', 'Lote', 'LocalComercial', 'Galpon', 'Campo', 'Otro')),
  -- Dirección
  calle TEXT,
  numero TEXT,
  piso_unidad TEXT,
  localidad TEXT,
  provincia TEXT,
  codigo_postal TEXT,
  -- Catastro
  nomenclatura_catastral TEXT,
  matricula_registral TEXT,
  superficie_terreno NUMERIC(10, 2),
  superficie_cubierta NUMERIC(10, 2),
  -- Valuaciones
  valuacion_fiscal NUMERIC(14, 2),
  valuacion_catastral NUMERIC(14, 2),
  -- UIF
  zona_frontera BOOLEAN DEFAULT FALSE,
  zona_seguridad BOOLEAN DEFAULT FALSE,
  -- Antecedentes
  antecedentes_dominiales TEXT,
  tiene_gravamenes BOOLEAN DEFAULT FALSE,
  detalle_gravamenes TEXT,
  -- Documentos
  informe_dominio_url TEXT,
  cedula_catastral_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. AMPLIAR `tramites` CON DATOS DE OPERACIÓN UIF
-- ============================================================
ALTER TABLE tramites ADD COLUMN IF NOT EXISTS numero_escritura TEXT;
ALTER TABLE tramites ADD COLUMN IF NOT EXISTS folio_protocolo TEXT;
ALTER TABLE tramites ADD COLUMN IF NOT EXISTS registro_notarial TEXT;
ALTER TABLE tramites ADD COLUMN IF NOT EXISTS fecha_escritura DATE;
ALTER TABLE tramites ADD COLUMN IF NOT EXISTS tipo_acto TEXT
  CHECK (tipo_acto IN ('compraventa_inmueble', 'constitucion_sociedad', 'cesion_cuotas',
                        'fideicomiso', 'hipoteca', 'donacion', 'mutuo', 'otro'));
ALTER TABLE tramites ADD COLUMN IF NOT EXISTS dispara_uif BOOLEAN DEFAULT FALSE;
ALTER TABLE tramites ADD COLUMN IF NOT EXISTS monto_efectivo NUMERIC(14, 2) DEFAULT 0;
ALTER TABLE tramites ADD COLUMN IF NOT EXISTS monto_moneda_extranjera NUMERIC(14, 2);
ALTER TABLE tramites ADD COLUMN IF NOT EXISTS moneda_extranjera TEXT;
ALTER TABLE tramites ADD COLUMN IF NOT EXISTS tipo_cambio NUMERIC(10, 4);
ALTER TABLE tramites ADD COLUMN IF NOT EXISTS forma_pago TEXT
  CHECK (forma_pago IN ('efectivo', 'transferencia', 'cheque', 'mixto', 'permuta', 'credito_hipotecario', 'otra'));
ALTER TABLE tramites ADD COLUMN IF NOT EXISTS origen_fondos TEXT;
ALTER TABLE tramites ADD COLUMN IF NOT EXISTS inmueble_id UUID REFERENCES inmuebles(id) ON DELETE SET NULL;
ALTER TABLE tramites ADD COLUMN IF NOT EXISTS cliente_juridico_id UUID REFERENCES clientes_juridicos(id) ON DELETE SET NULL;
ALTER TABLE tramites ADD COLUMN IF NOT EXISTS estado_uif TEXT DEFAULT 'no'
  CHECK (estado_uif IN ('no', 'inusual', 'en_analisis', 'sospechosa', 'reportada'));
ALTER TABLE tramites ADD COLUMN IF NOT EXISTS ros_constancia_numero TEXT;
ALTER TABLE tramites ADD COLUMN IF NOT EXISTS ros_fecha DATE;
ALTER TABLE tramites ADD COLUMN IF NOT EXISTS cumplimiento_dd TEXT DEFAULT 'pendiente'
  CHECK (cumplimiento_dd IN ('si', 'no', 'pendiente'));
ALTER TABLE tramites ADD COLUMN IF NOT EXISTS aprobacion_oc TEXT
  CHECK (aprobacion_oc IN ('si', 'no', 'pendiente'));

-- ============================================================
-- 8. DETALLE DE PAGOS (clave para detectar 750 SMVM en efectivo)
-- ============================================================
CREATE TABLE IF NOT EXISTS operacion_pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id UUID NOT NULL REFERENCES tramites(id) ON DELETE CASCADE,
  importe NUMERIC(14, 2) NOT NULL,
  medio TEXT NOT NULL CHECK (medio IN ('efectivo', 'transferencia', 'cheque', 'permuta', 'credito')),
  banco TEXT,
  cbu TEXT,
  cuenta_titular TEXT,
  fecha_pago DATE,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_tramite ON operacion_pagos(tramite_id);

-- ============================================================
-- 9. ROLES AMPLIADOS (compatibilidad hacia atrás)
-- ============================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_rol_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_rol_check CHECK (rol IN (
  'escribano_titular', 'oficial_cumplimiento', 'escribano_adscripto',
  'empleado_admin', 'auditor_externo', 'cliente',
  -- Roles legacy (mantener para no romper datos existentes)
  'secretaria', 'protocolista', 'escribano'
));

-- ============================================================
-- 10. FUNCIONES HELPER
-- ============================================================

-- 10.1 SMVM vigente en una fecha dada
CREATE OR REPLACE FUNCTION smvm_vigente_a(p_fecha DATE)
RETURNS NUMERIC AS $$
DECLARE v NUMERIC;
BEGIN
  SELECT valor INTO v FROM smvm_historico
  WHERE vigencia_desde <= p_fecha
  ORDER BY vigencia_desde DESC LIMIT 1;
  RETURN COALESCE(v, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- 10.2 Calcular nivel de riesgo (basado en factores Res. 242/2023)
CREATE OR REPLACE FUNCTION calcular_nivel_riesgo(
  p_es_pep BOOLEAN,
  p_es_so BOOLEAN,
  p_pais TEXT,
  p_actividad TEXT,
  p_ingreso NUMERIC,
  p_patrimonio NUMERIC
) RETURNS TEXT AS $$
BEGIN
  -- ALTO: PEP, SO o jurisdicción de alto riesgo GAFI
  IF p_es_pep OR p_es_so THEN
    RETURN 'alto';
  END IF;
  IF p_pais IN ('IR', 'KP', 'MM', 'SY', 'AF', 'YE') THEN
    RETURN 'alto';
  END IF;
  -- MEDIO: patrimonio elevado o actividad sensible
  IF COALESCE(p_patrimonio, 0) > 100000000 THEN
    RETURN 'medio';
  END IF;
  IF p_actividad IS NOT NULL AND (
    p_actividad ILIKE '%inmobili%' OR
    p_actividad ILIKE '%cripto%' OR
    p_actividad ILIKE '%casino%' OR
    p_actividad ILIKE '%cambio%' OR
    p_actividad ILIKE '%efectivo%'
  ) THEN
    RETURN 'medio';
  END IF;
  RETURN 'bajo';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 10.3 Próxima actualización del legajo según riesgo
CREATE OR REPLACE FUNCTION proxima_actualizacion_por_riesgo(p_nivel TEXT, p_desde DATE)
RETURNS DATE AS $$
BEGIN
  RETURN p_desde + (CASE p_nivel
    WHEN 'alto' THEN INTERVAL '1 year'
    WHEN 'medio' THEN INTERVAL '3 years'
    ELSE INTERVAL '5 years'
  END);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 11. TRIGGERS AUTOMÁTICOS
-- ============================================================

-- 11.1 Cliente: calcular riesgo y próxima actualización
CREATE OR REPLACE FUNCTION clientes_calcular_riesgo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.nivel_riesgo IS NULL THEN
    NEW.nivel_riesgo = calcular_nivel_riesgo(
      COALESCE(NEW.es_pep, FALSE),
      COALESCE(NEW.es_sujeto_obligado, FALSE),
      NEW.dom_pais,
      NEW.profesion,
      NEW.ingreso_mensual,
      NEW.patrimonio_aprox
    );
  END IF;
  IF NEW.fecha_alta_legajo IS NULL THEN
    NEW.fecha_alta_legajo = CURRENT_DATE;
  END IF;
  IF NEW.fecha_ultima_actualizacion IS NULL THEN
    NEW.fecha_ultima_actualizacion = CURRENT_DATE;
  END IF;
  NEW.proxima_actualizacion = proxima_actualizacion_por_riesgo(
    NEW.nivel_riesgo, NEW.fecha_ultima_actualizacion
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clientes_riesgo_trigger ON clientes;
CREATE TRIGGER clientes_riesgo_trigger
  BEFORE INSERT OR UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION clientes_calcular_riesgo();

-- 11.2 Trámite: calcular automáticamente si dispara obligación UIF
CREATE OR REPLACE FUNCTION tramites_calcular_uif()
RETURNS TRIGGER AS $$
DECLARE
  v_smvm NUMERIC;
  v_umbral_efectivo NUMERIC;
  v_umbral_compraventa NUMERIC;
  v_fecha DATE;
BEGIN
  v_fecha = COALESCE(NEW.fecha_escritura, CURRENT_DATE);
  v_smvm = smvm_vigente_a(v_fecha);

  -- Por defecto no dispara
  NEW.dispara_uif = FALSE;

  -- Constitución/admin de PJ y fideicomiso: sin mínimo
  IF NEW.tipo_acto IN ('constitucion_sociedad', 'cesion_cuotas', 'fideicomiso') THEN
    NEW.dispara_uif = TRUE;
  END IF;

  -- Compraventa en efectivo: umbral 750 SMVM
  IF NEW.tipo_acto = 'compraventa_inmueble' AND COALESCE(NEW.monto_efectivo, 0) > 0 THEN
    SELECT valor INTO v_umbral_efectivo FROM umbrales_uif
      WHERE codigo = 'compraventa_efectivo_rsm' AND activo = TRUE;
    IF NEW.monto_efectivo >= v_smvm * COALESCE(v_umbral_efectivo, 750) THEN
      NEW.dispara_uif = TRUE;
    END IF;
  END IF;

  -- Compraventa total: sujeción si >= 700 SMVM
  IF NEW.tipo_acto = 'compraventa_inmueble' AND COALESCE(NEW.monto, 0) > 0 THEN
    SELECT valor INTO v_umbral_compraventa FROM umbrales_uif
      WHERE codigo = 'compraventa_inmueble' AND activo = TRUE;
    IF NEW.monto >= v_smvm * COALESCE(v_umbral_compraventa, 700) THEN
      NEW.dispara_uif = TRUE;
    END IF;
  END IF;

  -- Mantener compatibilidad con campo legacy `requiere_uif`
  IF NEW.dispara_uif THEN
    NEW.requiere_uif = TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tramites_uif_trigger ON tramites;
CREATE TRIGGER tramites_uif_trigger
  BEFORE INSERT OR UPDATE OF monto, monto_efectivo, tipo_acto, fecha_escritura ON tramites
  FOR EACH ROW EXECUTE FUNCTION tramites_calcular_uif();

-- ============================================================
-- 12. ROW LEVEL SECURITY PARA NUEVAS TABLAS
-- ============================================================
ALTER TABLE smvm_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE umbrales_uif ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_juridicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiarios_finales ENABLE ROW LEVEL SECURITY;
ALTER TABLE inmuebles ENABLE ROW LEVEL SECURITY;
ALTER TABLE operacion_pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura SMVM autenticados" ON smvm_historico
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Solo escribano modifica SMVM" ON smvm_historico
  FOR ALL USING (is_escribano());

CREATE POLICY "Lectura umbrales autenticados" ON umbrales_uif
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Solo escribano modifica umbrales" ON umbrales_uif
  FOR ALL USING (is_escribano());

CREATE POLICY "Staff gestiona clientes jurídicos" ON clientes_juridicos
  FOR ALL USING (is_staff());
CREATE POLICY "Staff gestiona beneficiarios finales" ON beneficiarios_finales
  FOR ALL USING (is_staff());
CREATE POLICY "Staff gestiona inmuebles" ON inmuebles
  FOR ALL USING (is_staff());
CREATE POLICY "Staff gestiona pagos" ON operacion_pagos
  FOR ALL USING (is_staff());

-- ============================================================
-- 13. ACTUALIZAR FUNCIÓN is_staff() PARA INCLUIR ROLES NUEVOS
-- ============================================================
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
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_escribano()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND rol IN ('escribano_titular', 'oficial_cumplimiento', 'escribano', 'protocolista')
    AND activo = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
