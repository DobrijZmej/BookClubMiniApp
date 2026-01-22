# 🚀 Оновлення: Dev-режим захист + Loguru логування

## ✅ Що додано

### 1. Захист Dev-режиму
- Dev режим **блокується в production** через змінну `ENV`
- Спроба використати `dev_mock_hash` в production → HTTP 401
- Безпечне тестування в development/staging

### 2. Loguru логування
- 🎨 Кольорове console logging
- 📁 File logging з ротацією (30 днів)
- 🔍 Детальні traceback для помилок
- ⏱️ Автоматичне вимірювання часу запитів

## 📦 Встановлення

### 1. Оновити залежності:

```bash
cd backend
pip install -r requirements.txt
```

### 2. Налаштувати .env:

Скопіюйте `.env.example` → `.env` та налаштуйте:

```bash
# Для розробки
ENV=development
LOG_LEVEL=DEBUG

# Для production (dev-режим автоматично вимкнеться!)
ENV=production
LOG_LEVEL=INFO
```

### 3. Створити директорію для логів:

```bash
mkdir -p backend/logs
```

## 🔒 Безпека

### Dev режим тепер захищений:

**Раніше ❌:**
```python
if 'dev_mock_hash' in init_data:
    # Завжди працював, навіть в production!
```

**Тепер ✅:**
```python
if 'dev_mock_hash' in init_data:
    if ENV == 'production':
        raise HTTPException(401, "Dev mode disabled")
    # Працює тільки в development/staging
```

## 📝 Приклади логів

### Console (з кольорами):
```
2026-01-22 14:30:15 | INFO     | app.main:log_requests:45 - ➡️  POST /api/clubs
2026-01-22 14:30:15 | INFO     | app.routers.clubs:create_club:52 - Creating new club 'Книголюби' by user 123 (@john)
2026-01-22 14:30:15 | SUCCESS  | app.routers.clubs:create_club:88 - ✅ Club created: ID=5, Invite=ABC12XYZ
2026-01-22 14:30:15 | INFO     | app.main:log_requests:56 - ⬅️  POST /api/clubs - Status: 201 - Time: 123.45ms
```

### File (backend/logs/bookclub_2026-01-22.log):
```
2026-01-22 14:30:15 | INFO     | Creating new club 'Книголюби' by user 123 (@john)
2026-01-22 14:30:15 | SUCCESS  | ✅ Club created: ID=5, Invite=ABC12XYZ
```

## 🎯 Використання

### В новому коді:

```python
from loguru import logger

logger.info("Інформаційне повідомлення")
logger.success("✅ Успішна операція")
logger.warning("⚠️ Попередження")
logger.error("❌ Помилка")
```

## 📊 Моніторинг

### Дивитись логи в реальному часі:

```bash
# Windows PowerShell
Get-Content backend\logs\bookclub_*.log -Wait -Tail 50

# Linux/Mac
tail -f backend/logs/bookclub_$(date +%Y-%m-%d).log
```

### Пошук помилок:

```bash
# PowerShell
Select-String "ERROR" backend\logs\*.log

# Linux/Mac
grep "ERROR" backend/logs/*.log
```

## 🔧 Налаштування

### Змінити рівень логування:

У `.env`:
```bash
LOG_LEVEL=DEBUG   # Для розробки (всі деталі)
LOG_LEVEL=INFO    # Для production (важливі події)
LOG_LEVEL=WARNING # Тільки попередження та помилки
```

### Змінити період зберігання:

У `backend/app/main.py`:
```python
logger.add(
    "logs/bookclub_{time:YYYY-MM-DD}.log",
    rotation="00:00",
    retention="30 days",  # Змініть на бажаний період
    compression="zip"
)
```

## 📚 Документація

Детальніше в [LOGGING.md](LOGGING.md)

## ⚠️ ВАЖЛИВО для Production

1. **Змініть ENV на production**:
   ```bash
   ENV=production
   ```

2. **Зменшіть рівень логування**:
   ```bash
   LOG_LEVEL=INFO
   ```

3. **Вимкніть DEBUG**:
   ```bash
   DEBUG=False
   ```

4. **Перевірте що логи ротуються**:
   - Перевірте наявність `backend/logs/`
   - Перевірте права запису

## 🎉 Готово!

Ваш проект тепер має:
- ✅ Захищений dev-режим
- ✅ Професійне логування
- ✅ Автоматичну ротацію логів
- ✅ Performance моніторинг
