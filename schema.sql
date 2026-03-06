-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  excerpt TEXT,
  date DATE,
  reading_time VARCHAR(50),
  author VARCHAR(255),
  role VARCHAR(255),
  category VARCHAR(100),
  tags JSONB,
  cover TEXT,
  content JSONB,
  key_takeaways JSONB
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);

-- Create index on date for ordering
CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(date DESC);