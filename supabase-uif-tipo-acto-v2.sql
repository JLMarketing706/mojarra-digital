-- ──────────────────────────────────────────────────────────────
-- Tipo de acto UIF — actualización a los 4 nuevos slugs
-- ──────────────────────────────────────────────────────────────
-- Reemplaza la lista CHECK del tipo_acto y actualiza el trigger
-- para reconocer los 4 actos vigentes según resolución UIF:
--
--   a) compraventa_inmueble       → Compraventas > 700 SMVM
--   b) organizacion_aportes       → Aportes/fondeo a PJ o estructuras (sin mínimo)
--   c) creacion_administracion_pj → Creación/operación/admin de PJ (sin mínimo)
--   d) cesion_cuotas              → Cesión de participaciones / negocios jurídicos (sin mínimo)
--
-- Slugs legacy (constitucion_sociedad, fideicomiso, hipoteca, donacion,
-- mutuo, otro) se mantienen permitidos para que data vieja no rompa,
-- pero ya no aparecen en el dropdown del CRM.
-- ──────────────────────────────────────────────────────────────

-- 1. Actualizar el CHECK constraint de tipo_acto
ALTER TABLE tramites DROP CONSTRAINT IF EXISTS tramites_tipo_acto_check;
ALTER TABLE tramites ADD CONSTRAINT tramites_tipo_acto_check
  CHECK (tipo_acto IS NULL OR tipo_acto IN (
    -- Vigentes
    'compraventa_inmueble',
    'organizacion_aportes',
    'creacion_administracion_pj',
    'cesion_cuotas',
    -- Legacy (mantener para data anterior)
    'constitucion_sociedad',
    'fideicomiso',
    'hipoteca',
    'donacion',
    'mutuo',
    'otro'
  ));

-- 2. Actualizar el trigger UIF para incluir los nuevos slugs
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
  -- (vigentes + slugs legacy equivalentes para no romper data vieja)
  IF NEW.tipo_acto IN (
    'organizacion_aportes',         -- nuevo: aportes/fondeo
    'creacion_administracion_pj',   -- nuevo: creación/admin de PJ
    'cesion_cuotas',                -- vigente
    'constitucion_sociedad',        -- legacy
    'fideicomiso'                   -- legacy
  ) THEN
    NEW.dispara_uif = TRUE;
  END IF;

  -- Compraventa en efectivo: umbral 750 SMVM (no se modifica)
  IF NEW.tipo_acto = 'compraventa_inmueble' AND COALESCE(NEW.monto_efectivo, 0) > 0 THEN
    SELECT valor INTO v_umbral_efectivo FROM umbrales_uif
      WHERE codigo = 'compraventa_efectivo_rsm' AND activo = TRUE;
    IF NEW.monto_efectivo >= v_smvm * COALESCE(v_umbral_efectivo, 750) THEN
      NEW.dispara_uif = TRUE;
    END IF;
  END IF;

  -- Compraventa total: 700 SMVM (no se modifica)
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

-- El trigger ya existe, no lo recreo. Solo actualicé la función.
