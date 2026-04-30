-- ============================================================
-- MOJARRA DIGITAL — FASE 4B
-- Categorías de documentos adicionales para legajo UIF completo
--   - renaper:  consulta al Registro Nacional de las Personas
--   - repet:    consulta antiterrorismo (repet.jus.gob.ar)
--   - nosis:    informe crediticio NOSIS
--   - ddjj_uif: declaración jurada UIF firmada por el cliente
-- ============================================================

ALTER TABLE documentos DROP CONSTRAINT IF EXISTS documentos_categoria_check;

ALTER TABLE documentos ADD CONSTRAINT documentos_categoria_check
  CHECK (categoria IN (
    'identificacion',
    'estado_civil',
    'pep',
    'sujeto_obligado',
    'origen_fondos',
    'inmueble',
    'sociedad',
    'poder',
    'beneficiario_final',
    'renaper',
    'repet',
    'nosis',
    'ddjj_uif',
    'otros'
  ));

-- Subcategorías sugeridas (informativo, no enforced):
--   renaper:  consulta_dni, consulta_pdf
--   repet:    busqueda_persona, busqueda_entidad
--   nosis:    informe_basico, informe_completo
--   ddjj_uif: pep, sujeto_obligado, origen_fondos, completa
