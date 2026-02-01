from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum, Boolean, Index, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum
import secrets

class ClubStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    DELETED = "DELETED"

class BookStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    READING = "READING"
    DELETED = "DELETED"

class LoanStatus(str, enum.Enum):
    READING = "READING"
    RETURNED = "RETURNED"
    WAITING = "WAITING"

class MemberRole(str, enum.Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"

class JoinRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class Club(Base):
    __tablename__ = "clubs"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    chat_id = Column(String(50), unique=True, nullable=False, index=True)
    owner_id = Column(String(50), nullable=False, index=True)  # Telegram user ID засновника
    invite_code = Column(String(20), unique=True, nullable=False, index=True)  # Унікальний код для приєднання
    is_public = Column(Boolean, default=False)  # Публічний клуб (видимий у пошуку)
    cover_url = Column(String(500))  # URL аватару клубу (300x300px max)
    requires_approval = Column(Boolean, default=True)  # Чи потрібне схвалення заявок (False = auto-approve)
    status = Column(Enum(ClubStatus), default=ClubStatus.ACTIVE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    books = relationship("Book", back_populates="club")
    members = relationship("ClubMember", back_populates="club", cascade="all, delete-orphan")
    join_requests = relationship("ClubJoinRequest", back_populates="club", cascade="all, delete-orphan")


class ClubMember(Base):
    __tablename__ = "club_members"
    
    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=False, index=True)
    user_id = Column(String(50), nullable=False, index=True)  # Telegram user ID
    user_name = Column(String(255))  # Повне ім'я
    username = Column(String(100))  # @username
    role = Column(Enum(MemberRole), default=MemberRole.MEMBER)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    club = relationship("Club", back_populates="members")


class ClubJoinRequest(Base):
    __tablename__ = "club_join_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=False, index=True)
    user_id = Column(String(50), nullable=False, index=True)  # Telegram user ID
    user_name = Column(String(255))  # Повне ім'я
    username = Column(String(100))  # @username
    message = Column(Text)  # Повідомлення від користувача
    status = Column(Enum(JoinRequestStatus), default=JoinRequestStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True))
    reviewed_by = Column(String(50))  # User ID хто розглянув запит
    
    # Relationships
    club = relationship("Club", back_populates="join_requests")


class Book(Base):
    __tablename__ = "books"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    author = Column(String(255), default="Невідомий автор")
    owner_id = Column(String(50), nullable=False)  # Telegram user ID
    owner_name = Column(String(255))  # Повне ім'я користувача (first_name + last_name)
    owner_username = Column(String(100))  # @username з Telegram
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=False, index=True)
    status = Column(Enum(BookStatus), default=BookStatus.AVAILABLE)
    cover_url = Column(String(500))  # Для майбутньої можливості додавати обкладинки
    description = Column(Text)  # Опис книги
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    club = relationship("Club", back_populates="books")
    loans = relationship("BookLoan", back_populates="book")
    reviews = relationship("BookReview", back_populates="book", cascade="all, delete-orphan")


class BookLoan(Base):
    __tablename__ = "book_loans"
    
    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False, index=True)
    user_id = Column(String(50), nullable=False)  # Telegram user ID
    username = Column(String(100), nullable=False)
    status = Column(Enum(LoanStatus), default=LoanStatus.READING)
    borrowed_at = Column(DateTime(timezone=True), server_default=func.now())
    returned_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    book = relationship("Book", back_populates="loans")


class BookReview(Base):
    __tablename__ = "book_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False, index=True)
    user_id = Column(String(50), nullable=False, index=True)  # Telegram user ID
    user_name = Column(String(255))  # Повне ім'я користувача
    username = Column(String(100))  # @username з Telegram
    rating = Column(Float, nullable=False)  # Рейтинг від 0.5 до 5.0 з кроком 0.5
    comment = Column(Text)  # Коментар до відгука
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    book = relationship("Book", back_populates="reviews")
    
    # Унікальний індекс: один користувач може залишити тільки один відгук на книгу
    __table_args__ = (
        Index('idx_book_user_review', 'book_id', 'user_id', unique=True),
    )
