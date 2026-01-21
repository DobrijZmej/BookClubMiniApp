-- Міграція: Виправлення enum values на UPPERCASE
-- Дата: 2026-01-21

-- 1. Оновлення club_members.role
ALTER TABLE club_members 
MODIFY COLUMN role ENUM('OWNER', 'ADMIN', 'MEMBER') DEFAULT 'MEMBER';

-- 2. Оновлення club_join_requests.status
ALTER TABLE club_join_requests 
MODIFY COLUMN status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING';

-- 3. Оновлення clubs.status
ALTER TABLE clubs 
MODIFY COLUMN status ENUM('ACTIVE', 'INACTIVE');

-- 4. Оновлення books.status
ALTER TABLE books 
MODIFY COLUMN status ENUM('AVAILABLE', 'READING', 'DELETED') DEFAULT 'AVAILABLE';

-- 5. Оновлення book_loans.status
ALTER TABLE book_loans 
MODIFY COLUMN status ENUM('READING', 'RETURNED', 'WAITING') DEFAULT 'READING';
