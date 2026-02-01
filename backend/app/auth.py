import hashlib
import hmac
import json
from urllib.parse import parse_qs
from typing import Optional
from fastapi import HTTPException, Header
import os
from loguru import logger

def validate_telegram_init_data(init_data: str, bot_token: str) -> dict:
    """
    Валідує initData від Telegram Web App.
    Повертає parsed дані якщо валідні, інакше raises HTTPException.
    
    Документація: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    try:
        # Parse init_data
        parsed = parse_qs(init_data)
        
        # Отримуємо hash з даних
        received_hash = parsed.get('hash', [''])[0]
        if not received_hash:
            raise HTTPException(status_code=401, detail="Missing hash")
        
        # Створюємо data_check_string (всі пари key=value окрім hash, sorted)
        data_check_arr = []
        for key, value in sorted(parsed.items()):
            if key != 'hash':
                data_check_arr.append(f"{key}={value[0]}")
        data_check_string = '\n'.join(data_check_arr)
        
        # Обчислюємо secret_key = HMAC_SHA256(bot_token, "WebAppData")
        secret_key = hmac.new(
            "WebAppData".encode(),
            bot_token.encode(),
            hashlib.sha256
        ).digest()
        
        # Обчислюємо hash = HMAC_SHA256(secret_key, data_check_string)
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Перевіряємо hash
        if not hmac.compare_digest(calculated_hash, received_hash):
            raise HTTPException(status_code=401, detail="Invalid hash")
        
        # Перевіряємо auth_date (не старше 1 години)
        auth_date = int(parsed.get('auth_date', ['0'])[0])
        import time
        if time.time() - auth_date > 3600:
            raise HTTPException(status_code=401, detail="Data is too old")
        
        # Парсимо user JSON
        user_json = parsed.get('user', ['{}'])[0]
        user = json.loads(user_json)
        
        return {
            'user': user,
            'chat_instance': parsed.get('chat_instance', [''])[0],
            'chat_type': parsed.get('chat_type', [''])[0],
            'auth_date': auth_date
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=401, detail="Invalid user data")
    except Exception as e:
        # Log the actual error but don't expose it to the client
        logger.error(f"Telegram validation error: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")


async def get_current_user(x_telegram_init_data: Optional[str] = Header(None)):
    """
    FastAPI dependency для отримання поточного користувача.
    Використання:
        @app.get("/api/profile")
        async def get_profile(user: dict = Depends(get_current_user)):
            return {"telegram_id": user['user']['id']}
    """
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="Missing Telegram auth data")
    
    logger.debug(f"Init data received: {x_telegram_init_data[:100]}...")
    
    # Dev режим - дозволено ТІЛЬКИ не в production
    env = os.getenv('ENV', 'development')
    is_dev_mode = 'dev_mock_hash' in x_telegram_init_data
    
    if is_dev_mode:
        if env.lower() == 'production':
            logger.warning("⚠️ Dev mode attempt blocked in production environment")
            raise HTTPException(
                status_code=401,
                detail="Dev mode is disabled in production"
            )
        
        logger.warning("🔧 Dev mode detected - bypassing Telegram validation")
        from urllib.parse import unquote
        
        try:
            parsed = parse_qs(x_telegram_init_data)
            user_json = unquote(parsed.get('user', ['{}'])[0])
            user = json.loads(user_json)
            
            logger.info(f"Dev mode user authenticated: {user.get('id')} (@{user.get('username', 'unknown')})")
            
            return {
                'user': user,
                'chat_instance': 'dev_mode',
                'chat_type': 'private',
                'auth_date': int(parsed.get('auth_date', ['0'])[0])
            }
        except Exception as e:
            logger.error(f"Dev mode parsing failed: {e}")
            pass  # Fallback to normal validation
    
    bot_token = os.getenv('BOT_TOKEN')
    if not bot_token:
        raise HTTPException(status_code=500, detail="Bot token not configured")
    
    return validate_telegram_init_data(x_telegram_init_data, bot_token)
