-- ──────────────────────────────────────────────────────────────
-- Plazos registrales V2 — prórrogas como booleans (no fechas)
-- ──────────────────────────────────────────────────────────────
-- Cambio de modelo: solo se ingresa la fecha de presentación.
-- Las prórrogas son checkboxes (activadas / no). Cada prórroga
-- agrega días según el registro:
--   PBA  → presentación +180, +180 por cada prórroga activa
--   CABA → presentación +180, +60 por cada prórroga activa
--
-- Las fechas de las prórrogas se CALCULAN, no se guardan.
-- Esta migración agrega 3 booleans y deja las 3 fechas de prórroga
-- viejas como deprecated (no las borra para no perder data si alguien
-- cargó algo entre v1 y v2).
-- ──────────────────────────────────────────────────────────────

ALTER TABLE tramites
  -- Idempotente con la v1 si ya se corrió:
  ADD COLUMN IF NOT EXISTS registro_propiedad TEXT
    CHECK (registro_propiedad IN ('caba', 'pba')),
  ADD COLUMN IF NOT EXISTS fecha_presentacion DATE,
  -- Nuevos: prórrogas como booleans
  ADD COLUMN IF NOT EXISTS primera_prorroga_activa BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS segunda_prorroga_activa BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tercera_prorroga_activa BOOLEAN NOT NULL DEFAULT false,
  -- N° de expediente: lo asigna el registro al solicitarse la 2da prórroga
  ADD COLUMN IF NOT EXISTS numero_expediente_registro TEXT;

COMMENT ON COLUMN tramites.registro_propiedad IS
  'Registro de la propiedad inmueble: pba | caba. Define los plazos de cada prórroga.';
COMMENT ON COLUMN tramites.fecha_presentacion IS
  'Fecha en que la escritura se presentó al registro. Punto de inicio del plazo.';
COMMENT ON COLUMN tramites.primera_prorroga_activa IS
  'Si está en true, el plazo se extiende +180 (PBA) o +60 (CABA) días.';
COMMENT ON COLUMN tramites.segunda_prorroga_activa IS
  'Si está en true, suma otra extensión y genera Nº de expediente en el registro.';
COMMENT ON COLUMN tramites.tercera_prorroga_activa IS
  'Si está en true, suma una tercera extensión.';
COMMENT ON COLUMN tramites.numero_expediente_registro IS
  'N° de expediente que asigna el registro al solicitarse la 2da prórroga.';

-- Migración de datos: si alguien tenía las fechas viejas cargadas,
-- pasamos esa info a los booleans (asumiendo que si la fecha estaba
-- cargada es porque la prórroga estaba en curso).
UPDATE tramites
SET primera_prorroga_activa = true
WHERE fecha_primera_prorroga IS NOT NULL AND primera_prorroga_activa = false;

UPDATE tramites
SET segunda_prorroga_activa = true
WHERE fecha_segunda_prorroga IS NOT NULL AND segunda_prorroga_activa = false;

UPDATE tramites
SET tercera_prorroga_activa = true
WHERE fecha_tercera_prorroga IS NOT NULL AND tercera_prorroga_activa = false;

-- Las fechas de prórroga viejas no se borran por seguridad.
-- Si querés limpiarlas después de validar que todo funciona:
--   ALTER TABLE tramites DROP COLUMN IF EXISTS fecha_primera_prorroga;
--   ALTER TABLE tramites DROP COLUMN IF EXISTS fecha_segunda_prorroga;
--   ALTER TABLE tramites DROP COLUMN IF EXISTS fecha_tercera_prorroga;
