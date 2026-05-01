-- Permite crear "clientes mínimos" desde el form de nueva operación
-- y marcarlos como pendientes de completar legajo UIF.

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS legajo_incompleto boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_clientes_legajo_incompleto
  ON clientes (legajo_incompleto)
  WHERE legajo_incompleto = true;

COMMENT ON COLUMN clientes.legajo_incompleto IS
  'TRUE = cliente creado en modo rápido (apellido/nombre/DNI/CUIT/tipo_persona). Falta completar el legajo UIF (domicilio, estado civil, perfil económico, PEP/SO, etc.). Se debe completar antes de generar reportes UIF.';
