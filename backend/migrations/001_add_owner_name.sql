-- Міграція: Додати owner_name до таблиці books
-- Дата: 2026-01-21

ALTER TABLE books 
ADD COLUMN owner_name VARCHAR(255) AFTER owner_id;

-- Заповнити існуючі записи (якщо є) значенням з owner_username або "Користувач"
UPDATE books 
SET owner_name = COALESCE(owner_username, 'Користувач') 
WHERE owner_name IS NULL;
