-- Створення таблиці для відгуків на книги
CREATE TABLE IF NOT EXISTS book_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(255),
    username VARCHAR(100),
    rating INT NOT NULL,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    
    -- Індекси
    INDEX idx_book_reviews_book_id (book_id),
    INDEX idx_book_reviews_user_id (user_id),
    
    -- Унікальний індекс: один користувач - один відгук на книгу
    UNIQUE INDEX idx_book_user_review (book_id, user_id),
    
    -- Зовнішній ключ
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Додати зв'язок до таблиці books (якщо потрібно)
-- ALTER TABLE books ADD COLUMN reviews_count INT DEFAULT 0;