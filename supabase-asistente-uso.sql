-- Tabla de uso del asistente virtual: contabiliza mensajes por usuario por día.
-- Permite limitar a 50 consultas diarias por usuario.

CREATE TABLE IF NOT EXISTS asistente_uso (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha   date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
  mensajes int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_asistente_uso_user_fecha ON asistente_uso(user_id, fecha);

ALTER TABLE asistente_uso ENABLE ROW LEVEL SECURITY;

-- El user puede leer su propio uso (para mostrar contador en UI si querés)
CREATE POLICY "asistente_uso_read_own" ON asistente_uso
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Insert/update lo hace el server vía service role; igual permitimos al user
-- por consistencia (la API valida igual).
CREATE POLICY "asistente_uso_upsert_own" ON asistente_uso
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "asistente_uso_update_own" ON asistente_uso
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE asistente_uso IS
  'Contador diario de consultas al bot asistente. Límite por defecto: 50/día/usuario.';
