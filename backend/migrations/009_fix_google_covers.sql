-- Migration 009: Fix Google Books covers with book_id=0
-- Problem: When books were created with Google covers, the cover was downloaded
-- with book_id=0 before the book was created, resulting in files named "0_cover_xxx.jpg"
-- that don't exist in storage.
--
-- Solution: Set cover_url to NULL for books that have 0_cover_* URLs
-- so that covers will be re-downloaded with correct book_id when needed

UPDATE books
SET cover_url = NULL
WHERE cover_url LIKE '%/0_cover_%'
  AND status != 'DELETED';

-- Log the changes
SELECT 
    COUNT(*) as affected_books,
    'Fixed books with 0_cover_* URLs' as description
FROM books
WHERE cover_url IS NULL
  AND status != 'DELETED';
