-- Migration: Підтримка половинчастих зірок (рейтинг 0.5 - 5.0 з кроком 0.5)
-- Дата: 2026-02-01
-- Опис: Зміна типу поля rating з INT на DECIMAL(2,1) для підтримки дробових значень

-- Зміна типу поля rating в таблиці book_reviews
ALTER TABLE book_reviews 
MODIFY COLUMN rating DECIMAL(2,1) NOT NULL 
COMMENT 'Рейтинг від 0.5 до 5.0 з кроком 0.5';

-- Перевірка: всі існуючі цілі значення (1, 2, 3, 4, 5) автоматично конвертуються в (1.0, 2.0, 3.0, 4.0, 5.0)
-- Нові значення можуть бути: 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0

-- Додаткова перевірка (опціонально): можна додати CHECK constraint для валідації
-- ALTER TABLE book_reviews 
-- ADD CONSTRAINT chk_rating_half_step 
-- CHECK (rating >= 0.5 AND rating <= 5.0 AND MOD(rating * 10, 5) = 0);
