from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List
from datetime import datetime
import secrets
import string
from loguru import logger

from app.database import get_db
from app.auth import get_current_user, get_current_user_with_internal_id
from app.models.db_models import (
    Club, ClubMember, ClubJoinRequest, ClubStatus, 
    MemberRole, JoinRequestStatus, Book, BookStatus,
    BookLoan, BookReview
)
from app.models.schemas import (
    ClubCreate, ClubUpdate, ClubResponse, ClubDetailResponse,
    ClubMemberResponse, JoinRequestCreate, JoinRequestResponse,
    JoinRequestAction, MemberRoleUpdate, ActivityFeedResponse,
    ActivityEvent, ActivityEventType, ActivityActor, ActivityBook
)
from app.utils import file_storage

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
    user: dict = Depends(get_current_user_with_internal_id)  # 🆕 Auto-create internal_user
):
    """Створити новий клуб"""
    telegram_user = user['user']
    user_id = str(telegram_user['id'])
    internal_user_id = user.get('internal_user_id')  # 🆕 Internal user ID
    
    logger.info(f"Creating new club '{club_data.name}' by user {user_id} (@{telegram_user.get('username', 'unknown')}) internal_id={internal_user_id}")
    
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
        owner_id=user_id,  # Legacy Telegram ID
        owner_internal_id=internal_user_id,  # 🆕 Internal user ID
        invite_code=invite_code,
        is_public=club_data.is_public,
        requires_approval=club_data.requires_approval,
        status=ClubStatus.ACTIVE
    )
    
    db.add(new_club)
    db.flush()  # Отримуємо ID клубу
    
    # Додаємо засновника як члена з роллю owner
    owner_member = ClubMember(
        club_id=new_club.id,
        user_id=user_id,  # Legacy Telegram ID
        internal_user_id=internal_user_id,  # 🆕 Internal user ID
        user_name=user_name,
        username=telegram_user.get('username', ''),
        role=MemberRole.OWNER
    )
    
    db.add(owner_member)
    db.commit()
    db.refresh(new_club)
    
    logger.success(f"✅ Club created: ID={new_club.id}, Name='{new_club.name}', Invite={invite_code}")
    
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
    """Отримати список клубів користувача (включно з pending заявками)"""
    from app.analytics import track_activity
    
    user_id = str(user['user']['id'])
    
    # Відстежуємо відкриття додатку
    track_activity(
        activity_type="app_opened",
        user_id=user_id
    )
    
    result = []
    
    # 1. Знаходимо клуби з pending заявками (мають бути зверху)
    pending_requests = db.query(ClubJoinRequest).filter(
        ClubJoinRequest.user_id == user_id,
        ClubJoinRequest.status == JoinRequestStatus.PENDING
    ).order_by(desc(ClubJoinRequest.created_at)).all()
    
    for request in pending_requests:
        club = db.query(Club).filter(
            Club.id == request.club_id,
            Club.status == ClubStatus.ACTIVE
        ).first()
        
        if club:
            members_count = db.query(ClubMember).filter(ClubMember.club_id == club.id).count()
            books_count = db.query(Book).filter(
                Book.club_id == club.id,
                Book.status != BookStatus.DELETED
            ).count()
            
            club_dict = {
                "id": club.id,
                "name": club.name,
                "description": club.description,
                "chat_id": club.chat_id,
                "owner_id": club.owner_id,
                "invite_code": club.invite_code,
                "is_public": club.is_public,
                "cover_url": club.cover_url,
                "requires_approval": club.requires_approval,
                "status": club.status.value if hasattr(club.status, 'value') else club.status,
                "created_at": club.created_at,
                "members_count": members_count,
                "books_count": books_count,
                "user_role": "PENDING"  # Спеціальне значення для pending заявок
            }
            result.append(club_dict)
    
    # 2. Знаходимо клуби де користувач є членом
    member_clubs = db.query(Club).join(ClubMember).filter(
        ClubMember.user_id == user_id,
        Club.status == ClubStatus.ACTIVE
    ).order_by(desc(ClubMember.joined_at)).all()
    
    for club in member_clubs:
        members_count = db.query(ClubMember).filter(ClubMember.club_id == club.id).count()
        books_count = db.query(Book).filter(
            Book.club_id == club.id,
            Book.status != BookStatus.DELETED
        ).count()
        
        # Визначаємо роль користувача в клубі
        member = db.query(ClubMember).filter(
            ClubMember.club_id == club.id,
            ClubMember.user_id == user_id
        ).first()
        user_role = member.role.value if member and hasattr(member.role, 'value') else member.role if member else None
        
        club_dict = {
            "id": club.id,
            "name": club.name,
            "description": club.description,
            "chat_id": club.chat_id,
            "owner_id": club.owner_id,
            "invite_code": club.invite_code,
            "is_public": club.is_public,
            "cover_url": club.cover_url,
            "requires_approval": club.requires_approval,
            "status": club.status.value if hasattr(club.status, 'value') else club.status,
            "created_at": club.created_at,
            "members_count": members_count,
            "books_count": books_count,
            "user_role": user_role
        }
        result.append(club_dict)
    
    return result


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
    
    # Рахуємо кількість книг (без видалених)
    books_count = db.query(Book).filter(
        Book.club_id == club_id,
        Book.status != BookStatus.DELETED
    ).count()
    
    # Отримуємо роль користувача
    user_role = role  # роль вже визначена вище через get_user_club_role
    
    return ClubDetailResponse(
        **club.__dict__,
        members=members,
        members_count=len(members),
        books_count=books_count,
        user_role=user_role
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
    if club_data.requires_approval is not None:
        club.requires_approval = club_data.requires_approval
    
    db.commit()
    db.refresh(club)
    
    # Додаємо статистику та роль
    members_count = db.query(ClubMember).filter(ClubMember.club_id == club.id).count()
    books_count = db.query(Book).filter(
        Book.club_id == club.id,
        Book.status != BookStatus.DELETED
    ).count()
    
    return ClubResponse(
        **club.__dict__,
        members_count=members_count,
        books_count=books_count,
        user_role=role  # роль вже визначена вище
    )


@router.post("/join", response_model=JoinRequestResponse, status_code=201)
async def request_to_join_club(
    request_data: JoinRequestCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user_with_internal_id)
):
    """Надіслати запит на приєднання до клубу"""
    telegram_user = user['user']
    user_id = str(telegram_user['id'])
    internal_user_id = user.get('internal_user_id')
    
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
    
    # AUTO-APPROVAL: Якщо клуб не вимагає схвалення, одразу додаємо в члени
    if not club.requires_approval:
        logger.info(f"Auto-approving user {user_id} to club {club.id} (requires_approval=False)")
        
        # Додаємо в члени клубу
        new_member = ClubMember(
            club_id=club.id,
            user_id=user_id,
            internal_user_id=internal_user_id,
            user_name=user_name,
            username=telegram_user.get('username', ''),
            role=MemberRole.MEMBER
        )
        db.add(new_member)
        
        # Створюємо запис про auto-approved запит
        join_request = ClubJoinRequest(
            club_id=club.id,
            user_id=user_id,
            internal_user_id=internal_user_id,
            user_name=user_name,
            username=telegram_user.get('username', ''),
            message=request_data.message,
            status=JoinRequestStatus.APPROVED,
            reviewed_at=datetime.now(),
            reviewed_by="system_auto_approved"
        )
        db.add(join_request)
        db.commit()
        db.refresh(join_request)
        
        logger.success(f"✅ User {user_id} auto-approved to club {club.id}")
        
        return join_request
    
    # STANDARD FLOW: Створюємо запит на розгляд
    join_request = ClubJoinRequest(
        club_id=club.id,
        user_id=user_id,
        internal_user_id=internal_user_id,
        user_name=user_name,
        username=telegram_user.get('username', ''),
        message=request_data.message,
        status=JoinRequestStatus.PENDING
    )
    db.add(join_request)
    db.commit()
    db.refresh(join_request)

    # === Сповіщення owner/admin ===
    try:
        from app.notifications.service import notify
        # Отримати owner та admin'ів клубу
        owner_and_admins = db.query(ClubMember).filter(
            ClubMember.club_id == club.id,
            ClubMember.role.in_([MemberRole.OWNER, MemberRole.ADMIN])
        ).all()
        recipients = [m.user_id for m in owner_and_admins]
        # Формуємо контекст для шаблону
        context = {
            'user_name': user_name,
            'club_name': club.name
        }
        notify('join_request', recipients, context)
    except Exception as e:
        logger.warning(f"[NOTIFY] Не вдалося надіслати сповіщення про заявку: {e}")

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
    user: dict = Depends(get_current_user_with_internal_id)
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
    notify_event = None
    if action.action == "approve":
        join_request.status = JoinRequestStatus.APPROVED
        # Додаємо користувача до клубу
        new_member = ClubMember(
            club_id=club_id,
            user_id=join_request.user_id,
            internal_user_id=join_request.internal_user_id,
            user_name=join_request.user_name,
            username=join_request.username,
            role=MemberRole.MEMBER
        )
        db.add(new_member)
        notify_event = "join_request_approved"
    else:
        join_request.status = JoinRequestStatus.REJECTED
        notify_event = "join_request_rejected"

    join_request.reviewed_at = datetime.now()
    join_request.reviewed_by = user_id

    db.commit()
    db.refresh(join_request)

    # Notification logic
    try:
        from app.notifications.service import notify
        club = db.query(Club).filter(Club.id == club_id).first()
        club_owner_id = club.owner_id if club else None
        applicant_id = join_request.user_id
        recipients = set()
        if club_owner_id:
            recipients.add(club_owner_id)
        if applicant_id:
            recipients.add(applicant_id)
        # If reviewer is also owner/applicant, only send once
        if user_id in recipients:
            recipients.remove(user_id)
        if recipients:
            context = {
                'club_name': club.name if club else '',
                'user_name': join_request.user_name
            }
            notify(notify_event, recipients, context)
    except Exception as e:
        logger.warning(f"[NOTIFY] Не вдалося надіслати сповіщення про рішення по заявці: {e}")

    return join_request


@router.get("/{club_id}/members", response_model=List[ClubMemberResponse])
async def get_club_members(
    club_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Отримати список учасників клубу зі статистикою"""
    user_id = str(user['user']['id'])
    
    # Перевірка чи користувач є членом
    role = get_user_club_role(db, club_id, user_id)
    if not role:
        raise HTTPException(status_code=403, detail="Ви не є членом цього клубу")
    
    members = db.query(ClubMember).filter(
        ClubMember.club_id == club_id
    ).order_by(ClubMember.joined_at).all()
    
    # Додаємо статистику для кожного учасника
    result = []
    for member in members:
        # Підраховуємо книжки створені учасником
        books_created = db.query(Book).filter(
            Book.club_id == club_id,
            Book.owner_id == member.user_id,
            Book.status != BookStatus.DELETED
        ).count()
        
        # Підраховуємо скільки разів брав книжки (унікальні позичання)
        from app.models.db_models import BookLoan
        books_borrowed = db.query(BookLoan).join(Book).filter(
            Book.club_id == club_id,
            BookLoan.user_id == member.user_id
        ).count()
        
        # Підраховуємо відгуки
        from app.models.db_models import BookReview
        reviews_count = db.query(BookReview).join(Book).filter(
            Book.club_id == club_id,
            BookReview.user_id == member.user_id
        ).count()
        
        member_dict = {
            "id": member.id,
            "user_id": member.user_id,
            "user_name": member.user_name,
            "username": member.username,
            "role": member.role.value if hasattr(member.role, 'value') else member.role,
            "joined_at": member.joined_at,
            "books_created": books_created,
            "books_borrowed": books_borrowed,
            "reviews_count": reviews_count
        }
        result.append(member_dict)
    
    return result


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
    
    # ADMIN не може видаляти інших ADMIN
    if role == MemberRole.ADMIN and member.role == MemberRole.ADMIN:
        raise HTTPException(status_code=403, detail="Адміністратор не може видалити іншого адміністратора")
    
    db.delete(member)
    db.commit()
    
    logger.info(f"✅ Member {member_user_id} removed from club {club_id} by user {user_id}")
    
    return None


@router.patch("/{club_id}/members/{member_user_id}/role", response_model=ClubMemberResponse)
async def update_member_role(
    club_id: int,
    member_user_id: str,
    role_data: MemberRoleUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Змінити роль учасника клубу (тільки OWNER)"""
    user_id = str(user['user']['id'])
    
    logger.info(f"User {user_id} attempting to change role for {member_user_id} in club {club_id} to {role_data.role}")
    
    # Перевірка прав - тільки OWNER може змінювати ролі
    current_role = get_user_club_role(db, club_id, user_id)
    if current_role != MemberRole.OWNER:
        logger.warning(f"❌ User {user_id} (role: {current_role}) tried to change roles without OWNER permission")
        raise HTTPException(status_code=403, detail="Тільки власник клубу може змінювати ролі")
    
    # Не можна змінювати свою власну роль
    if user_id == member_user_id:
        raise HTTPException(status_code=400, detail="Не можна змінювати свою власну роль")
    
    # Знаходимо учасника
    member = db.query(ClubMember).filter(
        ClubMember.club_id == club_id,
        ClubMember.user_id == member_user_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Учасник не знайдений")
    
    # Не можна змінити роль OWNER
    if member.role == MemberRole.OWNER:
        raise HTTPException(status_code=400, detail="Не можна змінити роль власника клубу")
    
    # Оновлюємо роль
    old_role = member.role
    member.role = MemberRole[role_data.role]  # Конвертуємо string в enum
    
    db.commit()
    db.refresh(member)
    
    logger.success(f"✅ Role changed for {member_user_id} in club {club_id}: {old_role} → {member.role}")
    
    return member


@router.post("/{club_id}/avatar", status_code=200)
async def upload_club_avatar(
    club_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Завантажити аватар клубу (тільки owner/admin)"""
    user_id = str(user['user']['id'])
    
    logger.info(f"Uploading avatar for club {club_id} by user {user_id}")
    
    # Перевірка існування клубу
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Клуб не знайдено")
    
    # Перевірка прав (owner або admin)
    role = get_user_club_role(db, club_id, user_id)
    if role not in [MemberRole.OWNER, MemberRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Недостатньо прав")
    
    # Save avatar (validates, resizes to 300x300, optimizes)
    try:
        avatar_url = file_storage.save_club_avatar(club_id, file)
        
        # Delete old avatar if exists
        if club.cover_url:
            file_storage.delete_file(club.cover_url)
        
        # Update club
        club.cover_url = avatar_url
        db.commit()
        
        logger.success(f"✅ Club {club_id} avatar updated: {avatar_url}")
        
        return {
            "message": "Аватар клубу успішно оновлено",
            "cover_url": avatar_url
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload avatar: {e}")
        raise HTTPException(
            status_code=500,
            detail="Помилка завантаження аватару"
        )


@router.delete("/{club_id}", status_code=204)
async def delete_club(
    club_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Видалити клуб (тільки OWNER) - soft delete"""
    user_id = str(user['user']['id'])
    
    logger.info(f"User {user_id} attempting to delete club {club_id}")
    
    # Перевірка існування клубу
    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Клуб не знайдено")
    
    # Перевірка що клуб не видалений
    if club.status == ClubStatus.DELETED:
        raise HTTPException(status_code=400, detail="Клуб вже видалено")
    
    # Перевірка прав - тільки OWNER може видалити клуб
    role = get_user_club_role(db, club_id, user_id)
    if role != MemberRole.OWNER:
        logger.warning(f"❌ User {user_id} (role: {role}) tried to delete club without OWNER permission")
        raise HTTPException(status_code=403, detail="Тільки власник клубу може видалити його")
    
    # Soft delete - змінюємо статус
    club.status = ClubStatus.DELETED
    
    db.commit()
    
    logger.success(f"✅ Club {club_id} marked as deleted by owner {user_id}")
    
    return None


@router.get("/{club_id}/activity", response_model=ActivityFeedResponse)
async def get_club_activity(
    club_id: int,
    event_type: str = Query(None, description="Фільтр по типу події: ADD_BOOK, BORROW_BOOK, RETURN_BOOK, REVIEW_BOOK, MEMBER_JOINED, MEMBER_LEFT"),
    limit: int = Query(50, ge=1, le=100, description="Кількість подій на сторінку"),
    offset: int = Query(0, ge=0, description="Зсув для пагінації"),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """Отримати стрічку активностей клубу"""
    user_id = str(user['user']['id'])
    
    # Перевірка членства в клубі
    member = db.query(ClubMember).filter(
        ClubMember.club_id == club_id,
        ClubMember.user_id == user_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=403, detail="Ви не є членом цього клубу")
    
    # SQL-запит з UNION ALL для агрегації всіх типів подій
    from sqlalchemy import text
    
    # Базовий SQL для кожного типу події
    add_book_query = """
        SELECT 
            CONCAT('book_', b.id) as event_id,
            'ADD_BOOK' as event_type,
            b.created_at as event_time,
            b.owner_id as actor_id,
            b.owner_name as actor_name,
            b.owner_username as actor_username,
            b.id as book_id,
            b.title as book_title,
            b.author as book_author,
            b.cover_url as book_cover_url,
            NULL as rating,
            NULL as review_text
        FROM books b
        WHERE b.club_id = :club_id AND b.status != 'DELETED'
    """
    
    borrow_query = """
        SELECT 
            CONCAT('loan_', bl.id, '_borrow') as event_id,
            'BORROW_BOOK' as event_type,
            bl.borrowed_at as event_time,
            bl.user_id as actor_id,
            cm.user_name as actor_name,
            bl.username as actor_username,
            b.id as book_id,
            b.title as book_title,
            b.author as book_author,
            b.cover_url as book_cover_url,
            NULL as rating,
            NULL as review_text
        FROM book_loans bl
        JOIN books b ON bl.book_id = b.id
        LEFT JOIN club_members cm ON (bl.user_id = cm.user_id AND cm.club_id = :club_id)
        WHERE b.club_id = :club_id AND b.status != 'DELETED'
    """
    
    return_query = """
        SELECT 
            CONCAT('loan_', bl.id, '_return') as event_id,
            'RETURN_BOOK' as event_type,
            bl.returned_at as event_time,
            bl.user_id as actor_id,
            cm.user_name as actor_name,
            bl.username as actor_username,
            b.id as book_id,
            b.title as book_title,
            b.author as book_author,
            b.cover_url as book_cover_url,
            NULL as rating,
            NULL as review_text
        FROM book_loans bl
        JOIN books b ON bl.book_id = b.id
        LEFT JOIN club_members cm ON (bl.user_id = cm.user_id AND cm.club_id = :club_id)
        WHERE b.club_id = :club_id AND b.status != 'DELETED' AND bl.returned_at IS NOT NULL
    """
    
    review_query = """
        SELECT 
            CONCAT('review_', br.id) as event_id,
            'REVIEW_BOOK' as event_type,
            br.created_at as event_time,
            br.user_id as actor_id,
            cm.user_name as actor_name,
            br.username as actor_username,
            b.id as book_id,
            b.title as book_title,
            b.author as book_author,
            b.cover_url as book_cover_url,
            br.rating as rating,
            br.comment as review_text
        FROM book_reviews br
        JOIN books b ON br.book_id = b.id
        LEFT JOIN club_members cm ON (br.user_id = cm.user_id AND cm.club_id = :club_id)
        WHERE b.club_id = :club_id AND b.status != 'DELETED'
    """
    
    member_joined_query = """
        SELECT 
            CONCAT('member_join_', cm.id) as event_id,
            'MEMBER_JOINED' as event_type,
            cm.joined_at as event_time,
            cm.user_id as actor_id,
            cm.user_name as actor_name,
            cm.username as actor_username,
            NULL as book_id,
            NULL as book_title,
            NULL as book_author,
            NULL as book_cover_url,
            NULL as rating,
            NULL as review_text
        FROM club_members cm
        WHERE cm.club_id = :club_id
    """
    
    # Note: MEMBER_LEFT events cannot be tracked because when a member leaves,
    # they are deleted from club_members table. We would need a separate audit table for this.
    member_left_query = None
    
    # Фільтр по типу події
    queries = []
    if not event_type or event_type == "ADD_BOOK":
        queries.append(add_book_query)
    if not event_type or event_type == "BORROW_BOOK":
        queries.append(borrow_query)
    if not event_type or event_type == "RETURN_BOOK":
        queries.append(return_query)
    if not event_type or event_type == "REVIEW_BOOK":
        queries.append(review_query)
    if not event_type or event_type == "MEMBER_JOINED":
        queries.append(member_joined_query)
    # MEMBER_LEFT is not available because members are deleted from the table
    
    # Об'єднуємо запити через UNION ALL
    combined_query = " UNION ALL ".join(queries)
    
    # Додаємо сортування та пагінацію
    final_query = f"""
        WITH all_events AS ({combined_query})
        SELECT * FROM all_events
        ORDER BY event_time DESC
        LIMIT :limit OFFSET :offset
    """
    
    # Виконуємо запит
    result = db.execute(text(final_query), {"club_id": club_id, "limit": limit + 1, "offset": offset}).fetchall()
    
    # Перевіряємо чи є ще події (для has_more)
    has_more = len(result) > limit
    events_data = result[:limit] if has_more else result
    
    # Конвертуємо результат в Pydantic моделі
    events = []
    for row in events_data:
        actor = ActivityActor(
            user_id=row.actor_id,
            display_name=row.actor_name or row.actor_username or "Невідомо",
            username=row.actor_username
        )
        
        # Book is optional for member events
        book = None
        if row.book_id is not None:
            book = ActivityBook(
                book_id=row.book_id,
                title=row.book_title,
                author=row.book_author,
                cover_url=row.book_cover_url
            )
        
        event = ActivityEvent(
            event_id=row.event_id,
            event_type=row.event_type,
            event_time=row.event_time,
            actor=actor,
            book=book,
            rating=row.rating,
            review_text=row.review_text
        )
        events.append(event)
    
    # Підрахунок загальної кількості (без фільтра limit/offset)
    count_query = f"SELECT COUNT(*) as total FROM ({combined_query}) as all_events"
    total_count = db.execute(text(count_query), {"club_id": club_id}).scalar()
    
    return ActivityFeedResponse(
        events=events,
        total_count=total_count,
        has_more=has_more
    )
