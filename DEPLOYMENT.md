# 📋 Інструкція з розгортання Book Club Mini App на VPS

## Крок 1: Підготовка VPS

```bash
# Оновлення системи
sudo apt update && sudo apt upgrade -y

# Встановлення залежностей
sudo apt install -y python3 python3-pip python3-venv nginx mysql-server git

# Встановлення Let's Encrypt для SSL
sudo apt install -y certbot python3-certbot-nginx
```

## Крок 2: Налаштування MySQL

```bash
# Вхід в MySQL
sudo mysql -u root -p

# Створення БД і користувача
CREATE DATABASE book_club CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bookclub_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON book_club.* TO 'bookclub_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Крок 3: Завантаження коду

```bash
# Клонування проекту
cd /var/www
sudo git clone <ваш-репозиторій> BookClubMiniApp
cd BookClubMiniApp

# Або копіювання файлів через SCP
scp -r BookClubMiniApp user@your-vps-ip:/var/www/
```

## Крок 4: Налаштування Backend

```bash
cd /var/www/BookClubMiniApp/backend

# Створення virtualenv
python3 -m venv venv
source venv/bin/activate

# Встановлення залежностей
pip install --upgrade pip
pip install -r requirements.txt

# Налаштування .env
cp .env.example .env
nano .env
```

**Заповніть `.env`:**
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=bookclub_user
DB_PASSWORD=your_strong_password
DB_NAME=book_club

BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
CORS_ORIGINS=https://yourdomain.com
DEBUG=False
```

```bash
# Ініціалізація БД
python -m app.init_db

# Тест запуску
uvicorn app.main:app --host 0.0.0.0 --port 8000
# Ctrl+C для зупинки
```

## Крок 5: Налаштування systemd сервісу

```bash
# Копіюємо service файл
sudo cp /var/www/BookClubMiniApp/bookclub.service /etc/systemd/system/

# Редагуємо шляхи
sudo nano /etc/systemd/system/bookclub.service
# Змініть /path/to/BookClubMiniApp на /var/www/BookClubMiniApp

# Запускаємо сервіс
sudo systemctl daemon-reload
sudo systemctl enable bookclub.service
sudo systemctl start bookclub.service
sudo systemctl status bookclub.service
```

## Крок 6: Налаштування Nginx

```bash
# Копіюємо конфіг
sudo cp /var/www/BookClubMiniApp/nginx.conf /etc/nginx/sites-available/bookclub

# Редагуємо домен та шляхи
sudo nano /etc/nginx/sites-available/bookclub
# Змініть yourdomain.com на ваш реальний домен
# Змініть /path/to/ на /var/www/

# Створюємо symlink
sudo ln -s /etc/nginx/sites-available/bookclub /etc/nginx/sites-enabled/

# Видаляємо дефолтний конфіг
sudo rm /etc/nginx/sites-enabled/default

# Тестуємо конфіг
sudo nginx -t
```

**⚠️ ВАЖЛИВО БЕЗПЕКИ:**
Конфігурація nginx вже містить захист від доступу до `.env`, `.git` та інших sensitive файлів.
Переконайтеся, що ці правила присутні перед запуском:
- Блокування прихованих файлів (`/\.`)
- Блокування backend директорії
- Блокування файлів `.env`, `.log`, `.sql`, тощо

## Крок 7: Отримання SSL сертифіката

```bash
# Let's Encrypt
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Автоматичне оновлення
sudo systemctl enable certbot.timer
```

## Крок 8: Налаштування Telegram Bot

1. Відкрийте [@BotFather](https://t.me/BotFather) в Telegram
2. Відправте `/mybots`
3. Оберіть вашого бота
4. **Menu Button** → **Edit menu button URL**
5. Введіть: `https://yourdomain.com?chat_id={chat_id}`
6. **Menu Button Text**: "📚 Відкрити бібліотеку"

## Крок 9: Перевірка

```bash
# Перевірка backend
curl http://localhost:8000/api/health

# Перевірка nginx
curl https://yourdomain.com

# Логи
sudo journalctl -u bookclub.service -f
sudo tail -f /var/log/nginx/bookclub_error.log
```

## Крок 10: Оновлення коду

```bash
cd /var/www/BookClubMiniApp
sudo git pull origin main

# Або використовуйте deploy script
chmod +x deploy.sh
./deploy.sh
```

## 🔧 Troubleshooting

### Backend не запускається
```bash
sudo journalctl -u bookclub.service -n 50
# Перевірте .env файл
# Перевірте права доступу: sudo chown -R www-data:www-data /var/www/BookClubMiniApp
```

### Помилка підключення до MySQL
```bash
# Перевірте чи працює MySQL
sudo systemctl status mysql

# Перевірте користувача БД
mysql -u bookclub_user -p book_club
```

### Nginx 502 Bad Gateway
```bash
# Перевірте чи працює backend
curl http://localhost:8000

# Перевірте SELinux (якщо CentOS)
sudo setsebool -P httpd_can_network_connect 1
```

### Telegram не відкриває Mini App
- Переконайтесь що домен має HTTPS (Let's Encrypt)
- Перевірте URL в BotFather
- Telegram підтримує тільки HTTPS для Mini Apps

## 📊 Моніторинг

```bash
# Статус сервісів
sudo systemctl status bookclub.service nginx mysql

# Використання ресурсів
htop

# Розмір БД
sudo du -sh /var/lib/mysql/book_club
```

## 🔐 Безпека

```bash
# Налаштування firewall
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable

# Заборона root login через SSH
sudo nano /etc/ssh/sshd_config
# PermitRootLogin no
sudo systemctl restart ssh
```

## ✅ Готово!

Відкрийте вашого бота в Telegram і натисніть кнопку Menu — ви побачите ваш Mini App!
