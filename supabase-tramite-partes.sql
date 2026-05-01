-- Tabla tramite_partes: múltiples compradores/vendedores/otros por operación
-- Necesario para #15 (compraventa con múltiples partes, cónyuges, apoderados)

CREATE TYPE rol_parte AS ENUM (
  'comprador',
  'vendedor',
  'donante',
  'donatario',
  'cedente',
  'cesionario',
  'mutuante',
  'mutuario',
  'apoderado',
  'conyuge',
  'fiduciante',
  'fiduciario',
  'beneficiario',
  'otorgante',
  'otro'
);

CREATE TABLE IF NOT EXISTS tramite_partes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id  uuid NOT NULL REFERENCES tramites(id) ON DELETE CASCADE,
  cliente_id  uuid REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_juridico_id uuid REFERENCES clientes_juridicos(id) ON DELETE SET NULL,
  rol         rol_parte NOT NULL,
  porcentaje  numeric(5,2),         -- % de participación (opcional)
  observacion text,                 -- "cónyuge de X", "apoderado de Y", etc.
  orden       int DEFAULT 0,        -- para ordenar la enumeración
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tramite_partes_tramite ON tramite_partes(tramite_id);
CREATE INDEX IF NOT EXISTS idx_tramite_partes_cliente ON tramite_partes(cliente_id);

-- RLS
ALTER TABLE tramite_partes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tramite_partes_read_staff" ON tramite_partes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.rol IN ('escribano_titular','oficial_cumplimiento','escribano_adscripto',
                      'empleado_admin','secretaria','protocolista','escribano')
    )
  );

CREATE POLICY "tramite_partes_write_staff" ON tramite_partes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.rol IN ('escribano_titular','oficial_cumplimiento','escribano_adscripto',
                      'empleado_admin','secretaria','protocolista','escribano')
    )
  );

COMMENT ON TABLE tramite_partes IS
  'Múltiples partes (compradores/vendedores/otros) por operación. Reemplaza el cliente_id único en tramites para operaciones complejas.';
