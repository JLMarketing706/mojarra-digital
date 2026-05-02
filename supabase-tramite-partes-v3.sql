-- Permite que los "otros que comparecen" (cónyuge, padre, apoderado, etc.)
-- se carguen como nombre suelto + DNI sin necesidad de existir como cliente
-- separado en la tabla clientes. Quedan vinculados al cliente principal
-- vía parte_padre_id, y los roles "cónyuge / padre / madre" se sincronizan
-- con los campos correspondientes del legajo del cliente principal.

ALTER TABLE tramite_partes
  ADD COLUMN IF NOT EXISTS nombre text,
  ADD COLUMN IF NOT EXISTS dni text;

COMMENT ON COLUMN tramite_partes.nombre IS
  'Nombre completo cuando la parte es un "otro que comparece" sin cliente registrado (ej: cónyuge, padre, madre, apoderado).';
COMMENT ON COLUMN tramite_partes.dni IS
  'DNI / documento de la parte cuando se carga como nombre suelto sin cliente registrado.';
