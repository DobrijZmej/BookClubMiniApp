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
