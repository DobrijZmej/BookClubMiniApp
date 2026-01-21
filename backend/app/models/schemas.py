from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class BookStatus(str, Enum):
    AVAILABLE = "available"
    READING = "reading"
    DELETED = "deleted"

class LoanStatus(str, Enum):
    READING = "reading"
    RETURNED = "returned"
    WAITING = "waiting"


# Request schemas
class BookCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    author: Optional[str] = Field("Невідомий автор", max_length=255)
    description: Optional[str] = None
    cover_url: Optional[str] = None
    chat_id: str

class BookUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    author: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    cover_url: Optional[str] = None


# Response schemas
class BookLoanResponse(BaseModel):
    id: int
    user_id: str
    username: str
    status: str
    borrowed_at: datetime
    returned_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class BookResponse(BaseModel):
    id: int
    title: str
    author: str
    owner_id: str
    owner_username: Optional[str]
    status: str
    cover_url: Optional[str]
    description: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class BookDetailResponse(BookResponse):
    loans: List[BookLoanResponse] = []
    
    class Config:
        from_attributes = True


class BorrowBookRequest(BaseModel):
    chat_id: str


class ClubResponse(BaseModel):
    id: int
    name: str
    chat_id: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True
