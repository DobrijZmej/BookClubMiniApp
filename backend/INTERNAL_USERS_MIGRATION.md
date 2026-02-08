# 🔄 Internal Users System - Migration Guide

## Що змінилось?

Додана нова система користувачів (`internal_users`) для підтримки мультиплатформності (Telegram + Web + інші).

## Структура БД

```
internal_users          - Core таблиця (id)
├─ user_identities      - Auth providers (Telegram, Google, etc.)
└─ user_profiles        - Profile data (name, avatar, bio)
```

## Як використовувати в існуючому коді?

### ❌ СТАРИЙ спосіб (все ще працює)
```python
@router.post("/clubs")
async def create_club(
    user: dict = Depends(get_current_user)  # Тільки Telegram validation
):
    telegram_id = str(user['user']['id'])
    # Працює з telegram_id як раніше
```

### ✅ НОВИЙ спосіб (рекомендовано)
```python
@router.post("/clubs")
async def create_club(
    user: dict = Depends(get_current_user_with_internal_id)  # 🆕 З internal_user
):
    telegram_id = str(user['user']['id'])      # ✅ Все ще працює
    internal_user_id = user['internal_user_id']  # 🆕 Автоматично створений
    
    # Тепер можна заповнювати ОБА поля
    new_club = Club(
        owner_id=telegram_id,           # Legacy (backward compatibility)
        owner_internal_id=internal_user_id,  # Новий (future-proof)
        ...
    )
```

## Коли використовувати який dependency?

### `get_current_user` - legacy, без створення internal_user
✅ Використовуйте для:
- READ-only операцій (перегляд даних)
- Коли не створюєте нові записи в БД
- Backward compatibility з існуючим кодом

### `get_current_user_with_internal_id` - новий, автоматично створює internal_user
✅ Використовуйте для:
- Створення клубів, книг, позичань, відгуків
- Будь-яких операцій, що створюють записи в БД
- Нових ендпоїнтів

## Приклади міграції ендпоїнтів

### До (старий код):
```python
@router.post("", response_model=ClubDetailResponse)
async def create_club(
    club_data: ClubCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)  # ❌ Старий
):
    telegram_user_id = str(user['user']['id'])
    
    new_club = Club(
        owner_id=telegram_user_id,
        owner_internal_id=None,  # ❌ Завжди NULL
        ...
    )
```

### Після (новий код):
```python
@router.post("", response_model=ClubDetailResponse)
async def create_club(
    club_data: ClubCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user_with_internal_id)  # ✅ Новий
):
    telegram_user_id = str(user['user']['id'])
    internal_user_id = user['internal_user_id']  # ✅ Автоматично створений
    
    new_club = Club(
        owner_id=telegram_user_id,          # ✅ Backward compatibility
        owner_internal_id=internal_user_id,  # ✅ Future-proof
        ...
    )
```

## Що відбувається "під капотом"?

```python
# При першому запиті користувача:
get_current_user_with_internal_id()
  ↓
1. Валідує Telegram initData
2. Шукає internal_user в БД
3. Якщо НЕ знайдено:
   - Створює internal_users (id)
   - Створює user_identities (provider=TELEGRAM, provider_user_id=<telegram_id>)
   - Створює user_profiles (first_name, last_name, username)
4. Якщо знайдено:
   - Просто повертає існуючий ID
5. Додає internal_user_id до результату
```

## Pydantic схеми - що змінилось?

Всі response схеми тепер підтримують `internal_user_id`:

```python
class ClubMemberResponse(BaseModel):
    id: int
    user_id: Optional[str] = None              # Telegram ID (може бути NULL)
    internal_user_id: Optional[int] = None     # 🆕 Internal user ID
    user_name: Optional[str]
    ...
```

## План міграції

### ✅ Фаза 1: Автоматичне створення (ЗАРАЗ)
- `get_current_user_with_internal_id` створює internal_user при кожному запиті
- Legacy код продовжує працювати
- Нові користувачі автоматично мають internal_user_id

### 🔄 Фаза 2: Поступове оновлення ендпоїнтів (NEXT)
- Замінити `get_current_user` → `get_current_user_with_internal_id` в критичних місцях
- Починати заповнювати `internal_user_id` при створенні записів
- Пріоритет: create_club, add_book, borrow_book, add_review

### 📊 Фаза 3: Міграція існуючих даних (МАЙБУТНЄ)
- Скрипт для створення internal_users для старих записів
- Заповнити `internal_user_id` в існуючих записах
- Можна буде видалити `user_id` (varchar) поля

## Troubleshooting

### Помилка: "Failed to create internal_user"
- Перевірте чи таблиці `internal_users`, `user_identities`, `user_profiles` існують
- Перевірте Foreign Key constraints

### Internal user створюється на кожний запит
- ✅ Це нормально! Функція спочатку шукає існуючого, потім створює якщо немає
- Дивіться логи: "Found existing internal_user" vs "Creating new internal_user"

### Як перевірити чи працює?
```python
# Додайте логування в ендпоїнт:
logger.info(f"User internal_id: {user.get('internal_user_id')}")

# Перевірте БД:
SELECT * FROM internal_users ORDER BY created_at DESC LIMIT 10;
SELECT * FROM user_identities WHERE provider = 'TELEGRAM';
```

## Корисні запити до БД

```sql
-- Скільки internal_users створено?
SELECT COUNT(*) FROM internal_users;

-- Які Telegram користувачі мають internal_user?
SELECT 
    ui.provider_user_id AS telegram_id,
    up.first_name,
    up.username,
    iu.created_at
FROM internal_users iu
JOIN user_identities ui ON ui.user_id = iu.id
JOIN user_profiles up ON up.user_id = iu.id
WHERE ui.provider = 'TELEGRAM'
ORDER BY iu.created_at DESC;

-- Знайти internal_user_id по Telegram ID
SELECT user_id FROM user_identities 
WHERE provider = 'TELEGRAM' AND provider_user_id = '668178338';
```

## Наступні кроки

1. ✅ Система готова - internal_user створюється автоматично
2. 🔄 Поступово оновлюйте ендпоїнти для використання `get_current_user_with_internal_id`
3. 📝 При створенні нових записів заповнюйте обидва поля (`user_id` + `internal_user_id`)
4. 🎯 Згодом можна запустити скрипт міграції для старих даних
