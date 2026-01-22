# 📝 Логування в Book Club Mini App

## 🎯 Огляд

Проект використовує **Loguru** для структурованого та кольорового логування.

## 🔧 Налаштування

### Змінні середовища (.env)

```bash
# Рівень логування для консолі
LOG_LEVEL=DEBUG  # DEBUG | INFO | WARNING | ERROR | CRITICAL

# Environment для контролю dev-режиму
ENV=development  # development | staging | production
```

### Типи логів

1. **Console logging** (stderr) - з кольорами та форматуванням
2. **File logging** - ротовані файли в `backend/logs/`

## 📂 Структура логів

```
backend/logs/
├── bookclub_2026-01-22.log
├── bookclub_2026-01-23.log
└── bookclub_2026-01-24.log.zip  # Старі логи стискаються
```

### Параметри ротації:
- **Rotation**: щодня о 00:00
- **Retention**: 30 днів
- **Compression**: ZIP для старих логів

## 🎨 Приклади використання

### В коді:

```python
from loguru import logger

# Звичайне логування
logger.debug("Debug інформація")
logger.info("Інформаційне повідомлення")
logger.warning("Попередження")
logger.error("Помилка")
logger.success("Успішна операція")  # Зелений колір

# З контекстом
logger.info(f"User {user_id} created club '{club_name}'")

# З exception
try:
    # код
except Exception as e:
    logger.exception("Детальна помилка з traceback")
```

## 📊 Що логується

### 1. HTTP запити (middleware)
```
➡️  GET /api/books/club/1
⬅️  GET /api/books/club/1 - Status: 200 - Time: 45.23ms
```

### 2. Бізнес-логіка
```
Creating new club 'Книголюби' by user 123456 (@johndoe)
✅ Club created: ID=5, Name='Книголюби', Invite=ABC12345
```

### 3. Аутентифікація
```
🔧 Dev mode detected - bypassing Telegram validation
Dev mode user authenticated: 123456 (@testuser)
⚠️ Dev mode attempt blocked in production environment
```

### 4. Помилки
```
❌ Request failed: POST /api/books - Club not found
Database health check failed: Connection refused
```

## 🔒 Безпека

### Dev режим захист

Dev режим **автоматично блокується** в production:

```python
# В .env
ENV=production  # ⛔ Dev режим заблоковано

ENV=development  # ✅ Dev режим дозволено
```

Спроба використати dev режим в production:
```
⚠️ Dev mode attempt blocked in production environment
HTTP 401: Dev mode is disabled in production
```

## 🚀 Deployment

### Production налаштування:

```bash
# .env для production
ENV=production
LOG_LEVEL=INFO  # Менше деталей в консолі
DEBUG=False
```

### Ротація логів

Логи автоматично:
1. Створюються щодня
2. Зберігаються 30 днів
3. Стискаються після ротації
4. Не потрапляють в git (є в `.gitignore`)

### Моніторинг логів

```bash
# Останні 50 рядків
tail -f backend/logs/bookclub_$(date +%Y-%m-%d).log

# Пошук помилок
grep "ERROR" backend/logs/*.log

# Статистика запитів
grep "➡️" backend/logs/bookclub_2026-01-22.log | wc -l
```

## 📈 Метрики з логів

### Аналіз performance:

```bash
# Найповільніші запити
grep "⬅️" backend/logs/*.log | grep -oP 'Time: \K[0-9.]+' | sort -n | tail -10
```

### Топ endpoint'ів:

```bash
# Найчастіші запити
grep "➡️" backend/logs/*.log | awk '{print $3, $4}' | sort | uniq -c | sort -rn
```

## 🎯 Best Practices

1. **Використовуйте правильні рівні:**
   - `DEBUG` - детальна інформація для розробки
   - `INFO` - важливі події (створення, оновлення)
   - `WARNING` - підозрілі ситуації
   - `ERROR` - помилки з можливістю відновлення
   - `CRITICAL` - критичні помилки

2. **Додавайте контекст:**
   ```python
   logger.info(f"User {user_id} borrowed book {book_id} from club {club_id}")
   ```

3. **Не логуйте чутливі дані:**
   - ❌ Паролі, токени, ключі
   - ❌ Повні hash значення
   - ✅ User IDs, usernames
   - ✅ Resource IDs

4. **Structured logging для важливих подій:**
   ```python
   logger.bind(
       user_id=user_id,
       club_id=club_id,
       action="create_book"
   ).info("Book created")
   ```

## 🔍 Troubleshooting

### Логи не з'являються

1. Перевірте права доступу до `backend/logs/`
2. Перевірте `LOG_LEVEL` в .env
3. Перевірте чи встановлено loguru: `pip install loguru`

### Занадто багато логів

1. Змініть `LOG_LEVEL=INFO` (замість DEBUG)
2. Налаштуйте фільтри в `main.py`

### Логи не ротуються

Перевірте формат в `main.py`:
```python
logger.add(
    "logs/bookclub_{time:YYYY-MM-DD}.log",
    rotation="00:00"
)
```
