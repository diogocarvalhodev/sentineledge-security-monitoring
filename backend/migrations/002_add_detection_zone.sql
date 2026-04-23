-- Adiciona campo detection_zone à tabela cameras
-- Migration: 002_add_detection_zone.sql

ALTER TABLE cameras 
ADD COLUMN IF NOT EXISTS detection_zone JSONB DEFAULT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN cameras.detection_zone IS 'Zona de detecção definida pelo usuário como coordenadas normalizadas {x1, y1, x2, y2}';

-- Criar índice para consultas na zona de detecção (opcional)
CREATE INDEX IF NOT EXISTS idx_cameras_detection_zone ON cameras USING GIN(detection_zone) WHERE detection_zone IS NOT NULL;