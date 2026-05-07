-- ──────────────────────────────────────────────────────────────
-- Plazos registrales: registro + fechas de presentación y prórrogas
-- ──────────────────────────────────────────────────────────────
-- Permite cargar fechas de gestión registral en cada escritura
-- (presentación al registro y hasta 3 prórrogas) para calcular
-- automáticamente cuánto tiempo queda antes del vencimiento.
--
-- Plazos según registro:
--   PBA  → 180 / 180 / 180 (Nº expte) / 180
--   CABA → 180 / 60  / 60 (Nº expte)  / 60
-- (presentación / 1ra / 2da / 3ra prórroga)
-- ──────────────────────────────────────────────────────────────

ALTER TABLE tramites
  ADD COLUMN IF NOT EXISTS registro_propiedad TEXT
    CHECK (registro_propiedad IN ('caba', 'pba')),
  ADD COLUMN IF NOT EXISTS fecha_presentacion DATE,
  ADD COLUMN IF NOT EXISTS fecha_primera_prorroga DATE,
  ADD COLUMN IF NOT EXISTS fecha_segunda_prorroga DATE,
  ADD COLUMN IF NOT EXISTS fecha_tercera_prorroga DATE;

COMMENT ON COLUMN tramites.registro_propiedad IS
  'Registro de la propiedad inmueble: pba (Buenos Aires) | caba (Capital Federal). Define los plazos.';
COMMENT ON COLUMN tramites.fecha_presentacion IS
  'Fecha en que la escritura entró al registro de la propiedad.';
COMMENT ON COLUMN tramites.fecha_primera_prorroga IS
  'Fecha en que se solicitó la 1ra prórroga (si aplica). El reloj se reinicia desde acá.';
COMMENT ON COLUMN tramites.fecha_segunda_prorroga IS
  'Fecha en que se solicitó la 2da prórroga. Genera Nº de expediente.';
COMMENT ON COLUMN tramites.fecha_tercera_prorroga IS
  'Fecha en que se solicitó la 3ra prórroga.';
