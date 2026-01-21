from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from app.database import get_db
from app.models.db_models import Book, BookLoan, BookStatus, LoanStatus, Club
from app.models.schemas import (
    BookCreate, BookUpdate, BookResponse, 
    BookDetailResponse
)
from app.auth import get_current_user

router = APIRouter()

@router.get("/club/{club_id}", response_model=List[BookResponse])
async def get_books(
    club_id: int,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Отримати список книг в клубі"""
    # Перевіряємо, що клуб існує
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    query = db.query(Book).filter(
        Book.club_id == club_id,
        Book.status != BookStatus.DELETED
    )
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Book.title.like(search_pattern)) |
            (Book.author.like(search_pattern))
        )
    
    books = query.order_by(desc(Book.created_at)).all()
    return books

@router.get("/book/{book_id}", response_model=BookDetailResponse)
async def get_book_details(
    book_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Отримати деталі книги з історією"""
    book = db.query(Book).filter(
        Book.id == book_id,
        Book.status != BookStatus.DELETED
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Книга не знайдена")
    
    # Завантажуємо історію loans
    loans = db.query(BookLoan).filter(
        BookLoan.book_id == book_id
    ).order_by(desc(BookLoan.borrowed_at)).all()
    
    return BookDetailResponse(
        **book.__dict__,
        loans=loans
    )

@router.post("", response_model=BookResponse, status_code=201)
async def create_book(
    book_data: BookCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Створити нову книгу"""
    telegram_user = user['user']
    user_id = str(telegram_user['id'])
    
    # Отримуємо клуб за ID
    club = db.query(Club).filter(Club.id == book_data.club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    # Формуємо повне ім'я
    first_name = telegram_user.get('first_name', '')
    last_name = telegram_user.get('last_name', '')
    owner_name = f"{first_name} {last_name}".strip() or "Користувач"
    
    new_book = Book(
        title=book_data.title,
        author=book_data.author or "Невідомий автор",
        description=book_data.description,
        cover_url=book_data.cover_url,
        owner_id=str(telegram_user['id']),
        owner_name=owner_name,
        owner_username=telegram_user.get('username', ''),
        club_id=book_data.club_id,
        status=BookStatus.AVAILABLE
    )
    
    db.add(new_book)
    db.commit()
    db.refresh(new_book)
    
    return new_book

@router.patch("/{book_id}", response_model=BookResponse)
async def update_book(
    book_id: int,
    book_data: BookUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Оновити книгу (тільки власник)"""
    telegram_user = user['user']
    
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Книга не знайдена")
    
    # Перевірка прав
    if book.owner_id != str(telegram_user['id']):
        raise HTTPException(status_code=403, detail="Ви не є власником цієї книги")
    
    # Оновлюємо поля
    if book_data.title is not None:
        book.title = book_data.title
    if book_data.author is not None:
        book.author = book_data.author
    if book_data.description is not None:
        book.description = book_data.description
    if book_data.cover_url is not None:
        book.cover_url = book_data.cover_url
    
    db.commit()
    db.refresh(book)
    
    return book

@router.delete("/{book_id}", status_code=204)
async def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Видалити книгу (тільки власник)"""
    telegram_user = user['user']
    
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Книга не знайдена")
    
    # Перевірка прав
    if book.owner_id != str(telegram_user['id']):
        raise HTTPException(status_code=403, detail="Ви не є власником цієї книги")
    
    # Soft delete
    book.status = BookStatus.DELETED
    db.commit()
    
    return None

@router.post("/{book_id}/borrow", response_model=BookResponse)
async def borrow_book(
    book_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Позичити книгу"""
    telegram_user = user['user']
    
    book = db.query(Book).filter(
        Book.id == book_id,
        Book.status != BookStatus.DELETED
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Книга не знайдена")
    
    if book.status != BookStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="Книга вже позичена")
    
    # Створюємо запис про позичання
    loan = BookLoan(
        book_id=book_id,
        user_id=str(telegram_user['id']),
        username=telegram_user.get('username') or telegram_user.get('first_name', 'Unknown'),
        status=LoanStatus.READING
    )
    
    # Оновлюємо статус книги
    book.status = BookStatus.READING
    
    db.add(loan)
    db.commit()
    db.refresh(book)
    
    return book

@router.post("/{book_id}/return", response_model=BookResponse)
async def return_book(
    book_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Повернути книгу"""
    telegram_user = user['user']
    
    # Знаходимо активний loan
    loan = db.query(BookLoan).filter(
        BookLoan.book_id == book_id,
        BookLoan.user_id == str(telegram_user['id']),
        BookLoan.status == LoanStatus.READING
    ).first()
    
    if not loan:
        raise HTTPException(status_code=404, detail="Активне позичання не знайдено")
    
    # Оновлюємо loan
    loan.status = LoanStatus.RETURNED
    from datetime import datetime
    loan.returned_at = datetime.now()
    
    # Оновлюємо статус книги
    book = db.query(Book).filter(Book.id == book_id).first()
    book.status = BookStatus.AVAILABLE
    
    db.commit()
    db.refresh(book)
    
    return book
