from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class ClubStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

class BookStatus(str, enum.Enum):
    AVAILABLE = "available"
    READING = "reading"
    DELETED = "deleted"

class LoanStatus(str, enum.Enum):
    READING = "reading"
    RETURNED = "returned"
    WAITING = "waiting"


class Club(Base):
    __tablename__ = "clubs"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    chat_id = Column(String(50), unique=True, nullable=False, index=True)
    status = Column(Enum(ClubStatus), default=ClubStatus.ACTIVE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    books = relationship("Book", back_populates="club")


class Book(Base):
    __tablename__ = "books"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    author = Column(String(255), default="Невідомий автор")
    owner_id = Column(String(50), nullable=False)  # Telegram user ID
    owner_name = Column(String(255))  # Повне ім'я користувача (first_name + last_name)
    owner_username = Column(String(100))  # @username з Telegram
    chat_id = Column(String(50), ForeignKey("clubs.chat_id"), nullable=False, index=True)
    status = Column(Enum(BookStatus), default=BookStatus.AVAILABLE)
    cover_url = Column(String(500))  # Для майбутньої можливості додавати обкладинки
    description = Column(Text)  # Опис книги
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    club = relationship("Club", back_populates="books")
    loans = relationship("BookLoan", back_populates="book")


class BookLoan(Base):
    __tablename__ = "book_loans"
    
    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False, index=True)
    user_id = Column(String(50), nullable=False)  # Telegram user ID
    username = Column(String(100), nullable=False)
    chat_id = Column(String(50), nullable=False)
    status = Column(Enum(LoanStatus), default=LoanStatus.READING)
    borrowed_at = Column(DateTime(timezone=True), server_default=func.now())
    returned_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    book = relationship("Book", back_populates="loans")
