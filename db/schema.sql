-- Product Inventory Schema
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast name search (for unique constraint and optional faster queries)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Index for sorting and paginating
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
