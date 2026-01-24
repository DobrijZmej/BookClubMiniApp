// Main App Module
(async function() {
    console.log('📱 Telegram Mini App Starting...');
    console.log('Telegram SDK version:', tg.version);
    console.log('initData:', tg.initData ? 'present' : 'MISSING');
    console.log('initDataUnsafe:', tg.initDataUnsafe);
    
    // Ініціалізація Telegram Web App
    tg.ready();
    tg.expand();
    
    // Застосування теми з Telegram
    const applyTelegramTheme = () => {
        const colorScheme = tg.colorScheme || 'light'; // 'light' or 'dark'
        
        if (colorScheme === 'dark') {
            document.documentElement.classList.add('dark-theme');
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark-theme');
            document.documentElement.setAttribute('data-theme', 'light');
        }
        
        console.log('🎨 Theme applied:', colorScheme);
    };
    
    applyTelegramTheme();
    
    // Відстеження зміни теми
    if (tg.onEvent) {
        tg.onEvent('themeChanged', applyTelegramTheme);
    }
    
    // Отримуємо chat_id автоматично з Telegram
    let chatId = null;
    
    // Якщо відкрито в групі/каналі - використовуємо chat.id
    if (tg.initDataUnsafe.chat && tg.initDataUnsafe.chat.id) {
        chatId = String(tg.initDataUnsafe.chat.id);
    }
    // Якщо приватний чат - використовуємо user.id як chat_id
    else if (tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) {
        chatId = `user_${tg.initDataUnsafe.user.id}`;
    }
    // Fallback для тестування
    else {
        if (CONFIG.IS_DEV_MODE) {
            chatId = `user_${CONFIG.DEV_USER.id}`;
            console.log('🔧 Dev режим: використовую mock chat_id');
        } else {
            chatId = 'default_chat';
            console.warn('⚠️ No Telegram user data! Using fallback chat_id. Make sure to open this app through Telegram bot.');
        }
    }
    
    CONFIG.CHAT_ID = chatId;
    
    console.log('Chat ID:', CONFIG.CHAT_ID);
    console.log('Chat Type:', tg.initDataUnsafe.chat_type || 'private');
    console.log('User:', tg.initDataUnsafe.user);
    console.log('Chat:', tg.initDataUnsafe.chat);
    
    // Відображаємо username в header
    const userData = tg.initDataUnsafe.user || CONFIG.DEV_USER;
    if (userData) {
        const username = userData.username || 
                        userData.first_name || 
                        'Користувач';
        
        // Dev режим індикація
        if (CONFIG.IS_DEV_MODE) {
            document.getElementById('username').textContent = `🔧 @${username} (Dev)`;
            document.title = '🔧 Book Club (Dev Mode)';
        } else {
            document.getElementById('username').textContent = `@${username}`;
        }
    }
    
    // Перевірка здоров'я API (опціонально)
    try {
        await API.healthCheck();
        console.log('✅ API is healthy');
    } catch (error) {
        console.error('⚠️ API health check failed:', error);
    }
    
    // ===== Event Listeners =====
    
    // Back button
    document.getElementById('back-button').addEventListener('click', () => {
        tg.HapticFeedback.impactOccurred('soft');
        
        // Перевірити поточний view
        if (document.getElementById('book-review-view').classList.contains('active')) {
            UI.goBackFromReview();
        } else if (document.getElementById('club-detail-view').classList.contains('active')) {
            ClubsUI.backToClubsList();
        } else if (document.getElementById('add-book-view').classList.contains('active')) {
            // Повернутися до деталей клубу
            document.getElementById('add-book-view').classList.remove('active');
            document.getElementById('club-detail-view').classList.add('active');
            // Відновлюємо назву клубу
            const previousTitle = document.getElementById('header-title').dataset.previousTitle;
            if (previousTitle) {
                document.getElementById('header-title').textContent = previousTitle;
            }
        } else if (document.getElementById('create-club-view').classList.contains('active') || 
                   document.getElementById('join-club-view').classList.contains('active')) {
            // Повернутися до списку клубів
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('clubs-list-view').classList.add('active');
            document.getElementById('header-title').textContent = 'Книжковий Обмін';
            document.getElementById('back-button').style.display = 'none';
        } else if (document.getElementById('club-requests-view').classList.contains('active')) {
            // Повернутися до деталей клубу
            ClubsRequests.backToClubDetails();
        }
    });
    
    // Header кнопки
    document.getElementById('search-clubs-btn')?.addEventListener('click', () => {
        tg.HapticFeedback.impactOccurred('medium');
        // TODO: відкрити пошук клубів
        if (tg.showAlert) {
            tg.showAlert('Пошук клубів - в розробці');
        }
    });
    
    document.getElementById('add-club-btn')?.addEventListener('click', () => {
        tg.HapticFeedback.impactOccurred('medium');
        ClubForm.openCreateMode();
    });
    
    document.getElementById('edit-club-btn')?.addEventListener('click', () => {
        tg.HapticFeedback.impactOccurred('medium');
        if (ClubsUI.currentClubId) {
            ClubForm.openEditMode(ClubsUI.currentClubId);
        }
    });
    
    document.getElementById('join-code-btn')?.addEventListener('click', () => {
        tg.HapticFeedback.impactOccurred('medium');
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('join-club-view').classList.add('active');
        document.getElementById('header-title').textContent = 'Вступити за кодом';
        document.getElementById('back-button').style.display = 'flex';
    });
    
    // Кнопки в секції "Знайти Книжковий Клуб"
    document.getElementById('search-clubs-main-btn')?.addEventListener('click', () => {
        tg.HapticFeedback.impactOccurred('medium');
        // TODO: відкрити пошук клубів
        if (tg.showAlert) {
            tg.showAlert('Пошук клубів - в розробці');
        }
    });
    
    document.getElementById('join-code-main-btn')?.addEventListener('click', () => {
        tg.HapticFeedback.impactOccurred('medium');
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('join-club-view').classList.add('active');
        document.getElementById('header-title').textContent = 'Вступити за кодом';
        document.getElementById('back-button').style.display = 'flex';
    });
    
    document.getElementById('create-club-main-btn')?.addEventListener('click', () => {
        tg.HapticFeedback.impactOccurred('medium');
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('create-club-view').classList.add('active');
        document.getElementById('header-title').textContent = 'Створити клуб';
        document.getElementById('back-button').style.display = 'flex';
    });
    
    document.getElementById('requests-back-button')?.addEventListener('click', () => {
        tg.HapticFeedback.impactOccurred('soft');
        ClubsRequests.backToClubDetails();
    });

    // Кнопка "Додати книгу" в деталях клубу
    const addBookToClubBtn = document.getElementById('add-book-to-club-btn');
    if (addBookToClubBtn) {
        addBookToClubBtn.addEventListener('click', () => {
            tg.HapticFeedback.impactOccurred('medium');
            // Зберігаємо поточну назву клубу
            const currentClubName = document.getElementById('header-title').textContent;
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('add-book-view').classList.add('active');
            document.getElementById('header-title').textContent = 'Додати книгу';
            document.getElementById('header-title').dataset.previousTitle = currentClubName;
            document.getElementById('back-button').style.display = 'block';
        });
    }
    
    // Кнопка "Додати книгу" в header (club context)
    const addBookBtn = document.getElementById('add-book-btn');
    if (addBookBtn) {
    addBookBtn.addEventListener('click', () => {
        tg.HapticFeedback?.impactOccurred?.('medium');

        if (!ClubsUI.currentClubId) {
        tg.showAlert?.('Оберіть клуб спочатку');
        return;
        }

        // Нова логіка: відкриваємо окремий екран форми
        UIBookForm.openCreate(ClubsUI.currentClubId);
    });
    }

    // Кнопка "Заявки" в деталях клубу
    const viewRequestsBtn = document.getElementById('view-club-requests-btn');
    if (viewRequestsBtn) {
        viewRequestsBtn.addEventListener('click', () => {
            tg.HapticFeedback.impactOccurred('medium');
            if (ClubsUI.currentClubId) {
                // Зберігаємо назву клубу для навігації назад
                const clubName = document.getElementById('header-title').textContent.replace('📚 ', '');
                document.getElementById('header-title').dataset.clubName = clubName;
                ClubsUI.showClubRequests(ClubsUI.currentClubId);
            }
        });
    }
    
    // Фільтри та пошук (тільки в club-detail-view)
    let searchTimeout;
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (ClubsUI.currentClubId) {
                    UI.loadBooks(ClubsUI.currentClubId);
                }
            }, 300);
        });
    }
    
    const sortBySelect = document.getElementById('sort-by');
    if (sortBySelect) {
        sortBySelect.addEventListener('change', () => {
            if (ClubsUI.currentClubId) {
                UI.loadBooks(ClubsUI.currentClubId);
            }
        });
    }
    
    // Форма додавання книги обробляється в модулі `UIBookForm`.
    
    // Закриття модального вікна
    document.getElementById('close-modal').addEventListener('click', () => {
        UI.closeModal();
    });
    
    document.getElementById('book-modal').addEventListener('click', (e) => {
        if (e.target.id === 'book-modal') {
            UI.closeModal();
        }
    });
    
    // Форма приєднання до клубу
    document.getElementById('join-club-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const inviteCode = document.getElementById('join-invite-code').value.trim().toUpperCase();
        const message = document.getElementById('join-message').value.trim();
        
        if (!inviteCode) {
            alert('Введіть код запрошення');
            return;
        }
        
        try {
            tg.HapticFeedback.impactOccurred('medium');
            UI.setLoading(true);
            
            await API.clubs.requestJoin(inviteCode, message);
            
            // Очищуємо форму
            document.getElementById('join-club-form').reset();
            
            // Повертаємось до списку та перезавантажуємо клуби
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('clubs-list-view').classList.add('active');
            document.getElementById('header-title').textContent = '📚 Мої клуби';
            document.getElementById('back-button').style.display = 'none';
            
            // Показуємо header кнопки головної сторінки
            document.getElementById('search-clubs-btn').style.display = 'flex';
            document.getElementById('add-club-btn').style.display = 'flex';
            document.getElementById('join-code-btn').style.display = 'flex';
            document.getElementById('add-book-btn').style.display = 'none';
            document.getElementById('edit-club-btn').style.display = 'none';
            document.getElementById('delete-club-btn').style.display = 'none';
            
            // Перезавантажуємо список клубів (з новою pending заявкою)
            await ClubsUI.loadClubsList();
            
            alert('✅ Запит надіслано! Очікуйте схвалення від адміністратора');
            
        } catch (error) {
            console.error('Error joining club:', error);
        } finally {
            UI.setLoading(false);
        }
    });

    // Обробники для форми відгука
    const reviewForm = document.getElementById('book-review-form');
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await UI.saveBookReview();
        });
    }

    const deleteReviewBtn = document.getElementById('delete-review-btn');
    if (deleteReviewBtn) {
        deleteReviewBtn.addEventListener('click', async () => {
            await UI.deleteBookReview();
        });
    }
    
    // ===== Initial Load =====
    
    try {
        UI.setLoading(true);
        
        // В dev режимі створюємо тестовий клуб якщо його немає
        if (CONFIG.IS_DEV_MODE) {
            try {
                console.log('🔧 Dev режим: перевіряю чи є клуби...');
                const clubs = await API.clubs.getMy();
                
                if (clubs.length === 0) {
                    console.log('🔧 Dev режим: створюю тестовий клуб...');
                    const testClub = await API.clubs.create({
                        name: "🔧 Dev Test Club",
                        description: "Тестовий клуб для розробки",
                        is_public: false
                    });
                    console.log('🔧 Тестовий клуб створено:', testClub);
                    
                    // Додаємо тестові книги
                    await API.books.create({
                        title: "📚 Тестова книга 1",
                        author: "Dev Author",
                        description: "Перша тестова книга для розробки",
                        club_id: testClub.id
                    });
                    
                    await API.books.create({
                        title: "📖 Тестова книга 2", 
                        author: "Another Author",
                        description: "Друга тестова книга",
                        club_id: testClub.id
                    });
                    
                    console.log('🔧 Тестові книги додано');
                }
            } catch (error) {
                console.log('🔧 Dev режим: помилка створення тестових даних:', error);
            }
        }
        
        // Завантажуємо список клубів користувача (початкова сторінка)
        await ClubsUI.loadMyClubs();
        
        console.log('✅ App initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing app:', error);
        tg.showAlert('Помилка ініціалізації додатку');
    } finally {
        UI.setLoading(false);
    }
    
    // Notification про готовність (для дебагу)
    if (tg.initDataUnsafe.user) {
        console.log(`👋 Hello, ${tg.initDataUnsafe.user.first_name}!`);
    }
})();

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const devParam = urlParams.get("dev");
    const devMode = devParam === "1" || devParam === "true";

    // Перевірка на Telegram WebApp
    const isTelegram = typeof window.Telegram !== "undefined" &&
                       window.Telegram.WebApp &&
                       window.Telegram.WebApp.initData &&
                       window.Telegram.WebApp.initData.length > 0;

    if (!isTelegram && !devMode) {
        document.body.innerHTML = `
            <style>
                body {
                    margin: 0;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
                                 Roboto, Helvetica, Arial, sans-serif;
                    background: #0f172a;
                    color: #e5e7eb;
                }
                .wrapper {
                    max-width: 520px;
                    margin: 0 auto;
                    padding: 32px 20px 40px;
                    text-align: center;
                }
                h1 {
                    font-size: 26px;
                    margin-bottom: 8px;
                }
                .subtitle {
                    color: #9ca3af;
                    font-size: 15px;
                    margin-bottom: 24px;
                }
                .cta {
                    display: inline-block;
                    margin: 16px 0 28px;
                    padding: 14px 22px;
                    background: #22c55e;
                    color: #052e16;
                    font-weight: 600;
                    border-radius: 10px;
                    text-decoration: none;
                }
                .section {
                    text-align: left;
                    margin-top: 28px;
                }
                .section h2 {
                    font-size: 18px;
                    margin-bottom: 12px;
                }
                ul {
                    padding-left: 18px;
                    margin: 0;
                }
                li {
                    margin-bottom: 8px;
                    line-height: 1.5;
                }
                .steps {
                    background: #020617;
                    border-radius: 12px;
                    padding: 16px;
                    margin-top: 12px;
                }
                .step {
                    margin-bottom: 8px;
                }
                .step:last-child {
                    margin-bottom: 0;
                }
                .footer {
                    margin-top: 32px;
                    font-size: 13px;
                    color: #9ca3af;
                }
                .notice {
                    margin: 18px 0 22px;
                    padding: 14px 14px;
                    background: rgba(245, 158, 11, 0.10); /* amber-ish */
                    border: 1px solid rgba(245, 158, 11, 0.35);
                    border-radius: 12px;
                    text-align: left;
                }
                .notice strong {
                    display: block;
                    margin-bottom: 6px;
                    font-size: 14px;
                    color: #fbbf24;
                }
                .notice p {
                    margin: 0;
                    color: #e5e7eb;
                    line-height: 1.5;
                    font-size: 14px;
                }
                .notice .muted {
                    display: block;
                    margin-top: 6px;
                    color: #9ca3af;
                    font-size: 13px;
                }


                /* Carousel mini-styles (fallback) */
                .fb-carousel { max-width: 420px; margin: 12px 0; border-radius: 12px; overflow: hidden; background: #020617; position: relative; }
                .fb-slides { position: relative; width: 100%; height: 0; padding-bottom: 72%; }
                .fb-slides img { position: absolute; top:0; left:0; width:100%; height:100%; object-fit: contain; display:none; }
                .fb-slides img.active { display:block; }
                .fb-btn { position:absolute; top:50%; transform:translateY(-50%); width:40px; height:40px; border-radius:20px; border:none; background: rgba(2,6,23,0.6); color:#fff; font-size:20px; display:flex; align-items:center; justify-content:center; cursor:pointer; }
                .fb-btn.left { left:8px; }
                .fb-btn.right { right:8px; }
                .fb-counter { text-align:center; color:#9ca3af; font-size:13px; margin-top:8px; }

                /* Lightbox / fullscreen preview */
                .fb-lightbox { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.92); z-index: 9999; opacity: 0; visibility: hidden; transition: opacity 160ms ease; }
                .fb-lightbox.open { opacity: 1; visibility: visible; }
                .fb-lightbox img { max-width: 95%; max-height: 95%; object-fit: contain; border-radius: 8px; box-shadow: 0 6px 24px rgba(0,0,0,0.6); }
                .fb-lb-close { position: absolute; top: 18px; right: 18px; width: 40px; height: 40px; border-radius: 20px; border: none; background: rgba(255,255,255,0.06); color: #fff; font-size: 18px; display:flex; align-items:center; justify-content:center; cursor:pointer; }
                .fb-lb-btn { position: absolute; top: 50%; transform: translateY(-50%); width:48px; height:48px; border-radius:24px; border:none; background: rgba(255,255,255,0.04); color:#fff; font-size:26px; display:flex; align-items:center; justify-content:center; cursor:pointer; }
                .fb-lb-btn.left { left: 18px; }
                .fb-lb-btn.right { right: 18px; }
            </style>

            <div class="wrapper">
                <h1>📚 Бібліотекар клубу</h1>
                <div class="subtitle">
                    Сервіс обміну книжками для друзів і спільнот.<br>
                    Працює всередині Telegram.
                </div>

                <div>
                    Ви відкрили сторінку напряму в браузері.<br>
                    Щоб користуватись усіма можливостями — відкрийте бота.
                </div>

                <a class="cta" href="https://t.me/my_book_club_bot" target="_blank">
                    👉 Відкрити у Telegram
                </a>

                <div class="notice">
                    <strong>⚠️ Важливо про обмін</strong>
                    <p>
                        Коли ви <b>берете книгу</b> в додатку — потрібно <b>самостійно звʼязатися</b>
                        з власником книги або адміністратором клубу в Telegram та домовитись,
                        як передати книгу.
                        <br><b>Додаток не займається доставкою.</b>
                    </p>
                    <span class="muted">
                        Порада: напишіть власнику одразу після бронювання — так швидше узгодите час і місце.
                    </span>
                </div>                

                <div class="section">
                    <h2>Що тут можна робити</h2>
                    <ul>
                        <li>Створювати книжкові клуби (публічні або закриті)</li>
                        <li>Додавати власні книги в бібліотеку клубу</li>
                        <li>Брати книги, ставати в чергу та повертати після читання</li>
                        <li>Залишати оцінки (1–5) та відгуки</li>
                        <li>Переглядати історію читання й активність по книзі</li>
                    </ul>
                </div>

                <!-- Carousel inserted here (fallback for non-Telegram view) -->
                <div class="section">
                    <h2>Інструкції</h2>
                    <div class="fb-carousel" id="fb-carousel">
                        <div class="fb-slides" id="fb-slides"></div>
                        <button class="fb-btn left" id="fb-prev" aria-label="Previous">‹</button>
                        <button class="fb-btn right" id="fb-next" aria-label="Next">›</button>
                    </div>
                    <div class="fb-counter" id="fb-counter">1 / 7</div>
                </div>

                <div class="section">
                    <h2>Як почати</h2>
                    <div class="steps">
                        <div class="step">1️⃣ Відкрийте бота в Telegram</div>
                        <div class="step">2️⃣ Створіть клуб або вступіть до існуючого</div>
                        <div class="step">3️⃣ Додавайте книги й домовляйтесь про обмін</div>
                        <div class="step">4️⃣ Домовляйтесь про передачу книги в приватних повідомленнях (доставка поза додатком)</div>
                    </div>
                </div>

                <div class="section">
                    <h2>Для кого це</h2>
                    <div>
                        Для друзів, колег, мешканців будинку,<br>
                        навчальних груп і локальних спільнот.
                    </div>
                </div>

                <div class="footer">
                    Потрібен Telegram для роботи додатку.<br><br>
                    <a href="https://t.me/my_book_club_bot" target="_blank" style="color:#22c55e;">
                        Відкрити @my_book_club_bot
                    </a>
                </div>
            </div>
            `;

        // Initialize lightweight carousel after injecting markup
        (function initFallbackCarouselSimple(){
            try {
                const imgs = [
                    'images/instructions/main_page_dark_001.png',
                    'images/instructions/main_page_dark_002.png',
                    'images/instructions/main_page_dark_003.png',
                    'images/instructions/main_page_dark_004.png',
                    'images/instructions/main_page_dark_005.png',
                    'images/instructions/main_page_dark_006.png',
                    'images/instructions/main_page_dark_007.png'
                ];

                const slidesEl = document.getElementById('fb-slides');
                const counterEl = document.getElementById('fb-counter');
                const prevBtn = document.getElementById('fb-prev');
                const nextBtn = document.getElementById('fb-next');
                if (!slidesEl) return;

                let current = 0;
                let startX = 0;

                // Create lightbox element
                const lb = document.createElement('div');
                lb.id = 'fb-lightbox';
                lb.className = 'fb-lightbox';
                lb.innerHTML = `
                    <button class="fb-lb-close" id="fb-lb-close" aria-label="Close">✕</button>
                    <button class="fb-lb-btn left" id="fb-lb-prev" aria-label="Previous">‹</button>
                    <button class="fb-lb-btn right" id="fb-lb-next" aria-label="Next">›</button>
                    <img id="fb-lb-img" src="" alt="Preview">
                `;
                document.body.appendChild(lb);
                const lbImg = document.getElementById('fb-lb-img');
                const lbClose = document.getElementById('fb-lb-close');
                const lbPrev = document.getElementById('fb-lb-prev');
                const lbNext = document.getElementById('fb-lb-next');

                imgs.forEach((src, i) => {
                    const img = document.createElement('img');
                    img.src = src;
                    img.alt = `Інструкція ${i+1}`;
                    img.dataset.index = i;
                    img.draggable = false;
                    img.style.cursor = 'pointer';
                    img.style.userSelect = 'none';
                    if (i === 0) img.classList.add('active');
                    // Open lightbox on image click
                    img.addEventListener('click', (e) => {
                        console.log('per-image click handler', i, src, e.type, e.pointerType);
                        e.stopPropagation();
                        lbImg.src = src;
                        lb.classList.add('open');
                    });
                    slidesEl.appendChild(img);
                });

                // Delegated click handler as a fallback (more robust)
                slidesEl.addEventListener('click', (e) => {
                    const target = e.target;
                    let img = (target && target.tagName === 'IMG') ? target : (target && target.closest ? target.closest('img') : null);
                    // If pointer capture or other behavior changed the event target, fall back to elementFromPoint
                    if (!img) {
                        try {
                            const el = document.elementFromPoint(e.clientX, e.clientY);
                            img = el && el.tagName === 'IMG' ? el : (el && el.closest ? el.closest('img') : null);
                        } catch (err) { /* ignore */ }
                    }
                    console.log('delegated click', {targetTag: target && target.tagName, foundImg: img && img.dataset && img.dataset.index});
                    if (img && img.dataset && typeof img.dataset.index !== 'undefined') {
                        lbImg.src = img.src;
                        lb.classList.add('open');
                    }
                });

                // Pointerup handler to improve desktop mouse compatibility
                slidesEl.addEventListener('pointerup', (e) => {
                    const target = e.target;
                    let img = (target && target.tagName === 'IMG') ? target : (target && target.closest ? target.closest('img') : null);
                    if (!img) {
                        try {
                            const el = document.elementFromPoint(e.clientX, e.clientY);
                            img = el && el.tagName === 'IMG' ? el : (el && el.closest ? el.closest('img') : null);
                        } catch (err) { /* ignore */ }
                    }
                    console.log('pointerup on slides', {targetTag: target && target.tagName, foundImgIndex: img && img.dataset && img.dataset.index, pointerType: e.pointerType});
                    if (img && img.dataset && typeof img.dataset.index !== 'undefined') {
                        lbImg.src = img.src;
                        lb.classList.add('open');
                    }
                });

                function show(index){
                    const total = imgs.length;
                    if (index < 0) index = total - 1;
                    if (index >= total) index = 0;
                    current = index;
                    slidesEl.querySelectorAll('img').forEach(img => {
                        img.classList.toggle('active', Number(img.dataset.index) === current);
                    });
                    counterEl.textContent = `${current+1} / ${total}`;
                }

                function next(){ show(current+1); }
                function prev(){ show(current-1); }

                prevBtn.addEventListener('click', prev);
                nextBtn.addEventListener('click', next);

                document.addEventListener('keydown', (e) => {
                    // If the lightbox is open, let the lightbox-specific handler manage navigation
                    if (lb && lb.classList.contains('open')) return;
                    if (e.key === 'ArrowLeft') prev();
                    if (e.key === 'ArrowRight') next();
                });

                slidesEl.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, {passive:true});
                slidesEl.addEventListener('touchend', (e) => {
                    const endX = (e.changedTouches && e.changedTouches[0].clientX) || 0;
                    const dx = endX - startX;
                    if (Math.abs(dx) > 40) {
                        if (dx < 0) next(); else prev();
                    }
                });

                slidesEl.addEventListener('pointerdown', (e) => { startX = e.clientX; slidesEl.setPointerCapture?.(e.pointerId); });
                slidesEl.addEventListener('pointerup', (e) => { const endX = e.clientX || 0; const dx = endX - startX; if (Math.abs(dx) > 40) { if (dx < 0) next(); else prev(); } });

                // Remove global click-to-next; images open in lightbox. Close handlers for lightbox:
                lbClose.addEventListener('click', () => lb.classList.remove('open'));
                lb.addEventListener('click', (e) => { if (e.target === lb) lb.classList.remove('open'); });

                // Lightbox navigation buttons
                lbPrev.addEventListener('click', (e) => { e.stopPropagation(); show(current-1); lbImg.src = imgs[current]; });
                lbNext.addEventListener('click', (e) => { e.stopPropagation(); show(current+1); lbImg.src = imgs[current]; });

                // Keyboard: close + nav when lightbox open
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        if (lb.classList.contains('open')) lb.classList.remove('open');
                    }
                    if (e.key === 'ArrowLeft') {
                        if (lb.classList.contains('open')) { show(current-1); lbImg.src = imgs[current]; } else prev();
                    }
                    if (e.key === 'ArrowRight') {
                        if (lb.classList.contains('open')) { show(current+1); lbImg.src = imgs[current]; } else next();
                    }
                });

                show(0);
            } catch (err) {
                // swallow errors for fallback view
                console.warn('Carousel init failed', err);
            }
        })();

        return;
    }

    // Далі ініціалізується основний додаток
    initApp();
});

function initApp() {
    // Ваш основний код для завантаження даних і відображення інтерфейсу
    // ...existing code...
}
