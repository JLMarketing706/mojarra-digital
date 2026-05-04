-- ──────────────────────────────────────────────────────────────
-- DROP de la tabla indice_notarial
-- ──────────────────────────────────────────────────────────────
-- El índice notarial ya no es una tabla independiente con carga
-- manual. Ahora se deriva en tiempo real de la tabla `tramites`,
-- excluyendo las categorías que no van al protocolo
-- (certificaciones y gestión registral).
--
-- Esta migración elimina la tabla vieja. Si tenías escrituras
-- cargadas ahí, se pierden — el usuario confirmó que está OK.
-- ──────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS indice_notarial CASCADE;
