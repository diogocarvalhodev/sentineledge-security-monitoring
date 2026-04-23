-- ============================================
-- SENTINELEDGE DATABASE SCHEMA - PostgreSQL 15+
-- Local Security Monitoring System
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_superuser BOOLEAN DEFAULT false,
    role VARCHAR(20) DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

-- ============================================
-- ZONES
-- ============================================

CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) UNIQUE,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_active BOOLEAN DEFAULT true,
    extra_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_zones_code ON zones(code);
CREATE INDEX idx_zones_is_active ON zones(is_active);
CREATE INDEX idx_zones_location ON zones USING GIST (point(longitude, latitude));

-- ============================================
-- CAMERAS
-- ============================================

CREATE TABLE IF NOT EXISTS cameras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    rtsp_url TEXT NOT NULL, -- Encrypted in application layer
    username VARCHAR(100),
    password TEXT, -- Encrypted via pgcrypto
    location VARCHAR(150),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_active BOOLEAN DEFAULT true,
    is_monitoring BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error', 'maintenance')),
    fps INTEGER DEFAULT 15,
    resolution VARCHAR(20) DEFAULT '1920x1080',
    detection_zone JSONB,
    last_seen TIMESTAMP WITH TIME ZONE,
    extra_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cameras_zone_id ON cameras(zone_id);
CREATE INDEX idx_cameras_is_active ON cameras(is_active);
CREATE INDEX idx_cameras_status ON cameras(status);
CREATE INDEX idx_cameras_location ON cameras USING GIST (point(longitude, latitude));

-- ============================================
-- DETECTION CLASSES
-- ============================================

CREATE TABLE IF NOT EXISTS detection_classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    is_person BOOLEAN DEFAULT false,
    is_vehicle BOOLEAN DEFAULT false,
    is_weapon BOOLEAN DEFAULT false,
    priority_level INTEGER DEFAULT 0,
    color_hex VARCHAR(7) DEFAULT '#00D1FF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pre-populate COCO classes (YOLOv3)
INSERT INTO detection_classes (name, is_person, is_vehicle, priority_level) VALUES
    ('person', true, false, 3),
    ('bicycle', false, true, 1),
    ('car', false, true, 1),
    ('motorcycle', false, true, 2),
    ('bus', false, true, 1),
    ('truck', false, true, 1),
    ('knife', false, false, 5),
    ('backpack', false, false, 2),
    ('handbag', false, false, 1)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- ALERTS / DETECTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_id UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
    detection_class_id INTEGER REFERENCES detection_classes(id),
    detected_object VARCHAR(50) NOT NULL,
    confidence DECIMAL(5, 2) NOT NULL,
    persons_count INTEGER DEFAULT 0,
    vehicles_count INTEGER DEFAULT 0,
    bbox_coordinates JSONB, -- [x1, y1, x2, y2]
    image_path TEXT,
    thumbnail_path TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'confirmed', 'false_positive', 'resolved')),
    severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    notified_telegram BOOLEAN DEFAULT false,
    notified_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    extra_data JSONB DEFAULT '{}'::jsonb,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_camera_id ON alerts(camera_id);
CREATE INDEX idx_alerts_zone_id ON alerts(zone_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_detected_at ON alerts(detected_at DESC);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_alerts_detection_class ON alerts(detection_class_id);

-- ============================================
-- SYSTEM SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    value_type VARCHAR(20) DEFAULT 'string' CHECK (value_type IN ('string', 'integer', 'boolean', 'json')),
    description TEXT,
    is_secret BOOLEAN DEFAULT false,
    category VARCHAR(50) DEFAULT 'general',
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_category ON system_settings(category);

-- Pre-populate default settings
INSERT INTO system_settings (key, value, value_type, description, category) VALUES
    ('system_name', 'SentinelEdge', 'string', 'System display name', 'general'),
    ('detection_threshold', '0.5', 'string', 'Minimum confidence threshold for detections', 'ai'),
    ('max_fps', '30', 'integer', 'Maximum frames per second for processing', 'ai'),
    ('alert_cooldown_seconds', '300', 'integer', 'Minimum seconds between alerts for same camera', 'alerts'),
    ('telegram_enabled', 'false', 'boolean', 'Enable Telegram notifications', 'notifications'),
    ('telegram_bot_token', '', 'string', 'Telegram Bot API Token', 'notifications'),
    ('telegram_chat_id', '', 'string', 'Telegram Chat ID', 'notifications')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- SYSTEM LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS system_logs (
    id BIGSERIAL PRIMARY KEY,
    level VARCHAR(20) DEFAULT 'INFO' CHECK (level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    source VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    camera_id UUID REFERENCES cameras(id),
    alert_id UUID REFERENCES alerts(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_source ON system_logs(source);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);

-- Partition logs by month (optional for large installations)
-- CREATE TABLE system_logs_y2024m01 PARTITION OF system_logs
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- ============================================
-- DETECTION STATISTICS (Aggregated)
-- ============================================

CREATE TABLE IF NOT EXISTS detection_stats (
    id BIGSERIAL PRIMARY KEY,
    camera_id UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES zones(id),
    hour_bucket TIMESTAMP WITH TIME ZONE NOT NULL,
    total_detections INTEGER DEFAULT 0,
    persons_detected INTEGER DEFAULT 0,
    vehicles_detected INTEGER DEFAULT 0,
    high_confidence_count INTEGER DEFAULT 0,
    avg_confidence DECIMAL(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(camera_id, hour_bucket)
);

CREATE INDEX idx_detection_stats_camera ON detection_stats(camera_id);
CREATE INDEX idx_detection_stats_zone ON detection_stats(zone_id);
CREATE INDEX idx_detection_stats_hour ON detection_stats(hour_bucket DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cameras_updated_at BEFORE UPDATE ON cameras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Log camera status changes
CREATE OR REPLACE FUNCTION log_camera_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO system_logs (level, source, message, camera_id, metadata)
        VALUES (
            'INFO',
            'camera_monitor',
            'Camera status changed from ' || OLD.status || ' to ' || NEW.status,
            NEW.id,
            jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER camera_status_change_log AFTER UPDATE ON cameras
    FOR EACH ROW EXECUTE FUNCTION log_camera_status_change();

-- ============================================
-- VIEWS
-- ============================================

-- Active cameras with zone info
CREATE OR REPLACE VIEW v_active_cameras AS
SELECT 
    c.id,
    c.name,
    c.location,
    c.status,
    c.is_monitoring,
    c.fps,
    c.last_seen,
    z.name as zone_name,
    z.id as zone_id
FROM cameras c
LEFT JOIN zones z ON c.zone_id = z.id
WHERE c.is_active = true
ORDER BY z.name, c.name;

-- Recent alerts with camera and zone info
CREATE OR REPLACE VIEW v_recent_alerts AS
SELECT 
    a.id,
    a.detected_object,
    a.confidence,
    a.persons_count,
    a.vehicles_count,
    a.severity,
    a.status,
    a.detected_at,
    c.name as camera_name,
    c.location as camera_location,
    z.name as zone_name,
    a.image_path,
    a.thumbnail_path
FROM alerts a
JOIN cameras c ON a.camera_id = c.id
LEFT JOIN zones z ON a.zone_id = z.id
ORDER BY a.detected_at DESC
LIMIT 100;

-- Dashboard statistics
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM cameras WHERE is_active = true) as total_cameras,
    (SELECT COUNT(*) FROM cameras WHERE is_active = true AND status = 'online') as online_cameras,
    (SELECT COUNT(*) FROM zones WHERE is_active = true) as total_zones,
    (SELECT COUNT(*) FROM alerts WHERE detected_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as alerts_24h,
    (SELECT COUNT(*) FROM alerts WHERE status = 'pending') as pending_alerts,
    (SELECT COUNT(*) FROM alerts WHERE severity = 'high' OR severity = 'critical') as high_priority_alerts;

-- ============================================
-- INITIAL ADMIN USER
-- ============================================

-- Password: admin (CHANGE IN PRODUCTION!)
-- Hash generated with bcrypt
INSERT INTO users (username, full_name, email, hashed_password, is_superuser, role)
VALUES (
    'admin',
    'Administrador SentinelEdge',
    'admin@sentineledge.local',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIvApAU.V2',
    true,
    'admin'
)
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- PERFORMANCE OPTIMIZATION
-- ============================================

-- Auto-vacuum and analyze settings (add to postgresql.conf if needed)
ALTER TABLE alerts SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE system_logs SET (autovacuum_vacuum_scale_factor = 0.05);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'System users with role-based access control';
COMMENT ON TABLE zones IS 'Monitoring zones';
COMMENT ON TABLE cameras IS 'RTSP cameras for monitoring';
COMMENT ON TABLE detection_classes IS 'AI detection classes (COCO dataset)';
COMMENT ON TABLE alerts IS 'Detection events from AI engine';
COMMENT ON TABLE system_settings IS 'Configurable system parameters';
COMMENT ON TABLE system_logs IS 'System audit and error logs';
COMMENT ON TABLE detection_stats IS 'Aggregated detection statistics for analytics';

-- ============================================
-- END OF SCHEMA
-- ============================================
