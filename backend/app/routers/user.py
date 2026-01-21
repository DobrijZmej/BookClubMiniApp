from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/api/user", tags=["User"])


@router.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    """Отримати профіль поточного користувача"""
    telegram_user = user['user']
    
    return {
        "id": telegram_user['id'],
        "first_name": telegram_user.get('first_name', ''),
        "last_name": telegram_user.get('last_name', ''),
        "username": telegram_user.get('username', ''),
        "language_code": telegram_user.get('language_code', 'uk'),
        "is_premium": telegram_user.get('is_premium', False)
    }


@router.get("/stats/{chat_id}")
async def get_user_stats(
    chat_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Статистика користувача в клубі"""
    telegram_user = user['user']
    user_id = str(telegram_user['id'])
    
    from app.models.db_models import Book, BookLoan, LoanStatus
    from sqlalchemy import func
    
    # Кількість доданих книг
    books_added = db.query(func.count(Book.id)).filter(
        Book.owner_id == user_id,
        Book.chat_id == chat_id
    ).scalar()
    
    # Кількість прочитаних книг
    books_read = db.query(func.count(BookLoan.id)).filter(
        BookLoan.user_id == user_id,
        BookLoan.chat_id == chat_id,
        BookLoan.status == LoanStatus.RETURNED
    ).scalar()
    
    # Поточно читає
    currently_reading = db.query(func.count(BookLoan.id)).filter(
        BookLoan.user_id == user_id,
        BookLoan.chat_id == chat_id,
        BookLoan.status == LoanStatus.READING
    ).scalar()
    
    return {
        "books_added": books_added,
        "books_read": books_read,
        "currently_reading": currently_reading
    }
