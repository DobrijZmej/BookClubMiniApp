-- Міграція: Система управління клубами
-- Дата: 2026-01-21

-- 1. Оновлення таблиці clubs
ALTER TABLE clubs 
ADD COLUMN description TEXT AFTER name,
ADD COLUMN owner_id VARCHAR(50) NOT NULL AFTER chat_id,
ADD COLUMN invite_code VARCHAR(20) NOT NULL UNIQUE AFTER owner_id,
ADD COLUMN is_public BOOLEAN DEFAULT FALSE AFTER invite_code,
ADD INDEX idx_owner_id (owner_id),
ADD INDEX idx_invite_code (invite_code);

-- 2. Створення таблиці club_members
CREATE TABLE IF NOT EXISTS club_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    club_id INT NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(255),
    username VARCHAR(100),
    role ENUM('OWNER', 'ADMIN', 'MEMBER') DEFAULT 'MEMBER',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_club_id (club_id),
    INDEX idx_user_id (user_id),
    INDEX idx_club_user (club_id, user_id),
    
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_club_user (club_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Створення таблиці club_join_requests
CREATE TABLE IF NOT EXISTS club_join_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    club_id INT NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(255),
    username VARCHAR(100),
    message TEXT,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    reviewed_by VARCHAR(50),
    
    INDEX idx_club_id (club_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_club_status (club_id, status),
    
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Заповнити owner_id та invite_code для існуючих клубів (якщо є)
-- ВАЖЛИВО: Виконайте вручну або через скрипт, вказавши реальні значення
-- UPDATE clubs SET owner_id = 'default_owner', invite_code = CONCAT('CLUB', id) WHERE owner_id IS NULL;

-- 5. Додати власників клубів як членів з роллю owner
-- INSERT INTO club_members (club_id, user_id, role)
-- SELECT id, owner_id, 'owner' FROM clubs WHERE owner_id IS NOT NULL;
