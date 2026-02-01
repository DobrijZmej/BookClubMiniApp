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
    import re
    from app.analytics import track_activity
    
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
        
        # Track business activity (skip static files, internal endpoints, and health checks)
        if (response.status_code < 400 and 
            not request.url.path.startswith(("/css/", "/js/", "/images/", "/favicon", "/api/internal/", "/api/health"))):
            try:
                # Extract user_id from validated Telegram init data
                user_id = None
                init_data = request.headers.get("X-Telegram-Init-Data", "")
                if init_data:
                    try:
                        from urllib.parse import parse_qs
                        parsed = parse_qs(init_data)
                        if "user" in parsed:
                            import json
                            user_data = json.loads(parsed["user"][0])
                            user_id = str(user_data.get("id"))
                    except:
                        pass
                
                # Determine activity type and extract resources
                activity_type = None
                club_id = None
                club_name = None
                club_cover = None
                book_id = None
                book_title = None
                book_cover = None
                members_count = None
                books_count = None
                
                # Club views
                club_match = re.search(r'/clubs/(\d+)$', request.url.path)
                if club_match and request.method == "GET":
                    activity_type = "club_view"
                    club_id = int(club_match.group(1))
                    
                    try:
                        from app.database import SessionLocal
                        from app.models.db_models import Club, ClubMember, Book
                        
                        db = SessionLocal()
                        try:
                            club = db.query(Club).filter(Club.id == club_id).first()
                            if club:
                                club_name = club.name
                                club_cover = club.cover_url
                                members_count = db.query(ClubMember).filter(ClubMember.club_id == club_id).count()
                                books_count = db.query(Book).filter(Book.club_id == club_id).count()
                        finally:
                            db.close()
                    except:
                        pass
                
                # Activity Feed views
                activity_feed_match = re.search(r'/clubs/(\d+)/activity$', request.url.path)
                if activity_feed_match and request.method == "GET":
                    activity_type = "activity_feed_view"
                    club_id = int(activity_feed_match.group(1))
                    
                    try:
                        from app.database import SessionLocal
                        from app.models.db_models import Club
                        
                        db = SessionLocal()
                        try:
                            club = db.query(Club).filter(Club.id == club_id).first()
                            if club:
                                club_name = club.name
                                club_cover = club.cover_url
                        finally:
                            db.close()
                    except:
                        pass
                
                # Book views
                book_match = re.search(r'/books/book/(\d+)$', request.url.path)
                if book_match and request.method == "GET":
                    activity_type = "book_view"
                    book_id = int(book_match.group(1))
                    
                    try:
                        from app.database import SessionLocal
                        from app.models.db_models import Book, Club
                        
                        db = SessionLocal()
                        try:
                            book = db.query(Book).filter(Book.id == book_id).first()
                            if book:
                                book_title = book.title
                                book_cover = book.cover_url
                                club = db.query(Club).filter(Club.id == book.club_id).first()
                                if club:
                                    club_id = club.id
                                    club_name = club.name
                                    club_cover = club.cover_url
                        finally:
                            db.close()
                    except:
                        pass
                
                # Review created
                if re.search(r'/books/\d+/review$', request.url.path) and request.method == "POST":
                    activity_type = "review_created"
                    book_id_match = re.search(r'/books/(\d+)/review$', request.url.path)
                    if book_id_match:
                        book_id = int(book_id_match.group(1))
                        
                        try:
                            from app.database import SessionLocal
                            from app.models.db_models import Book, Club
                            
                            db = SessionLocal()
                            try:
                                book = db.query(Book).filter(Book.id == book_id).first()
                                if book:
                                    book_title = book.title
                                    book_cover = book.cover_url
                                    club = db.query(Club).filter(Club.id == book.club_id).first()
                                    if club:
                                        club_id = club.id
                                        club_name = club.name
                                        club_cover = club.cover_url
                            finally:
                                db.close()
                        except:
                            pass
                
                # Book borrowed
                borrow_match = re.search(r'/books/(\d+)/borrow$', request.url.path)
                if borrow_match and request.method == "POST":
                    activity_type = "book_borrowed"
                    book_id = int(borrow_match.group(1))
                    
                    try:
                        from app.database import SessionLocal
                        from app.models.db_models import Book, Club
                        
                        db = SessionLocal()
                        try:
                            book = db.query(Book).filter(Book.id == book_id).first()
                            if book:
                                book_title = book.title
                                book_cover = book.cover_url
                                club = db.query(Club).filter(Club.id == book.club_id).first()
                                if club:
                                    club_id = club.id
                                    club_name = club.name
                                    club_cover = club.cover_url
                        finally:
                            db.close()
                    except:
                        pass
                
                # Book returned
                return_match = re.search(r'/books/(\d+)/return$', request.url.path)
                if return_match and request.method == "POST":
                    activity_type = "book_returned"
                    book_id = int(return_match.group(1))
                    
                    try:
                        from app.database import SessionLocal
                        from app.models.db_models import Book, Club
                        
                        db = SessionLocal()
                        try:
                            book = db.query(Book).filter(Book.id == book_id).first()
                            if book:
                                book_title = book.title
                                book_cover = book.cover_url
                                club = db.query(Club).filter(Club.id == book.club_id).first()
                                if club:
                                    club_id = club.id
                                    club_name = club.name
                                    club_cover = club.cover_url
                        finally:
                            db.close()
                    except:
                        pass
                
                # Member joined (approved join request)
                if re.search(r'/clubs/\d+/requests/\d+$', request.url.path) and request.method == "POST":
                    # Will be tracked when processing the join request with action=approve
                    pass
                
                # Search used
                books_list_match = re.search(r'/books/club/(\d+)$', request.url.path)
                if books_list_match and request.method == "GET":
                    # Check if search parameter is present
                    if "search=" in str(request.url.query):
                        search_value = request.query_params.get("search", "")
                        if search_value and len(search_value) > 0:
                            activity_type = "search_used"
                            club_id = int(books_list_match.group(1))
                            
                            try:
                                from app.database import SessionLocal
                                from app.models.db_models import Club
                                
                                db = SessionLocal()
                                try:
                                    club = db.query(Club).filter(Club.id == club_id).first()
                                    if club:
                                        club_name = club.name
                                        club_cover = club.cover_url
                                finally:
                                    db.close()
                            except:
                                pass
                
                # Track if we identified an activity
                if activity_type:
                    track_activity(
                        activity_type=activity_type,
                        user_id=user_id,
                        club_id=club_id,
                        club_name=club_name,
                        club_cover=club_cover,
                        book_id=book_id,
                        book_title=book_title,
                        book_cover=book_cover,
                        members_count=members_count,
                        books_count=books_count
                    )
            except Exception as e:
                logger.debug(f"Analytics tracking error: {e}")
                pass
        
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


@app.get("/api/internal/analytics")
async def get_analytics():
    """Get analytics data"""
    from app.analytics import get_stats
    return get_stats()


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
    
    # SECURITY: Never expose SQL queries, tracebacks, or detailed error messages to frontend
    # Even in debug mode, only log detailed errors, don't send them to client
    
    # Generic error message for all cases
    error_message = "Помилка сервера. Спробуйте пізніше."
    
    # In debug mode, we can be slightly more helpful but still safe
    if os.getenv("DEBUG") == "True":
        error_type = exc.__class__.__name__
        # Only expose safe error type, not the message (which may contain SQL)
        return JSONResponse(
            status_code=500,
            content={
                "detail": error_message,
                "error_type": error_type
            }
        )
    
    return JSONResponse(
        status_code=500,
        content={"detail": error_message}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=os.getenv("DEBUG", "False") == "True"
    )
