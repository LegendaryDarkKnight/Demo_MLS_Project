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
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rentcast_listings_cache_key
  ON rentcast_listings(cache_key);

CREATE INDEX IF NOT EXISTS idx_rentcast_listings_borough
  ON rentcast_listings(borough);

CREATE INDEX IF NOT EXISTS idx_rentcast_listings_postcode
  ON rentcast_listings(postcode);
