from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from dotenv import load_dotenv
import os
import sys
from loguru import logger

# Завантаження змінних середовища
load_dotenv()

# Налаштування loguru
logger.remove()  # Видаляємо стандартний handler

# Console logging з кольорами
logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level=os.getenv('LOG_LEVEL', 'INFO')
)

# File logging (rotated)
logger.add(
    "logs/bookclub_{time:YYYY-MM-DD}.log",
    rotation="00:00",  # Новий файл щодня о півночі
    retention="30 days",  # Зберігати логи 30 днів
    compression="zip",  # Стиснення старих логів
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
    level="DEBUG"
)

logger.info("📚 Book Club Mini App starting...")
logger.info(f"Environment: {os.getenv('ENV', 'development')}")
logger.info(f"Debug mode: {os.getenv('DEBUG', 'False')}")

# Імпорт роутерів
from app.routers import books, user, clubs

# Створення FastAPI app
app = FastAPI(
    title="Book Club Mini App API",
    description="REST API для Telegram Mini App книжкового клубу",
    version="1.0.0"
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Логування всіх HTTP запитів"""
    import time
    
    start_time = time.time()
    logger.info(f"➡️  {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        
        logger.info(
            f"⬅️  {request.method} {request.url.path} - "
            f"Status: {response.status_code} - "
            f"Time: {process_time:.2f}ms"
        )
        
        return response
    except Exception as e:
        logger.error(f"❌ Request failed: {request.method} {request.url.path} - {str(e)}")
        raise


# CORS налаштування
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
logger.info(f"CORS origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Реєстрація роутерів
app.include_router(books.router)
app.include_router(user.router)
app.include_router(clubs.router)


@app.get("/")
async def root(request: Request):
    """Головна сторінка - завжди віддає index.html, який сам визначить режим роботи"""
    return RedirectResponse(url="/index.html")


@app.get("/api/health")
async def health_check():
    """Детальна перевірка здоров'я сервісу"""
    from app.database import engine
    from sqlalchemy import text
    
    try:
        # Перевірка підключення до БД
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "ok"
        logger.debug("Database health check: OK")
    except Exception as e:
        db_status = f"error: {str(e)}"
        logger.error(f"Database health check failed: {e}")
    
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
        "bot_token_configured": bool(os.getenv("BOT_TOKEN"))
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Глобальний обробник помилок"""
    import traceback
    
    # Логуємо всі необроблені помилки
    logger.error(
        f"Unhandled exception: {exc.__class__.__name__}: {str(exc)}\n"
        f"Path: {request.url.path}\n"
        f"Method: {request.method}\n"
        f"Traceback: {traceback.format_exc()}"
    )
    
    if os.getenv("DEBUG") == "True":
        return JSONResponse(
            status_code=500,
            content={
                "detail": str(exc),
                "traceback": traceback.format_exc()
            }
        )
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=os.getenv("DEBUG", "False") == "True"
    )
