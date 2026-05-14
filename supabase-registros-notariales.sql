-- ──────────────────────────────────────────────────────────────
-- Registros notariales por escribano
-- ──────────────────────────────────────────────────────────────
-- Cada escribano puede estar inscripto en uno o más registros
-- notariales. La lista se carga en el perfil de cada miembro
-- (en /crm/configuracion/equipo) y al crear una escritura el
-- selector de Registro notarial se llena con esos valores.
--
-- Si el escribano tiene 1 solo registro, se selecciona por default.
-- Si tiene varios, aparecen como opciones del dropdown.
-- ──────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS registros_notariales TEXT[];

COMMENT ON COLUMN profiles.registros_notariales IS
  'Lista de registros notariales en los que está inscripto el escribano. Ej: {"Registro 123 CABA", "Registro 45 PBA"}.';
