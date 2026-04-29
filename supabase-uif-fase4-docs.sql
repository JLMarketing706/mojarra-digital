-- ============================================================
-- MOJARRA DIGITAL — FASE 4
-- Documentos respaldatorios estructurados (legajo UIF)
-- ============================================================

-- Ampliar `documentos` para soportar categorización + verificación
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS categoria TEXT
  CHECK (categoria IN (
    'identificacion',       -- DNI, pasaporte, cédula
    'estado_civil',         -- acta matrimonio, sentencia divorcio, etc.
    'pep',                  -- declaración o constancia PEP
    'sujeto_obligado',      -- constancia inscripción UIF
    'origen_fondos',        -- escritura previa, banco, recibos
    'inmueble',             -- informe dominio, catastral, libre deuda
    'sociedad',             -- estatuto, acta designación, balance
    'poder',                -- poder vigente
    'beneficiario_final',   -- DDJJ BF, organigrama
    'otros'
  ));

ALTER TABLE documentos ADD COLUMN IF NOT EXISTS subcategoria TEXT;
-- Ejemplos de subcategoria por categoría:
--   identificacion: dni_frente, dni_dorso, pasaporte, selfie_kyc
--   estado_civil:   acta_matrimonio, sentencia_divorcio, acta_defuncion, union_convivencial
--   poder:          poder_general, poder_especial, certif_vigencia
--   origen_fondos:  escritura_previa, constancia_bancaria, recibo_sueldo, declaratoria, mutuo

-- Campo del cliente/trámite que este doc respalda (trazabilidad)
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS campo_valida TEXT;
-- Ej: 'estado_civil', 'es_pep', 'origen_fondos', 'beneficiario_final'

-- Metadatos
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS tamano_bytes BIGINT;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS fecha_emision DATE;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;

-- Verificación por staff
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS verificado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS verificado_por UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS verificado_at TIMESTAMPTZ;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Storage path (separar de URL pública)
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Vínculo opcional con DDJJ
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS declaracion_jurada_id UUID
  REFERENCES declaraciones_juradas(id) ON DELETE SET NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_documentos_cliente ON documentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tramite ON documentos(tramite_id);
CREATE INDEX IF NOT EXISTS idx_documentos_categoria ON documentos(categoria);
CREATE INDEX IF NOT EXISTS idx_documentos_campo ON documentos(campo_valida);
CREATE INDEX IF NOT EXISTS idx_documentos_vencimiento ON documentos(fecha_vencimiento)
  WHERE fecha_vencimiento IS NOT NULL;

-- Audit trigger en documentos también
DROP TRIGGER IF EXISTS audit_documentos_trigger ON documentos;
CREATE TRIGGER audit_documentos_trigger AFTER INSERT OR UPDATE OR DELETE ON documentos
  FOR EACH ROW EXECUTE FUNCTION audit_change();
