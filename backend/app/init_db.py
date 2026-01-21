"""
Скрипт для ініціалізації бази даних.
Запуск: python -m app.init_db
"""

from app.database import init_db
from app.models.db_models import Base

if __name__ == "__main__":
    print("🔧 Створення таблиць у базі даних...")
    init_db()
    print("✅ База даних успішно ініціалізована!")
    print("\nСтворені таблиці:")
    print("  - clubs")
    print("  - club_members") 
    print("  - club_join_requests")
    print("  - books")
    print("  - book_loans")
    print("  - book_reviews")
