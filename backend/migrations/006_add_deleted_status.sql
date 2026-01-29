-- Міграція: Додавання статусу DELETED для клубів
-- Дата: 2026-01-29
-- Опис: Додає можливість soft delete для клубів

-- Змінюємо ENUM тип для додавання нового статусу
ALTER TABLE clubs 
MODIFY COLUMN status ENUM('ACTIVE', 'INACTIVE', 'DELETED') 
NOT NULL DEFAULT 'ACTIVE';

-- Перевірка: всі існуючі клуби мають бути ACTIVE
UPDATE clubs SET status = 'ACTIVE' WHERE status IS NULL OR status = '';
