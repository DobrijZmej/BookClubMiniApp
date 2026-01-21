from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List
from datetime import datetime
import secrets
import string

from app.database import get_db
from app.auth import get_current_user
from app.models.db_models import (
    Club, ClubMember, ClubJoinRequest, ClubStatus, 
    MemberRole, JoinRequestStatus
)
from app.models.schemas import (
    ClubCreate, ClubUpdate, ClubResponse, ClubDetailResponse,
    ClubMemberResponse, JoinRequestCreate, JoinRequestResponse,
    JoinRequestAction
)

router = APIRouter(prefix="/api/clubs", tags=["Clubs"])


def generate_invite_code(length: int = 8) -> str:
    """Генерує унікальний код запрошення"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


def get_user_club_role(db: Session, club_id: int, user_id: str) -> str:
    """Отримати роль користувача в клубі"""
    member = db.query(ClubMember).filter(
        ClubMember.club_id == club_id,
        ClubMember.user_id == user_id
    ).first()
    return member.role if member else None


@router.post("", response_model=ClubDetailResponse, status_code=201)
async def create_club(
    club_data: ClubCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Створити новий клуб"""
    telegram_user = user['user']
    user_id = str(telegram_user['id'])
    
    # Формуємо повне ім'я
    first_name = telegram_user.get('first_name', '')
    last_name = telegram_user.get('last_name', '')
    user_name = f"{first_name} {last_name}".strip() or "Користувач"
    
    # Генеруємо унікальний invite_code
    invite_code = generate_invite_code()
    while db.query(Club).filter(Club.invite_code == invite_code).first():
        invite_code = generate_invite_code()
    
    # Генеруємо унікальний chat_id
    chat_id = f"club_{invite_code.lower()}"
    
    # Створюємо клуб
    new_club = Club(
        name=club_data.name,
        description=club_data.description,
        chat_id=chat_id,
        owner_id=user_id,
        invite_code=invite_code,
        is_public=club_data.is_public,
        status=ClubStatus.ACTIVE
    )
    
    db.add(new_club)
    db.flush()  # Отримуємо ID клубу
    
    # Додаємо засновника як члена з роллю owner
    owner_member = ClubMember(
        club_id=new_club.id,
        user_id=user_id,
        user_name=user_name,
        username=telegram_user.get('username', ''),
        role=MemberRole.OWNER
    )
    
    db.add(owner_member)
    db.commit()
    db.refresh(new_club)
    
    # Завантажуємо members для відповіді
    members = db.query(ClubMember).filter(ClubMember.club_id == new_club.id).all()
    
    return ClubDetailResponse(
        **new_club.__dict__,
        members=members,
        member_count=len(members)
    )


@router.get("/my", response_model=List[ClubResponse])
async def get_my_clubs(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Отримати список клубів користувача"""
    user_id = str(user['user']['id'])
    
    # Знаходимо всі клуби де користувач є членом
    clubs = db.query(Club).join(ClubMember).filter(
        ClubMember.user_id == user_id,
        Club.status == ClubStatus.ACTIVE
    ).order_by(desc(ClubMember.joined_at)).all()
    
    return clubs


@router.get("/{club_id}", response_model=ClubDetailResponse)
async def get_club_details(
    club_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Отримати деталі клубу"""
    user_id = str(user['user']['id'])
    
    club = db.query(Club).filter(
        Club.id == club_id,
        Club.status == ClubStatus.ACTIVE
    ).first()
    
    if not club:
        raise HTTPException(status_code=404, detail="Клуб не знайдено")
    
    # Перевірка чи користувач є членом
    role = get_user_club_role(db, club_id, user_id)
    if not role:
        raise HTTPException(status_code=403, detail="Ви не є членом цього клубу")
    
    # Завантажуємо членів
    members = db.query(ClubMember).filter(ClubMember.club_id == club_id).all()
    
    return ClubDetailResponse(
        **club.__dict__,
        members=members,
        member_count=len(members)
    )


@router.patch("/{club_id}", response_model=ClubResponse)
async def update_club(
    club_id: int,
    club_data: ClubUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Оновити клуб (тільки owner/admin)"""
    user_id = str(user['user']['id'])
    
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Клуб не знайдено")
    
    # Перевірка прав (owner або admin)
    role = get_user_club_role(db, club_id, user_id)
    if role not in [MemberRole.OWNER, MemberRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Недостатньо прав")
    
    # Оновлюємо поля
    if club_data.name is not None:
        club.name = club_data.name
    if club_data.description is not None:
        club.description = club_data.description
    if club_data.is_public is not None:
        club.is_public = club_data.is_public
    
    db.commit()
    db.refresh(club)
    
    return club


@router.post("/join", response_model=JoinRequestResponse, status_code=201)
async def request_to_join_club(
    request_data: JoinRequestCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Надіслати запит на приєднання до клубу"""
    telegram_user = user['user']
    user_id = str(telegram_user['id'])
    
    # Знаходимо клуб по invite_code
    club = db.query(Club).filter(
        Club.invite_code == request_data.invite_code,
        Club.status == ClubStatus.ACTIVE
    ).first()
    
    if not club:
        raise HTTPException(status_code=404, detail="Клуб не знайдено")
    
    # Перевірка чи вже є членом
    existing_member = db.query(ClubMember).filter(
        ClubMember.club_id == club.id,
        ClubMember.user_id == user_id
    ).first()
    
    if existing_member:
        raise HTTPException(status_code=400, detail="Ви вже є членом цього клубу")
    
    # Перевірка чи є активний запит
    existing_request = db.query(ClubJoinRequest).filter(
        ClubJoinRequest.club_id == club.id,
        ClubJoinRequest.user_id == user_id,
        ClubJoinRequest.status == JoinRequestStatus.PENDING
    ).first()
    
    if existing_request:
        raise HTTPException(status_code=400, detail="Ваш запит вже на розгляді")
    
    # Формуємо повне ім'я
    first_name = telegram_user.get('first_name', '')
    last_name = telegram_user.get('last_name', '')
    user_name = f"{first_name} {last_name}".strip() or "Користувач"
    
    # Створюємо запит
    join_request = ClubJoinRequest(
        club_id=club.id,
        user_id=user_id,
        user_name=user_name,
        username=telegram_user.get('username', ''),
        message=request_data.message,
        status=JoinRequestStatus.PENDING
    )
    
    db.add(join_request)
    db.commit()
    db.refresh(join_request)
    
    return join_request


@router.get("/{club_id}/requests", response_model=List[JoinRequestResponse])
async def get_join_requests(
    club_id: int,
    status: str = Query("pending", regex="^(pending|approved|rejected|all)$"),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Отримати запити на приєднання (тільки owner/admin)"""
    user_id = str(user['user']['id'])
    
    # Перевірка прав
    role = get_user_club_role(db, club_id, user_id)
    if role not in [MemberRole.OWNER, MemberRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Недостатньо прав")
    
    query = db.query(ClubJoinRequest).filter(ClubJoinRequest.club_id == club_id)
    
    if status != "all":
        query = query.filter(ClubJoinRequest.status == status)
    
    requests = query.order_by(desc(ClubJoinRequest.created_at)).all()
    
    return requests


@router.post("/{club_id}/requests/{request_id}", response_model=JoinRequestResponse)
async def review_join_request(
    club_id: int,
    request_id: int,
    action: JoinRequestAction,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Розглянути запит на приєднання (схвалити/відхилити)"""
    user_id = str(user['user']['id'])
    
    # Перевірка прав
    role = get_user_club_role(db, club_id, user_id)
    if role not in [MemberRole.OWNER, MemberRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Недостатньо прав")
    
    # Знаходимо запит
    join_request = db.query(ClubJoinRequest).filter(
        ClubJoinRequest.id == request_id,
        ClubJoinRequest.club_id == club_id
    ).first()
    
    if not join_request:
        raise HTTPException(status_code=404, detail="Запит не знайдено")
    
    if join_request.status != JoinRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Запит вже розглянуто")
    
    # Оновлюємо статус запиту
    if action.action == "approve":
        join_request.status = JoinRequestStatus.APPROVED
        
        # Додаємо користувача до клубу
        new_member = ClubMember(
            club_id=club_id,
            user_id=join_request.user_id,
            user_name=join_request.user_name,
            username=join_request.username,
            role=MemberRole.MEMBER
        )
        db.add(new_member)
    else:
        join_request.status = JoinRequestStatus.REJECTED
    
    join_request.reviewed_at = datetime.now()
    join_request.reviewed_by = user_id
    
    db.commit()
    db.refresh(join_request)
    
    return join_request


@router.get("/{club_id}/members", response_model=List[ClubMemberResponse])
async def get_club_members(
    club_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Отримати список учасників клубу"""
    user_id = str(user['user']['id'])
    
    # Перевірка чи користувач є членом
    role = get_user_club_role(db, club_id, user_id)
    if not role:
        raise HTTPException(status_code=403, detail="Ви не є членом цього клубу")
    
    members = db.query(ClubMember).filter(
        ClubMember.club_id == club_id
    ).order_by(ClubMember.joined_at).all()
    
    return members


@router.delete("/{club_id}/members/{member_user_id}", status_code=204)
async def remove_member(
    club_id: int,
    member_user_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Видалити учасника з клубу (тільки owner/admin)"""
    user_id = str(user['user']['id'])
    
    # Перевірка прав
    role = get_user_club_role(db, club_id, user_id)
    if role not in [MemberRole.OWNER, MemberRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Недостатньо прав")
    
    # Знаходимо учасника
    member = db.query(ClubMember).filter(
        ClubMember.club_id == club_id,
        ClubMember.user_id == member_user_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Учасник не знайдений")
    
    # Не можна видалити власника
    if member.role == MemberRole.OWNER:
        raise HTTPException(status_code=400, detail="Не можна видалити власника клубу")
    
    db.delete(member)
    db.commit()
    
    return None
