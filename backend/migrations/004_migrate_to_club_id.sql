-- Міграція: Повний перехід на club_id замість chat_id
-- Дата: 2026-01-21

-- 1. Додаємо club_id до books
ALTER TABLE books 
ADD COLUMN club_id INT AFTER chat_id;

-- 2. Заповнюємо club_id на основі chat_id
UPDATE books 
SET club_id = (SELECT id FROM clubs WHERE clubs.chat_id = books.chat_id)
WHERE club_id IS NULL;

-- 3. Робимо club_id NOT NULL та додаємо індекс
ALTER TABLE books 
MODIFY COLUMN club_id INT NOT NULL,
ADD INDEX idx_club_id (club_id);

-- 4. Додаємо новий Foreign Key на clubs.id
ALTER TABLE books 
ADD CONSTRAINT fk_books_club_id 
FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE;

-- 5. Видаляємо старе поле chat_id з books (опціонально, залишимо для зворотної сумісності)
-- ALTER TABLE books DROP COLUMN chat_id;

-- 6. Оновлюємо book_loans якщо потрібно (можна видалити chat_id звідти)
-- ALTER TABLE book_loans DROP COLUMN chat_id;
