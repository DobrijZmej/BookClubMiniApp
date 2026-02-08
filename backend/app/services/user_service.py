"""
User Service - управління внутрішніми користувачами
Автоматичне створення internal_user для Telegram/Web користувачів
"""

from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, Dict, Any
from loguru import logger

from app.models.db_models import (
    InternalUser, 
    UserIdentity, 
    UserProfile,
    IdentityProvider
)


def get_or_create_internal_user_from_telegram(
    telegram_user: dict,
    db: Session
) -> int:
    """
    Отримати або створити internal_user для Telegram користувача.
    
    Викликається автоматично при кожному запиті від Telegram користувача.
    Якщо користувач вже є - повертає його ID.
    Якщо ні - створює нового (lazy migration).
    
    Args:
        telegram_user: dict з Telegram initData
            {
                'id': 668178338,
                'first_name': 'Ярина',
                'last_name': 'Прізвище',  # optional
                'username': 'username'     # optional
            }
        db: Database session
    
    Returns:
        internal_user.id (int)
    """
    telegram_id = str(telegram_user['id'])
    
    try:
        # 1. Спробувати знайти існуючий identity
        identity = db.query(UserIdentity).filter(
            UserIdentity.provider == IdentityProvider.TELEGRAM,
            UserIdentity.provider_user_id == telegram_id
        ).first()
        
        if identity:
            logger.debug(f"Found existing internal_user for Telegram ID {telegram_id}: {identity.user_id}")
            return identity.user_id
        
        # 2. Створити нового internal_user (lazy migration)
        logger.info(f"Creating new internal_user for Telegram ID {telegram_id}")
        
        now = datetime.now()
        
        internal_user = InternalUser(
            created_at=now,
            updated_at=now
        )
        db.add(internal_user)
        db.flush()  # Отримати ID без commit
        
        # 3. Створити identity
        new_identity = UserIdentity(
            user_id=internal_user.id,
            provider=IdentityProvider.TELEGRAM,
            provider_user_id=telegram_id,
            email=None,  # Telegram не надає email через Mini App API
            verified=True,  # Telegram завжди verified
            created_at=now,
            updated_at=now
        )
        db.add(new_identity)
        
        # 4. Створити profile
        first_name = telegram_user.get('first_name', '')
        last_name = telegram_user.get('last_name', '')
        username = telegram_user.get('username')
        
        profile = UserProfile(
            user_id=internal_user.id,
            first_name=first_name,
            last_name=last_name,
            username=username,
            avatar_url=None,  # Telegram Mini App API не дає прямий доступ до avatar
            bio=None,
            created_at=now,
            updated_at=now
        )
        db.add(profile)
        
        db.commit()
        
        logger.info(
            f"✅ Created internal_user {internal_user.id} for Telegram user "
            f"{telegram_id} (@{username or 'no_username'})"
        )
        
        return internal_user.id
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create internal_user for Telegram {telegram_id}: {e}")
        raise


def get_or_create_internal_user_from_google(
    google_user_info: dict,
    db: Session
) -> int:
    """
    Отримати або створити internal_user для Google користувача.
    
    Використовується для Web додатку з Google OAuth.
    
    Args:
        google_user_info: dict з Google ID token
            {
                'sub': 'google_user_id',
                'email': 'user@gmail.com',
                'given_name': 'First',
                'family_name': 'Last',
                'picture': 'https://...'
            }
        db: Database session
    
    Returns:
        internal_user.id (int)
    """
    google_id = google_user_info['sub']
    
    try:
        # 1. Спробувати знайти існуючий identity
        identity = db.query(UserIdentity).filter(
            UserIdentity.provider == IdentityProvider.GOOGLE,
            UserIdentity.provider_user_id == google_id
        ).first()
        
        if identity:
            logger.debug(f"Found existing internal_user for Google ID {google_id}: {identity.user_id}")
            return identity.user_id
        
        # 2. Створити нового internal_user
        logger.info(f"Creating new internal_user for Google ID {google_id}")
        
        now = datetime.now()
        
        internal_user = InternalUser(
            created_at=now,
            updated_at=now
        )
        db.add(internal_user)
        db.flush()
        
        # 3. Створити identity
        new_identity = UserIdentity(
            user_id=internal_user.id,
            provider=IdentityProvider.GOOGLE,
            provider_user_id=google_id,
            email=google_user_info.get('email'),
            verified=google_user_info.get('email_verified', False),
            created_at=now,
            updated_at=now
        )
        db.add(new_identity)
        
        # 4. Створити profile
        profile = UserProfile(
            user_id=internal_user.id,
            first_name=google_user_info.get('given_name'),
            last_name=google_user_info.get('family_name'),
            username=None,  # Google не має username
            avatar_url=google_user_info.get('picture'),
            bio=None,
            created_at=now,
            updated_at=now
        )
        db.add(profile)
        
        db.commit()
        
        logger.info(
            f"✅ Created internal_user {internal_user.id} for Google user "
            f"{google_id} ({google_user_info.get('email')})"
        )
        
        return internal_user.id
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create internal_user for Google {google_id}: {e}")
        raise


def get_internal_user_by_telegram_id(telegram_id: str, db: Session) -> Optional[int]:
    """
    Знайти internal_user_id по Telegram ID (без створення)
    
    Args:
        telegram_id: Telegram user ID (string)
        db: Database session
    
    Returns:
        internal_user.id або None якщо не знайдено
    """
    identity = db.query(UserIdentity).filter(
        UserIdentity.provider == IdentityProvider.TELEGRAM,
        UserIdentity.provider_user_id == telegram_id
    ).first()
    
    return identity.user_id if identity else None


def get_internal_user_by_google_id(google_id: str, db: Session) -> Optional[int]:
    """
    Знайти internal_user_id по Google ID (без створення)
    
    Args:
        google_id: Google user ID (sub)
        db: Database session
    
    Returns:
        internal_user.id або None якщо не знайдено
    """
    identity = db.query(UserIdentity).filter(
        UserIdentity.provider == IdentityProvider.GOOGLE,
        UserIdentity.provider_user_id == google_id
    ).first()
    
    return identity.user_id if identity else None


def get_user_profile(internal_user_id: int, db: Session) -> Optional[Dict[str, Any]]:
    """
    Отримати повний профіль користувача
    
    Args:
        internal_user_id: Internal user ID
        db: Database session
    
    Returns:
        Dict з даними профілю або None
    """
    user = db.query(InternalUser).filter(InternalUser.id == internal_user_id).first()
    
    if not user:
        return None
    
    profile_data = {
        'id': user.id,
        'created_at': user.created_at,
        'identities': [],
        'profile': None
    }
    
    # Додати всі identities
    for identity in user.identities:
        profile_data['identities'].append({
            'provider': identity.provider.value,
            'provider_user_id': identity.provider_user_id,
            'email': identity.email,
            'verified': identity.verified
        })
    
    # Додати profile
    if user.profile:
        profile_data['profile'] = {
            'first_name': user.profile.first_name,
            'last_name': user.profile.last_name,
            'username': user.profile.username,
            'avatar_url': user.profile.avatar_url,
            'bio': user.profile.bio
        }
    
    return profile_data
