-- ──────────────────────────────────────────────────────────────
-- Refactor: Tipo de acto notarial + Negocios causales (multi-select)
-- ──────────────────────────────────────────────────────────────
-- Reemplaza el viejo modelo (categoria + subtipo unico en `tipo`)
-- por:
--   tipo_acto_notarial → 1 de 5 categorias notariales
--   negocios_causales  → array de 1+ negocios causales
--
-- Notas:
-- * Se llama `tipo_acto_notarial` y NO `tipo_acto` porque esta ultima
--   ya existe (creada en supabase-uif-fase1.sql) con otros valores
--   destinados al motor de alertas UIF.
-- * La columna `tipo` (TEXT NOT NULL) se mantiene por compatibilidad
--   con codigo legacy. En cada insert/update nuevo, `tipo` =
--   primer elemento del array de negocios causales.
-- ──────────────────────────────────────────────────────────────

-- 1. Agregar columnas nuevas
ALTER TABLE tramites
  ADD COLUMN IF NOT EXISTS tipo_acto_notarial TEXT
    CHECK (tipo_acto_notarial IN ('inmuebles', 'personales', 'societarios', 'certificaciones', 'gestion_registral')),
  ADD COLUMN IF NOT EXISTS negocios_causales TEXT[];

-- 2. Migrar data existente: copiar `tipo` al array y derivar `tipo_acto_notarial`
UPDATE tramites
SET negocios_causales = ARRAY[tipo]
WHERE negocios_causales IS NULL AND tipo IS NOT NULL;

-- Heuristica para mapear el tipo viejo a una categoria notarial
UPDATE tramites SET tipo_acto_notarial = CASE
  WHEN tipo ILIKE '%compraventa%' OR tipo ILIKE '%donaci%inmueb%' OR tipo ILIKE '%hipoteca%'
       OR tipo ILIKE '%vivienda%' OR tipo ILIKE '%horizontal%' OR tipo ILIKE '%estudio de t%'
       OR tipo ILIKE '%permuta%' OR tipo ILIKE '%usufruct%' OR tipo ILIKE '%leasing%'
       OR tipo ILIKE '%dominio%' OR tipo ILIKE '%adjudicaci%' OR tipo ILIKE '%subasta%'
       OR tipo ILIKE '%condominio%'
    THEN 'inmuebles'
  WHEN tipo ILIKE '%poder%' OR tipo ILIKE '%testament%' OR tipo ILIKE '%viaje%'
       OR tipo ILIKE '%conducir%' OR tipo ILIKE '%conviv%' OR tipo ILIKE '%matrimon%'
    THEN 'personales'
  WHEN tipo ILIKE '%sociedad%' OR tipo ILIKE '%sa%' OR tipo ILIKE '%srl%' OR tipo ILIKE '%sas%'
       OR tipo ILIKE '%fondo de comercio%' OR tipo ILIKE '%asamblea%' OR tipo ILIKE '%directorio%'
       OR tipo ILIKE '%cuotas sociales%' OR tipo ILIKE '%alquiler%'
    THEN 'societarios'
  WHEN tipo ILIKE '%certif%' OR tipo ILIKE '%acta%' OR tipo ILIKE '%protocoliz%'
    THEN 'certificaciones'
  WHEN tipo ILIKE '%informe de dom%' OR tipo ILIKE '%inhibic%' OR tipo ILIKE '%registro%'
       OR tipo ILIKE '%segundo testim%' OR tipo ILIKE '%cancel%hipotec%'
    THEN 'gestion_registral'
  ELSE NULL
END
WHERE tipo_acto_notarial IS NULL AND tipo IS NOT NULL;

-- 3. Indice GIN para busquedas rapidas en el array
CREATE INDEX IF NOT EXISTS idx_tramites_negocios_causales
  ON tramites USING GIN (negocios_causales);

CREATE INDEX IF NOT EXISTS idx_tramites_tipo_acto_notarial
  ON tramites (tipo_acto_notarial);

-- 4. Comentarios para documentacion
COMMENT ON COLUMN tramites.tipo_acto_notarial IS
  'Categoria notarial (UI): inmuebles | personales | societarios | certificaciones | gestion_registral. NO confundir con tipo_acto (UIF).';
COMMENT ON COLUMN tramites.negocios_causales IS
  'Lista de negocios causales del acto. Puede contener varios (ej: compraventa + cancelacion de hipoteca).';
COMMENT ON COLUMN tramites.tipo IS
  'Legacy: primer elemento de negocios_causales. Mantenido por compatibilidad.';
