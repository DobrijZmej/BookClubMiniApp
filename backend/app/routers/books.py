from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from loguru import logger

from app.database import get_db
from app.models.db_models import Book, BookLoan, BookStatus, LoanStatus, Club, BookReview, ClubMember
from app.models.schemas import (
    BookCreate, BookUpdate, BookResponse, 
    BookDetailResponse, BookReviewCreate, BookReviewUpdate, BookReviewResponse
)
from app.auth import get_current_user
from app.utils import file_storage

router = APIRouter(prefix="/api/books", tags=["Books"])

def enrich_book_with_stats(book_dict: dict, book_id: int, db: Session) -> dict:
    """Додає average_rating та readers_count до словника книги"""
    # Рахуємо середній рейтинг з відгуків
    reviews = db.query(BookReview).filter(BookReview.book_id == book_id).all()
    if reviews:
        avg_rating = sum(r.rating for r in reviews) / len(reviews)
        book_dict['average_rating'] = round(avg_rating, 2)
    else:
        book_dict['average_rating'] = None
    
    # Рахуємо унікальних читачів (всі хто коли-небудь брав книгу)
    readers_count = db.query(BookLoan.user_id).filter(
        BookLoan.book_id == book_id
    ).distinct().count()
    book_dict['readers_count'] = readers_count
    
    return book_dict

def verify_club_membership(db: Session, club_id: int, user_id: str):
    """Перевіряє, чи користувач є членом клубу. Кидає HTTPException якщо ні."""
    member = db.query(ClubMember).filter(
        ClubMember.club_id == club_id,
        ClubMember.user_id == user_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=403, detail="Ви не є членом цього клубу")

@router.get("/club/{club_id}", response_model=List[BookResponse])
async def get_books(
    club_id: int,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Отримати список книг в клубі"""
    user_id = str(user['user']['id'])
    
    # Перевіряємо, що клуб існує
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    # Перевіряємо членство в клубі
    verify_club_membership(db, club_id, user_id)
    
    # Підзапит для знаходження останнього loan для кожної книги
    subquery = (
        db.query(
            BookLoan.book_id,
            BookLoan.user_id.label('last_reader_id'),
            BookLoan.username.label('last_reader_username'),
            func.row_number().over(
                partition_by=BookLoan.book_id,
                order_by=desc(BookLoan.borrowed_at)
            ).label('row_num')
        )
        .subquery()
    )
    
    # Підзапит для отримання тільки останніх loans
    last_loans = (
        db.query(subquery)
        .filter(subquery.c.row_num == 1)
        .subquery()
    )
    
    # Додаємо ClubMember для отримання імені останнього читача
    query = (
        db.query(
            Book,
            last_loans.c.last_reader_id,
            last_loans.c.last_reader_username,
            ClubMember.user_name.label('last_reader_name')
        )
        .outerjoin(last_loans, Book.id == last_loans.c.book_id)
        .outerjoin(
            ClubMember,
            (last_loans.c.last_reader_id == ClubMember.user_id) & (ClubMember.club_id == club_id)
        )
        .filter(
            Book.club_id == club_id,
            Book.status != BookStatus.DELETED
        )
    )
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Book.title.like(search_pattern)) |
            (Book.author.like(search_pattern)) |
            (Book.owner_name.like(search_pattern)) |
            (Book.owner_username.like(search_pattern)) |
            (last_loans.c.last_reader_username.like(search_pattern)) |
            (ClubMember.user_name.like(search_pattern))
        )
    
    # Застосовуємо сортування (за замовчуванням - за датою створення)
    if sort_by == 'author':
        query = query.order_by(Book.author.asc(), Book.title.asc())
    elif sort_by == 'title':
        query = query.order_by(Book.title.asc())
    else:
        # За замовчуванням - за датою створення (найновіші першими)
        query = query.order_by(desc(Book.created_at))
    
    books_data = query.all()
    
    # Додаємо current_reader_id, average_rating, readers_count та holder для кожної книги
    result = []
    for book, last_reader_id, last_reader_username, last_reader_name in books_data:
        book_dict = BookResponse.model_validate(book).model_dump()
        
        # Знаходимо активний loan
        active_loan = db.query(BookLoan).filter(
            BookLoan.book_id == book.id,
            BookLoan.status == 'READING'
        ).first()
        
        if active_loan:
            book_dict['current_reader_id'] = active_loan.user_id
        
        # Визначаємо holder: якщо є історія читання - останній читач, інакше - власник
        if last_reader_id:
            book_dict['holder_id'] = last_reader_id
            book_dict['holder_username'] = last_reader_username
            book_dict['holder_name'] = last_reader_name
        else:
            # Якщо історії немає - holder це owner
            book_dict['holder_id'] = book.owner_id
            book_dict['holder_username'] = book.owner_username
            book_dict['holder_name'] = book.owner_name
        
        # Додаємо статистику
        book_dict = enrich_book_with_stats(book_dict, book.id, db)
        
        result.append(book_dict)
    
    # Сортуємо за рейтингом або кількістю читачів (після enrichment)
    if sort_by == 'rating':
        result.sort(key=lambda x: (x.get('average_rating') or 0), reverse=True)
    elif sort_by == 'readers':
        result.sort(key=lambda x: (x.get('readers_count') or 0), reverse=True)
    
    return result

@router.get("/book/{book_id}", response_model=BookDetailResponse)
async def get_book_details(
    book_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Отримати деталі книги з історією"""
    user_id = str(user['user']['id'])
    
    book = db.query(Book).filter(
        Book.id == book_id,
        Book.status != BookStatus.DELETED
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Книга не знайдена")
    
    # Перевіряємо членство в клубі
    verify_club_membership(db, book.club_id, user_id)
    
    # Завантажуємо історію loans з іменами користувачів з club_members
    loans_raw = db.query(
        BookLoan,
        ClubMember.user_name
    ).outerjoin(
        ClubMember,
        (BookLoan.user_id == ClubMember.user_id) & (ClubMember.club_id == book.club_id)
    ).filter(
        BookLoan.book_id == book_id
    ).order_by(desc(BookLoan.borrowed_at)).all()
    
    # Збагачуємо loans іменами користувачів
    loans = []
    for loan, user_name in loans_raw:
        loan_dict = loan.__dict__.copy()
        loan_dict['user_name'] = user_name
        loans.append(type('obj', (object,), loan_dict)())
    
    # Завантажуємо відгуки
    reviews = db.query(BookReview).filter(
        BookReview.book_id == book_id
    ).order_by(desc(BookReview.created_at)).all()
    
    # Знаходимо активний loan
    active_loan = db.query(BookLoan).filter(
        BookLoan.book_id == book_id,
        BookLoan.status == 'READING'
    ).first()
    
    result_dict = book.__dict__.copy()
    result_dict['current_reader_id'] = active_loan.user_id if active_loan else None
    
    # Визначаємо holder: якщо є історія читання - останній читач, інакше - власник
    if loans:
        last_loan = loans[0]  # Вже відсортовано за borrowed_at DESC
        result_dict['holder_id'] = last_loan.user_id
        result_dict['holder_username'] = last_loan.username
        result_dict['holder_name'] = last_loan.user_name
    else:
        # Якщо історії немає - holder це owner
        result_dict['holder_id'] = book.owner_id
        result_dict['holder_username'] = book.owner_username
        result_dict['holder_name'] = book.owner_name
    
    # Додаємо статистику
    result_dict = enrich_book_with_stats(result_dict, book_id, db)
    
    return BookDetailResponse(
        **result_dict,
        loans=loans,
        reviews=reviews
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
    
    client_request_id = getattr(book_data, 'client_request_id', None)
    logger.info(
        f"Creating book '{book_data.title}' by user {user_id} (@{telegram_user.get('username', 'unknown')}) "
        f"in club {book_data.club_id} client_request_id={client_request_id}"
    )
    
    # Отримуємо клуб за ID
    club = db.query(Club).filter(Club.id == book_data.club_id).first()
    if not club:
        logger.warning(f"Club {book_data.club_id} not found")
        raise HTTPException(status_code=404, detail="Club not found")
    
    # Перевіряємо членство в клубі
    verify_club_membership(db, book_data.club_id, user_id)
    
    # Формуємо повне ім'я
    first_name = telegram_user.get('first_name', '')
    last_name = telegram_user.get('last_name', '')
    owner_name = f"{first_name} {last_name}".strip() or "Користувач"
    
    # Duplicate-creation guard: if a book with same title/owner/club was just created recently,
    # treat it as duplicate and return existing to avoid double entries caused by double submits.
    existing = db.query(Book).filter(
        Book.title == book_data.title,
        Book.owner_id == str(telegram_user['id']),
        Book.club_id == book_data.club_id,
        Book.status != BookStatus.DELETED
    ).order_by(desc(Book.created_at)).first()

    if existing:
        try:
            age = (datetime.datetime.utcnow() - existing.created_at).total_seconds()
        except Exception:
            age = None

        if age is not None and age <= 5:
            logger.warning(f"Duplicate create detected (within {age}s). Returning existing book id={existing.id} client_request_id={client_request_id}")
            book_dict = BookResponse.model_validate(existing).model_dump()
            book_dict = enrich_book_with_stats(book_dict, existing.id, db)
            return book_dict

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
    
    logger.success(f"✅ Book created: ID={new_book.id}, Title='{new_book.title}', Club={book_data.club_id}")
    
    # Додаємо статистику (для нової книги буде 0)
    book_dict = BookResponse.model_validate(new_book).model_dump()
    book_dict = enrich_book_with_stats(book_dict, new_book.id, db)
    
    return book_dict

@router.patch("/{book_id}", response_model=BookResponse)
async def update_book(
    book_id: int,
    book_data: BookUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Оновити книгу (тільки власник)"""
    telegram_user = user['user']
    user_id = str(telegram_user['id'])
    
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Книга не знайдена")
    
    # Перевіряємо членство в клубі
    verify_club_membership(db, book.club_id, user_id)
    
    # Перевірка прав
    if book.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Ви не є власником цієї книги")
    
    # Оновлюємо поля
    if book_data.title is not None:
        book.title = book_data.title
    if book_data.author is not None:
        book.author = book_data.author
    if book_data.description is not None:
        book.description = book_data.description
    if book_data.cover_url is not None:
        # якщо старий cover був локальним файлом — видалимо його (опційно)
        old_cover_url = book.cover_url
        book.cover_url = book_data.cover_url

        if old_cover_url and old_cover_url != book.cover_url and str(old_cover_url).startswith("/uploads/books/"):
            try:
                file_storage.delete_file(old_cover_url)
            except Exception as e:
                logger.warning(f"Failed to delete old cover (PATCH) for book {book_id}: {e}")
    
    db.commit()
    db.refresh(book)
    
    # Додаємо статистику
    book_dict = BookResponse.model_validate(book).model_dump()
    book_dict = enrich_book_with_stats(book_dict, book.id, db)
    
    return book_dict

@router.delete("/{book_id}", status_code=204)
async def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Видалити книгу (тільки власник)"""
    telegram_user = user['user']
    user_id = str(telegram_user['id'])
    
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Книга не знайдена")
    
    # Перевіряємо членство в клубі
    verify_club_membership(db, book.club_id, user_id)
    
    # Перевірка прав
    if book.owner_id != user_id:
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
    user_id = str(telegram_user['id'])
    
    book = db.query(Book).filter(
        Book.id == book_id,
        Book.status != BookStatus.DELETED
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Книга не знайдена")
    
    # Перевіряємо членство в клубі
    verify_club_membership(db, book.club_id, user_id)
    
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
    
    # Додаємо статистику
    book_dict = BookResponse.model_validate(book).model_dump()
    book_dict['current_reader_id'] = str(telegram_user['id'])
    book_dict = enrich_book_with_stats(book_dict, book.id, db)
    
    # Notification logic
    try:
        from app.notifications.service import notify
        club = db.query(Club).filter(Club.id == book.club_id).first()
        club_owner_id = club.owner_id if club else None
        book_owner_id = book.owner_id
        recipients = set()
        if club_owner_id:
            recipients.add(club_owner_id)
        if book_owner_id:
            recipients.add(book_owner_id)
        # Remove borrower from recipients if they are borrowing their own book
        if user_id in recipients:
            recipients.remove(user_id)
        logger.info(f"[NOTIFY] Borrow event: club_owner_id={club_owner_id}, book_owner_id={book_owner_id}, user_id={user_id}, recipients={recipients}")
        # If recipients is empty, skip notification
        from datetime import datetime
        if recipients:
            context = {
                'book_title': book.title,
                'borrower_name': telegram_user.get('first_name', '') + ' ' + telegram_user.get('last_name', ''),
                'club_name': club.name if club else '',
                'date': datetime.now().strftime('%d.%m.%Y %H:%M')
            }
            logger.info(f"[NOTIFY] Borrow event context: {context}")
            notify('book_borrowed', recipients, context)
    except Exception as e:
        logger.warning(f"[NOTIFY] Не вдалося надіслати сповіщення про взяття книги: {e}")
    return book_dict

@router.post("/{book_id}/return", response_model=BookResponse)
async def return_book(
    book_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Повернути книгу"""
    telegram_user = user['user']
    user_id = str(telegram_user['id'])
    
    # Спочатку отримуємо книгу для перевірки club_id
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Книга не знайдена")
    
    # Перевіряємо членство в клубі
    verify_club_membership(db, book.club_id, user_id)
    
    # Знаходимо активний loan
    loan = db.query(BookLoan).filter(
        BookLoan.book_id == book_id,
        BookLoan.user_id == user_id,
        BookLoan.status == LoanStatus.READING
    ).first()
    
    if not loan:
        raise HTTPException(status_code=404, detail="Активне позичання не знайдено")
    
    # Оновлюємо loan
    loan.status = LoanStatus.RETURNED
    from datetime import datetime
    loan.returned_at = datetime.now()
    
    # Оновлюємо статус книги
    book.status = BookStatus.AVAILABLE
    
    db.commit()
    db.refresh(book)
    
    # Додаємо статистику
    book_dict = BookResponse.model_validate(book).model_dump()
    book_dict['current_reader_id'] = None
    book_dict = enrich_book_with_stats(book_dict, book.id, db)
    
    # Notification logic
    try:
        from app.notifications.service import notify
        from datetime import datetime
        club = db.query(Club).filter(Club.id == book.club_id).first()
        club_owner_id = club.owner_id if club else None
        book_owner_id = book.owner_id
        recipients = set()
        if club_owner_id:
            recipients.add(club_owner_id)
        if book_owner_id:
            recipients.add(book_owner_id)
        # Remove borrower from recipients if they are returning their own book
        if user_id in recipients:
            recipients.remove(user_id)
        logger.info(f"[NOTIFY] Return event: book.club_id={book.club_id} club_owner_id={club_owner_id}, book_owner_id={book_owner_id}, user_id={user_id}, recipients={recipients}")
        # If recipients is empty, skip notification
        if recipients:
            context = {
                'book_title': book.title,
                'borrower_name': telegram_user.get('first_name', '') + ' ' + telegram_user.get('last_name', ''),
                'club_name': club.name if club else '',
                'date': datetime.now().strftime('%d.%m.%Y %H:%M')
            }
            logger.info(f"[NOTIFY] Return event context: {context}")
            notify('book_returned', recipients, context)
    except Exception as e:
        logger.warning(f"[NOTIFY] Не вдалося надіслати сповіщення про повернення книги: {e}")
    return book_dict


@router.post("/{book_id}/review", response_model=BookReviewResponse)
async def create_or_update_review(
    book_id: int,
    review_data: BookReviewCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Створити або оновити відгук на книгу"""
    telegram_user = user['user']
    user_id = str(telegram_user['id'])
    
    # Перевіряємо, що книга існує
    book = db.query(Book).filter(
        Book.id == book_id,
        Book.status != BookStatus.DELETED
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Книга не знайдена")
    
    # Перевіряємо, чи є вже відгук від цього користувача
    existing_review = db.query(BookReview).filter(
        BookReview.book_id == book_id,
        BookReview.user_id == user_id
    ).first()
    
    # Формуємо повне ім'я
    first_name = telegram_user.get('first_name', '')
    last_name = telegram_user.get('last_name', '')
    user_name = f"{first_name} {last_name}".strip() or "Користувач"
    
    if existing_review:
        # Оновлюємо існуючий відгук
        existing_review.rating = review_data.rating
        existing_review.comment = review_data.comment
        existing_review.user_name = user_name
        existing_review.username = telegram_user.get('username', '')
        from datetime import datetime
        existing_review.updated_at = datetime.now()
        
        db.commit()
        db.refresh(existing_review)
        return existing_review
    else:
        # Створюємо новий відгук
        new_review = BookReview(
            book_id=book_id,
            user_id=user_id,
            user_name=user_name,
            username=telegram_user.get('username', ''),
            rating=review_data.rating,
            comment=review_data.comment
        )
        
        db.add(new_review)
        db.commit()
        db.refresh(new_review)
        return new_review


@router.get("/{book_id}/review", response_model=BookReviewResponse)
async def get_my_review(
    book_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Отримати мій відгук на книгу"""
    telegram_user = user['user']
    user_id = str(telegram_user['id'])
    
    # Перевіряємо що книга існує та отримуємо club_id
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Книга не знайдена")
    
    # Перевіряємо членство в клубі
    verify_club_membership(db, book.club_id, user_id)
    
    review = db.query(BookReview).filter(
        BookReview.book_id == book_id,
        BookReview.user_id == user_id
    ).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="Відгук не знайдено")
    
    return review


@router.delete("/{book_id}/review", status_code=204)
async def delete_review(
    book_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Видалити мій відгук"""
    telegram_user = user['user']
    user_id = str(telegram_user['id'])
    
    # Перевіряємо що книга існує та отримуємо club_id
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Книга не знайдена")
    
    # Перевіряємо членство в клубі
    verify_club_membership(db, book.club_id, user_id)
    
    review = db.query(BookReview).filter(
        BookReview.book_id == book_id,
        BookReview.user_id == user_id
    ).first()
    
    if not review:
        raise HTTPException(status_code=404, detail="Відгук не знайдено")
    
    db.delete(review)
    db.commit()
    
    return None


@router.get("/{book_id}/reviews", response_model=List[BookReviewResponse])
async def get_book_reviews(
    book_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Отримати всі відгуки про книгу"""
    user_id = str(user['user']['id'])
    
    # Перевіряємо що книга існує та отримуємо club_id
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Книга не знайдена")
    
    # Перевіряємо членство в клубі
    verify_club_membership(db, book.club_id, user_id)
    
    reviews = db.query(BookReview).filter(BookReview.book_id == book_id).all()
    return reviews

@router.post("/{book_id}/cover")
def upload_book_cover(
    book_id: int,
    file: UploadFile = File(...),
    client_request_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Завантаження/оновлення обкладинки книги (тільки власник книги).
    Аналогічно механізму /api/clubs/{club_id}/avatar у clubs.py

    Повертає:
    {
      "message": "Book cover updated",
      "cover_url": "https://..."
    }
    """
    try:
        telegram_user = current_user["user"]
        user_id = str(telegram_user["id"])

        logger.info(f"Cover upload called for book_id={book_id} by user={user_id} client_request_id={client_request_id}")
        
        # 1) Перевірка існування книги (і що не DELETED)
        book = (
            db.query(Book)
            .filter(Book.id == book_id, Book.status != BookStatus.DELETED)
            .first()
        )
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")

        # 2) Перевірка прав (тільки власник)
        if book.owner_id != user_id:
            raise HTTPException(status_code=403, detail="Only book owner can update cover")

        # 3) Видалити попередній файл, якщо є
        if getattr(book, "cover_url", None):
            try:
                file_storage.delete_file(book.cover_url)
            except Exception as del_err:
                logger.warning(f"Failed to delete old book cover: {del_err}")

        # 4) Зберегти нову обкладинку
        # Очікується реалізація у app/utils/file_storage.py:
        #   save_book_cover(book_id: int, file: UploadFile) -> str (URL)
        cover_url = file_storage.save_book_cover(book_id, file)

        # 5) Оновити модель
        book.cover_url = cover_url
        # якщо у моделі є updated_at — оновимо
        if hasattr(book, "updated_at"):
            book.updated_at = datetime.datetime.utcnow()

        db.commit()
        db.refresh(book)

        logger.info(f"Book {book_id} cover updated: {cover_url}")

        return {
            "message": "Book cover updated",
            "cover_url": cover_url
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading book cover for book_id={book_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload book cover")