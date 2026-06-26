CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  openid VARCHAR(128) NOT NULL UNIQUE,
  nickname VARCHAR(128) NULL,
  avatar_url VARCHAR(512) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE regions (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  level VARCHAR(32) NOT NULL,
  parent_id VARCHAR(64) NULL,
  center_lat DECIMAL(10, 6) NOT NULL,
  center_lng DECIMAL(10, 6) NOT NULL,
  bounds_json JSON NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_regions_parent (parent_id),
  INDEX idx_regions_level_enabled (level, enabled)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE travel_services (
  id VARCHAR(64) PRIMARY KEY,
  region_id VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  title VARCHAR(160) NOT NULL,
  summary TEXT NOT NULL,
  tips JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_services_region_type (region_id, type)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE pois (
  id VARCHAR(64) PRIMARY KEY,
  region_id VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  name VARCHAR(160) NOT NULL,
  summary TEXT NOT NULL,
  lat DECIMAL(10, 6) NOT NULL,
  lng DECIMAL(10, 6) NOT NULL,
  tags JSON NOT NULL,
  duration_minutes INT NOT NULL,
  cost_level INT NOT NULL,
  hot_score INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_pois_region_type (region_id, type),
  INDEX idx_pois_hot_score (hot_score)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE guides (
  id VARCHAR(64) PRIMARY KEY,
  region_id VARCHAR(64) NOT NULL,
  title VARCHAR(180) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  tags JSON NOT NULL,
  cover_url VARCHAR(512) NOT NULL,
  official BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_guides_region (region_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE itineraries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  destination_region_id VARCHAR(64) NOT NULL,
  title VARCHAR(180) NOT NULL,
  days INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  budget_cents INT NOT NULL DEFAULT 0,
  share_code VARCHAR(32) NULL UNIQUE,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_itineraries_user (user_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE itinerary_days (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  itinerary_id BIGINT UNSIGNED NOT NULL,
  day_index INT NOT NULL,
  date DATE NULL,
  summary VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uk_itinerary_day (itinerary_id, day_index)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE itinerary_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  day_id BIGINT UNSIGNED NOT NULL,
  poi_id VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL,
  start_hint VARCHAR(64) NOT NULL,
  duration_minutes INT NOT NULL,
  transport_hint VARCHAR(255) NOT NULL,
  note TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_itinerary_items_day (day_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE favorites (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  target_type VARCHAR(32) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uk_favorite_target (user_id, target_type, target_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE share_snapshots (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  share_code VARCHAR(32) NOT NULL UNIQUE,
  source_itinerary_id BIGINT UNSIGNED NOT NULL,
  itinerary_snapshot JSON NOT NULL,
  expires_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE weather_summaries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  region_id VARCHAR(64) NOT NULL UNIQUE,
  summary VARCHAR(255) NOT NULL,
  temperature_range VARCHAR(64) NOT NULL,
  tips JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
