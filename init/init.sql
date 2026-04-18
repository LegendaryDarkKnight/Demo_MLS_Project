CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY, 
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL, 
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(20),
  role ENUM('user', 'admin') DEFAULT 'user',
  saved_searches JSON, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

CREATE TABLE IF NOT EXISTS rentcast_cache (
  cache_key  VARCHAR(255) PRIMARY KEY,
  fetched_at BIGINT       NOT NULL
);

CREATE TABLE IF NOT EXISTS rentcast_listings (
  id               VARCHAR(255)   PRIMARY KEY,
  cache_key        VARCHAR(255)   NOT NULL,
  project_name     TEXT           NOT NULL,
  borough          VARCHAR(100)   NOT NULL,
  postcode         VARCHAR(20)    NOT NULL,
  latitude         DOUBLE         NOT NULL,
  longitude        DOUBLE         NOT NULL,
  total_units      INT            NOT NULL DEFAULT 1,
  rental_units     INT            NOT NULL DEFAULT 1,
  building_status  VARCHAR(50)    NOT NULL,
  completion_date  VARCHAR(50)    NULL,
  price_min        DECIMAL(12,2)  NOT NULL DEFAULT 0,
  price_max        DECIMAL(12,2)  NOT NULL DEFAULT 0,
  bedrooms         INT            NOT NULL DEFAULT 0,
  CONSTRAINT fk_cache_key FOREIGN KEY (cache_key)
    REFERENCES rentcast_cache(cache_key)
    ON DELETE CASCADE,
    
  -- Define your indexes here instead of separately
  INDEX idx_rentcast_listings_borough (borough),
  INDEX idx_rentcast_listings_postcode (postcode)
);