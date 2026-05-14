-- ──────────────────────────────────────────────────────────────
-- Umbral 'compraventa en efectivo' — corregir de 750 → 700 SMVM
-- ──────────────────────────────────────────────────────────────
-- El umbral en la tabla umbrales_uif estaba en 750 SMVM. Es un
-- error: el valor correcto según normativa UIF es 700 SMVM, igual
-- que el umbral de compraventa total. Esta migración:
--
--   1) Actualiza la fila en umbrales_uif a 700.
--   2) Actualiza el trigger UIF para que el COALESCE default
--      también sea 700 (defensivo: si el row de umbrales_uif
--      no existiera, igual se calcula bien).
-- ──────────────────────────────────────────────────────────────

-- 1) Actualizar el umbral guardado
UPDATE umbrales_uif
SET valor = 700
WHERE codigo = 'compraventa_efectivo_rsm'
  AND valor = 750;

-- 2) Recrear el trigger UIF con el default correcto
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

  -- Actos que disparan UIF SIN mínimo de monto
  IF NEW.tipo_acto IN (
    'organizacion_aportes',
    'creacion_administracion_pj',
    'cesion_cuotas',
    'constitucion_sociedad',  -- legacy
    'fideicomiso'             -- legacy
  ) THEN
    NEW.dispara_uif = TRUE;
  END IF;

  -- Compraventa en efectivo: umbral 700 SMVM (corregido desde 750)
  IF NEW.tipo_acto = 'compraventa_inmueble' AND COALESCE(NEW.monto_efectivo, 0) > 0 THEN
    SELECT valor INTO v_umbral_efectivo FROM umbrales_uif
      WHERE codigo = 'compraventa_efectivo_rsm' AND activo = TRUE;
    IF NEW.monto_efectivo >= v_smvm * COALESCE(v_umbral_efectivo, 700) THEN
      NEW.dispara_uif = TRUE;
    END IF;
  END IF;

  -- Compraventa total: 700 SMVM
  IF NEW.tipo_acto = 'compraventa_inmueble' AND COALESCE(NEW.monto, 0) > 0 THEN
    SELECT valor INTO v_umbral_compraventa FROM umbrales_uif
      WHERE codigo = 'compraventa_inmueble' AND activo = TRUE;
    IF NEW.monto >= v_smvm * COALESCE(v_umbral_compraventa, 700) THEN
      NEW.dispara_uif = TRUE;
    END IF;
  END IF;

  -- Compatibilidad con campo legacy `requiere_uif`
  IF NEW.dispara_uif THEN
    NEW.requiere_uif = TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
