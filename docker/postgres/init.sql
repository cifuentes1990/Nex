-- Nexus ERP — PostgreSQL Init
-- Extensions for full text search, UUID, and crypto
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Performance indexes (Prisma migrations handle main schema)
-- These are supplementary for full-text search

-- Set timezone
SET timezone = 'UTC';
