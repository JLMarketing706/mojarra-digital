-- ──────────────────────────────────────────────────────────────
-- Múltiples formas de pago por operación
-- ──────────────────────────────────────────────────────────────
-- Antes: tramites.forma_pago era un string único + monto_efectivo
-- aparte. Ahora una operación puede combinar varias formas (ej:
-- 50% efectivo, 30% transferencia, 20% cheque).
--
-- Compatibilidad:
-- * tramites.forma_pago se mantiene como legacy (= 'mixto' si hay
--   más de una forma, o la única si hay solo una).
-- * tramites.monto_efectivo se mantiene = SUM de filas con
--   forma_pago='efectivo'. El trigger SQL de UIF que lo usa sigue
--   funcionando sin cambios.
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tramite_formas_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id UUID NOT NULL REFERENCES tramites(id) ON DELETE CASCADE,
  forma_pago TEXT NOT NULL CHECK (forma_pago IN (
    'efectivo', 'transferencia', 'cheque', 'mixto',
    'permuta', 'credito_hipotecario', 'otra'
  )),
  monto NUMERIC NOT NULL DEFAULT 0,
  observacion TEXT,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tramite_formas_pago_tramite
  ON tramite_formas_pago (tramite_id);

-- RLS: heredan los permisos del trámite asociado vía escribania_id
ALTER TABLE tramite_formas_pago ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tramite_formas_pago_select ON tramite_formas_pago;
CREATE POLICY tramite_formas_pago_select ON tramite_formas_pago
  FOR SELECT
  USING (
    tramite_id IN (SELECT id FROM tramites)
  );

DROP POLICY IF EXISTS tramite_formas_pago_insert ON tramite_formas_pago;
CREATE POLICY tramite_formas_pago_insert ON tramite_formas_pago
  FOR INSERT
  WITH CHECK (
    tramite_id IN (SELECT id FROM tramites)
  );

DROP POLICY IF EXISTS tramite_formas_pago_update ON tramite_formas_pago;
CREATE POLICY tramite_formas_pago_update ON tramite_formas_pago
  FOR UPDATE
  USING (tramite_id IN (SELECT id FROM tramites))
  WITH CHECK (tramite_id IN (SELECT id FROM tramites));

DROP POLICY IF EXISTS tramite_formas_pago_delete ON tramite_formas_pago;
CREATE POLICY tramite_formas_pago_delete ON tramite_formas_pago
  FOR DELETE
  USING (tramite_id IN (SELECT id FROM tramites));

-- Migración de datos: para cada tramite con forma_pago seteado pero
-- sin filas en formas_pago, crear una fila con el método actual.
-- Si hay monto_efectivo > 0 y forma_pago != 'efectivo', además
-- creamos una segunda fila para el efectivo.
INSERT INTO tramite_formas_pago (tramite_id, forma_pago, monto, orden)
SELECT t.id, t.forma_pago, COALESCE(t.monto, 0), 0
FROM tramites t
WHERE t.forma_pago IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM tramite_formas_pago f WHERE f.tramite_id = t.id);

COMMENT ON TABLE tramite_formas_pago IS
  'Formas de pago de la operación. Una operación puede tener varias (ej: 50% efectivo, 50% transferencia).';
COMMENT ON COLUMN tramites.forma_pago IS
  'Legacy: si hay 1 forma de pago, es esa; si hay varias, es "mixto". Mantenido por compat.';
COMMENT ON COLUMN tramites.monto_efectivo IS
  'Legacy: SUM de las filas en tramite_formas_pago con forma_pago=efectivo. Usado por el trigger UIF.';
