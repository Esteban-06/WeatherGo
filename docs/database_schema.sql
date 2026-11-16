-- WeatherGo database schema
-- SQLite-compatible SQL

PRAGMA foreign_keys = ON;

CREATE TABLE users (
    user_id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE
);

CREATE TABLE clothing_items (
    clothing_item_id INTEGER PRIMARY KEY,
    clothing_name TEXT NOT NULL,
    is_pant INTEGER NOT NULL DEFAULT 0 CHECK (is_pant IN (0, 1)),
    is_long_sleeve_shirt INTEGER NOT NULL DEFAULT 0 CHECK (is_long_sleeve_shirt IN (0, 1)),
    is_short_sleeve_shirt INTEGER NOT NULL DEFAULT 0 CHECK (is_short_sleeve_shirt IN (0, 1)),
    is_short INTEGER NOT NULL DEFAULT 0 CHECK (is_short IN (0, 1)),
    is_jacket INTEGER NOT NULL DEFAULT 0 CHECK (is_jacket IN (0, 1)),
    is_hoodie INTEGER NOT NULL DEFAULT 0 CHECK (is_hoodie IN (0, 1)),
    is_breathable INTEGER NOT NULL DEFAULT 0 CHECK (is_breathable IN (0, 1)),
    is_warming INTEGER NOT NULL DEFAULT 0 CHECK (is_warming IN (0, 1)),
    is_cooling INTEGER NOT NULL DEFAULT 0 CHECK (is_cooling IN (0, 1))
);

CREATE TABLE user_clothing_items (
    user_id INTEGER NOT NULL,
    clothing_item_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, clothing_item_id),
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (clothing_item_id) REFERENCES clothing_items (clothing_item_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_clothing_items_clothing_item_id
    ON user_clothing_items (clothing_item_id);
