-- Tabla adicional para informes registrales
-- Ejecutar en Supabase SQL Editor junto con el schema principal

CREATE TABLE IF NOT EXISTS informes_registrales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id UUID REFERENCES tramites(id),
  tipo TEXT NOT NULL,
  matricula TEXT,
  partido TEXT,
  nomenclatura_catastral TEXT,
  titular TEXT,
  estado TEXT DEFAULT 'solicitado', -- solicitado, recibido, observado
  informe_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: solo staff
ALTER TABLE informes_registrales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar informes" ON informes_registrales
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND rol IN ('secretaria', 'protocolista', 'escribano')
    )
  );
