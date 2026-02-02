-- Migration 008: Google Books Integration
-- Add Google Books metadata fields to books table and create cache table

-- Add new columns to books table
ALTER TABLE books 
ADD COLUMN google_volume_id VARCHAR(50) NULL,
ADD COLUMN isbn_10 VARCHAR(20) NULL,
ADD COLUMN isbn_13 VARCHAR(20) NULL,
ADD COLUMN cover_source ENUM('DEFAULT', 'USER', 'GOOGLE') NOT NULL DEFAULT 'DEFAULT',
ADD COLUMN description_source ENUM('EMPTY', 'USER', 'GOOGLE') NOT NULL DEFAULT 'EMPTY';

-- Add index for google_volume_id
CREATE INDEX idx_books_google_volume_id ON books(google_volume_id);

-- Update existing books: set cover_source based on current cover_url
UPDATE books 
SET cover_source = CASE 
    WHEN cover_url IS NOT NULL AND cover_url != '' THEN 'USER'
    ELSE 'DEFAULT'
END;

-- Update existing books: set description_source based on current description
UPDATE books 
SET description_source = CASE 
    WHEN description IS NOT NULL AND description != '' THEN 'USER'
    ELSE 'EMPTY'
END;

-- Create Google Books cache table
CREATE TABLE google_books_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    google_volume_id VARCHAR(50) NOT NULL UNIQUE,
    title_norm VARCHAR(500) NOT NULL,
    author_norm VARCHAR(255),
    payload_json TEXT NOT NULL,
    fetched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ttl_days INT NOT NULL DEFAULT 30,
    INDEX idx_google_volume_id (google_volume_id),
    INDEX idx_title_norm (title_norm),
    INDEX idx_title_author_search (title_norm, author_norm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
