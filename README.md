# 📚 Book Club Mini App

Telegram Mini App для управління книжковим клубом.

## 🏗️ Структура проекту

```
BookClubMiniApp/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── routers/      # API endpoints
│   │   ├── models/       # SQLAlchemy models
│   │   ├── database.py   # Database connection
│   │   ├── auth.py       # Telegram auth validation
│   │   └── main.py       # FastAPI app
│   ├── requirements.txt
│   └── .env
├── frontend/             # Vanilla JS frontend
│   ├── css/
│   ├── js/
│   ├── index.html
│   └── manifest.json
└── deploy/               # Nginx configs
```

## 🚀 Швидкий старт

### Backend (Python)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Налаштуйте змінні
uvicorn app.main:app --reload
```

### Frontend

Просто відкрийте `frontend/index.html` в браузері або налаштуйте nginx.

### База даних

```bash
# Створити БД
mysql -u root -p
CREATE DATABASE book_club;

# Запустити міграції
cd backend
python -m app.init_db
```

## 📋 Налаштування

### 1. BotFather

```
/newbot
/mybots → Обрати бота → Menu Button → Edit menu button URL
URL: https://yourdomain.com/
```

### 2. Nginx

```nginx
server {
    server_name yourdomain.com;
    
    # Frontend
    location / {
        root /path/to/BookClubMiniApp/frontend;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    ssl on;  # Обов'язково HTTPS для Mini Apps!
}
```

## 🔐 Безпека

Mini App валідує користувачів через `initData` від Telegram:
- Перевірка hash підпису
- Перевірка часу (max 1 година)
- Захист від підробки даних
**Security Features:**
- ✅ Telegram WebApp signature validation (HMAC SHA-256)
- ✅ SQL injection protection (SQLAlchemy ORM)
- ✅ File upload validation (type, size, content)
- ✅ Rate limiting (nginx)
- ✅ Security headers (CSP, X-Frame-Options, тощо)
- ✅ HTTPS enforcement
- ✅ Sensitive files blocking (.env, .git)

**Security Audit:** `bash security_check.sh`  
**Details:** See [SECURITY_AUDIT.md](SECURITY_AUDIT.md)
## 📱 Можливості

- ✅ Перегляд бібліотеки з пошуком і фільтрами
- ✅ Додавання книг через форму
- ✅ Позичання книг
- ✅ Історія читання
- ✅ Адаптивний дизайн
- ✅ Dark/Light теми (від Telegram)

## 🛠️ Технології

- **Backend:** FastAPI, SQLAlchemy, PyMySQL
- **Frontend:** Vanilla JS, Telegram Web App SDK
- **Database:** MySQL
- **Deploy:** Nginx + Uvicorn
