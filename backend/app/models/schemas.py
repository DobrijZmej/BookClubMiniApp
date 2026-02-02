from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class BookStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    READING = "READING"
    DELETED = "DELETED"

class LoanStatus(str, Enum):
    READING = "READING"
    RETURNED = "RETURNED"
    WAITING = "WAITING"


# Request schemas
class BookCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    author: Optional[str] = Field("Невідомий автор", max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    cover_url: Optional[str] = None
    club_id: int  # Замість chat_id використовуємо club_id
    client_request_id: Optional[str] = None
    # Google Books fields
    google_volume_id: Optional[str] = None
    isbn_10: Optional[str] = None
    isbn_13: Optional[str] = None
    cover_source: Optional[str] = Field(None, description="Source of cover: default, user, google")
    description_source: Optional[str] = Field(None, description="Source of description: empty, user, google")

class BookUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    author: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    cover_url: Optional[str] = None
    # Google Books fields
    google_volume_id: Optional[str] = None
    isbn_10: Optional[str] = None
    isbn_13: Optional[str] = None
    cover_source: Optional[str] = None
    description_source: Optional[str] = None

class BookReviewCreate(BaseModel):
    rating: float = Field(..., ge=0.5, le=5.0)  # Рейтинг від 0.5 до 5.0 з кроком 0.5
    comment: Optional[str] = Field(None, max_length=1000)
    
    @validator('rating')
    def validate_rating_step(cls, v):
        # Перевірка кратності 0.5
        if round(v * 10) % 5 != 0:
            raise ValueError('Rating must be in 0.5 increments (0.5, 1.0, 1.5, ..., 5.0)')
        return v

class BookReviewUpdate(BaseModel):
    rating: Optional[float] = Field(None, ge=0.5, le=5.0)
    comment: Optional[str] = Field(None, max_length=1000)
    
    @validator('rating')
    def validate_rating_step(cls, v):
        if v is not None and round(v * 10) % 5 != 0:
            raise ValueError('Rating must be in 0.5 increments (0.5, 1.0, 1.5, ..., 5.0)')
        return v
    
    @validator('rating')
    def validate_rating_step(cls, v):
        if v is not None and round(v * 10) % 5 != 0:
            raise ValueError('Rating must be in 0.5 increments (0.5, 1.0, 1.5, ..., 5.0)')
        return v


# Response schemas
class BookLoanResponse(BaseModel):
    id: int
    user_id: str
    user_name: Optional[str] = None
    username: str
    status: str
    borrowed_at: datetime
    returned_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class BookReviewResponse(BaseModel):
    id: int
    book_id: int
    user_id: str
    user_name: Optional[str]
    username: Optional[str]
    rating: float
    comment: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class BookResponse(BaseModel):
    id: int
    title: str
    author: str
    owner_id: str
    owner_name: Optional[str]
    owner_username: Optional[str]
    status: str
    current_reader_id: Optional[str] = None
    cover_url: Optional[str]
    description: Optional[str]
    created_at: datetime
    average_rating: Optional[float] = None
    readers_count: Optional[int] = None
    holder_id: Optional[str] = None
    holder_name: Optional[str] = None
    holder_username: Optional[str] = None
    
    class Config:
        from_attributes = True


class BookDetailResponse(BookResponse):
    loans: List[BookLoanResponse] = []
    reviews: List[BookReviewResponse] = []
    
    class Config:
        from_attributes = True


class BorrowBookRequest(BaseModel):
    chat_id: str


# Club Management Schemas
class ClubCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_public: bool = False
    requires_approval: bool = True


class ClubUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_public: Optional[bool] = None
    requires_approval: Optional[bool] = None


class ClubMemberResponse(BaseModel):
    id: int
    user_id: str
    user_name: Optional[str]
    username: Optional[str]
    role: str
    joined_at: datetime
    books_created: int = 0
    books_borrowed: int = 0
    reviews_count: int = 0
    
    class Config:
        from_attributes = True


class ClubResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    chat_id: str
    owner_id: str
    invite_code: str
    is_public: bool
    cover_url: Optional[str] = None
    requires_approval: bool
    status: str
    created_at: datetime
    members_count: Optional[int] = None
    books_count: Optional[int] = None
    user_role: Optional[str] = None  # Роль поточного користувача в клубі
    
    class Config:
        from_attributes = True


class ClubDetailResponse(ClubResponse):
    members: List[ClubMemberResponse] = []
    # member_count наслідується від ClubResponse як members_count
    
    class Config:
        from_attributes = True


class JoinRequestCreate(BaseModel):
    invite_code: str
    message: Optional[str] = Field(None, max_length=500)


class JoinRequestResponse(BaseModel):
    id: int
    club_id: int
    user_id: str
    user_name: Optional[str]
    username: Optional[str]
    message: Optional[str]
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[str]
    
    class Config:
        from_attributes = True


class JoinRequestAction(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")

class MemberRoleUpdate(BaseModel):
    """Схема для зміни ролі учасника клубу"""
    role: str = Field(..., pattern="^(ADMIN|MEMBER)$")  # Тільки ADMIN або MEMBER, OWNER не можна змінювати


# Activity Feed Schemas
class ActivityEventType(str, Enum):
    ADD_BOOK = "ADD_BOOK"
    BORROW_BOOK = "BORROW_BOOK"
    RETURN_BOOK = "RETURN_BOOK"
    REVIEW_BOOK = "REVIEW_BOOK"
    MEMBER_JOINED = "MEMBER_JOINED"
    MEMBER_LEFT = "MEMBER_LEFT"


class ActivityActor(BaseModel):
    """Актор події (користувач, який виконав дію)"""
    user_id: str
    display_name: str
    username: Optional[str] = None


class ActivityBook(BaseModel):
    """Книга, до якої відноситься подія"""
    book_id: int
    title: str
    author: Optional[str] = None
    cover_url: Optional[str] = None


class ActivityEvent(BaseModel):
    """Подія стрічки активностей клубу"""
    event_id: str
    event_type: ActivityEventType
    event_time: datetime
    actor: ActivityActor
    book: Optional[ActivityBook] = None  # Optional for member events
    rating: Optional[int] = Field(None, ge=1, le=5)
    review_text: Optional[str] = None
    
    class Config:
        from_attributes = True


class ActivityFeedResponse(BaseModel):
    """Відповідь зі стрічкою подій"""
    events: List[ActivityEvent]
    total_count: int
    has_more: bool
