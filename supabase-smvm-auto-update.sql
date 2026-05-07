-- ──────────────────────────────────────────────────────────────
-- Actualización automática del SMVM
-- ──────────────────────────────────────────────────────────────
-- 1. Log de cada corrida del cron (auditoría)
-- 2. Carga manual de los valores publicados por el Consejo Nacional
--    del Empleo, la Productividad y el SMVyM (Res. 9/2025) para 2026
-- ──────────────────────────────────────────────────────────────

-- 1. Tabla de log
CREATE TABLE IF NOT EXISTS smvm_actualizaciones_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intentado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fuente_url TEXT,
  ok BOOLEAN NOT NULL DEFAULT false,
  /** Si hubo nueva fila: el valor parseado */
  valor NUMERIC(14, 2),
  /** Si hubo nueva fila: la fecha de vigencia */
  vigencia_desde DATE,
  /** Si NO hubo nueva fila: razón ('sin_cambios', 'parse_error', 'fetch_error', 'manual') */
  razon TEXT,
  /** Mensaje de error completo (para debug) */
  error_mensaje TEXT,
  /** Quien lo disparó: 'cron' | 'manual:<user_id>' */
  origen TEXT NOT NULL DEFAULT 'cron'
);

CREATE INDEX IF NOT EXISTS idx_smvm_log_intentado_at
  ON smvm_actualizaciones_log (intentado_at DESC);

COMMENT ON TABLE smvm_actualizaciones_log IS
  'Auditoría de cada intento de actualizar el SMVM, sea por cron o manual.';

-- 2. Cargar valores publicados de 2026 (Res. 9/2025 del Consejo del Salario)
INSERT INTO smvm_historico (vigencia_desde, valor, norma_origen) VALUES
  ('2026-01-01', 341000.00, 'Res. CNEPySMVyM 9/2025'),
  ('2026-02-01', 346800.00, 'Res. CNEPySMVyM 9/2025'),
  ('2026-03-01', 352400.00, 'Res. CNEPySMVyM 9/2025')
ON CONFLICT (vigencia_desde) DO NOTHING;
