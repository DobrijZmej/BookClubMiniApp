from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os

# Завантаження змінних середовища
load_dotenv()

# Імпорт роутерів
from app.routers import books, user, clubs

# Створення FastAPI app
app = FastAPI(
    title="Book Club Mini App API",
    description="REST API для Telegram Mini App книжкового клубу",
    version="1.0.0"
)

# CORS налаштування
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
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
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "Book Club Mini App API",
        "version": "1.0.0"
    }


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
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
        "bot_token_configured": bool(os.getenv("BOT_TOKEN"))
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Глобальний обробник помилок"""
    import traceback
    
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
