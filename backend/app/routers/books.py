from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from app.database import get_db
from app.auth import get_current_user
from app.models.db_models import Book, BookLoan, BookStatus, LoanStatus
from app.models.schemas import (
    BookCreate, BookUpdate, BookResponse, 
    BookDetailResponse, BorrowBookRequest
)

router = APIRouter(prefix="/api/books", tags=["Books"])


@router.get("/{chat_id}", response_model=List[BookResponse])
async def get_books(
    chat_id: str,
    status: str = Query("available", regex="^(available|reading|all)$"),
    search: str = Query(None, max_length=100),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Отримати всі книги для чату з фільтрацією"""
    query = db.query(Book).filter(Book.chat_id == chat_id)
    
    # Фільтр по статусу
    if status == "available":
        query = query.filter(Book.status == BookStatus.AVAILABLE)
    elif status == "reading":
        query = query.filter(Book.status == BookStatus.READING)
    # "all" - не фільтруємо
    
    # Виключаємо видалені книги
    query = query.filter(Book.status != BookStatus.DELETED)
    
    # Пошук по назві або автору
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Book.title.like(search_pattern)) | 
            (Book.author.like(search_pattern))
        )
    
    books = query.order_by(desc(Book.created_at)).all()
    return books


@router.get("/{chat_id}/book/{book_id}", response_model=BookDetailResponse)
async def get_book_details(
    chat_id: str,
    book_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Отримати деталі книги з історією"""
    book = db.query(Book).filter(
        Book.id == book_id,
        Book.chat_id == chat_id,
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
    
    new_book = Book(
        title=book_data.title,
        author=book_data.author or "Невідомий автор",
        description=book_data.description,
        cover_url=book_data.cover_url,
        owner_id=str(telegram_user['id']),
        owner_username=telegram_user.get('username', ''),
        chat_id=book_data.chat_id,
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
    request: BorrowBookRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Позичити книгу"""
    telegram_user = user['user']
    
    book = db.query(Book).filter(
        Book.id == book_id,
        Book.chat_id == request.chat_id,
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
        chat_id=request.chat_id,
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
