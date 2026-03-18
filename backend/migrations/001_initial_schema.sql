-- 001_initial_schema.sql
-- Initial database schema for invent-ory

CREATE TABLE IF NOT EXISTS components (
    id           SERIAL PRIMARY KEY,
    lcsc_part_no VARCHAR(64)  NOT NULL,
    name         VARCHAR(255) NOT NULL DEFAULT '',
    value        VARCHAR(255) NOT NULL DEFAULT '',
    footprint    VARCHAR(255) NOT NULL DEFAULT '',
    description  TEXT         NOT NULL DEFAULT '',
    manufacturer VARCHAR(255) NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_components_lcsc_part_no UNIQUE (lcsc_part_no)
);

CREATE TABLE IF NOT EXISTS boxes (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT         NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_boxes_name UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id           SERIAL PRIMARY KEY,
    component_id INTEGER      NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    box_id       INTEGER      NOT NULL REFERENCES boxes(id)      ON DELETE CASCADE,
    quantity     INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_inventory_items_component_id ON inventory_items(component_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_box_id       ON inventory_items(box_id);
