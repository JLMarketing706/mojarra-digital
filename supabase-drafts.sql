-- Tabla `form_drafts`: borradores de formularios persistidos por usuario.
-- Permite que un usuario abandone un form en un dispositivo y lo recupere en otro.

CREATE TABLE IF NOT EXISTS form_drafts (
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_key  text NOT NULL,                -- ej: 'nuevo-tramite', 'nuevo-cliente'
  data      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, form_key)
);

CREATE INDEX IF NOT EXISTS idx_form_drafts_user ON form_drafts(user_id);

ALTER TABLE form_drafts ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo ve / modifica sus propios borradores
CREATE POLICY "form_drafts_select_own" ON form_drafts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "form_drafts_insert_own" ON form_drafts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "form_drafts_update_own" ON form_drafts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "form_drafts_delete_own" ON form_drafts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE form_drafts IS
  'Borradores de formularios (auto-save) por usuario. Limpieza automática al guardar el form definitivo.';
