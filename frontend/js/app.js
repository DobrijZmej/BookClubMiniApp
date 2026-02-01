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
    
    // Close join club modal
    document.getElementById('close-join-club-modal')?.addEventListener('click', () => {
        document.getElementById('join-club-modal').classList.remove('active');
    });

    // Click outside to close join modal
    document.getElementById('join-club-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'join-club-modal') {
            document.getElementById('join-club-modal').classList.remove('active');
        }
    });
    
    // Close review modal
    document.getElementById('close-review-modal')?.addEventListener('click', () => {
        UIReviews.closeReviewModal();
    });

    // Click outside to close review modal
    document.getElementById('book-review-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'book-review-modal') {
            UIReviews.closeReviewModal();
        }
    });
    
    // Back button
    document.getElementById('back-button').addEventListener('click', () => {
        tg.HapticFeedback.impactOccurred('soft');
        
        // Перевірити поточний view
        if (document.getElementById('club-detail-view').classList.contains('active')) {
            ClubsUI.backToClubsList();
        } else if (document.getElementById('create-club-view').classList.contains('active')) {
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
        document.getElementById('join-club-modal').classList.add('active');
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
        document.getElementById('join-club-modal').classList.add('active');
    });
    
    document.getElementById('create-club-main-btn')?.addEventListener('click', () => {
        tg.HapticFeedback.impactOccurred('medium');
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('create-club-view').classList.add('active');
        document.getElementById('header-title').textContent = 'Створити клуб';
        document.getElementById('back-button').style.display = 'flex';
    });
    
    document.getElementById('requests-close-button')?.addEventListener('click', () => {
        tg.HapticFeedback.impactOccurred('soft');
        ClubsRequests.backToClubDetails();
    });

    // Закриття модального вікна заявок при кліку поза ним
    document.getElementById('club-requests-view')?.addEventListener('click', (e) => {
        if (e.target.id === 'club-requests-view') {
            tg.HapticFeedback.impactOccurred('soft');
            ClubsRequests.backToClubDetails();
        }
    });

    // Закриття модального вікна книги при кліку поза ним
    document.getElementById('add-book-view')?.addEventListener('click', (e) => {
        if (e.target.id === 'add-book-view') {
            tg.HapticFeedback.impactOccurred('soft');
            UIBookForm.backToClub();
        }
    });

    
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
    
    // Sort button and menu
    const sortButton = document.getElementById('sort-button');
    const sortMenu = document.getElementById('sort-menu');
    if (sortButton && sortMenu) {
        // Toggle menu
        sortButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = sortMenu.style.display === 'block';
            sortMenu.style.display = isVisible ? 'none' : 'block';
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!sortButton.contains(e.target) && !sortMenu.contains(e.target)) {
                sortMenu.style.display = 'none';
            }
        });
        
        // Handle sort option selection
        const sortMenuItems = document.querySelectorAll('.sort-menu-item');
        sortMenuItems.forEach(item => {
            item.addEventListener('click', () => {
                // Remove active class from all items
                sortMenuItems.forEach(i => i.classList.remove('active'));
                // Add active class to clicked item
                item.classList.add('active');
                // Close menu
                sortMenu.style.display = 'none';
                // Reload books
                if (ClubsUI.currentClubId) {
                    UI.loadBooks(ClubsUI.currentClubId);
                }
            });
        });
    }
    
    // View Mode Switcher (Books / Activity Feed)
    const viewModeButtons = document.querySelectorAll('.view-mode-button');
    viewModeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.dataset.mode;
            
            // Update active button
            viewModeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show/hide corresponding views
            if (mode === 'books') {
                document.getElementById('books-view').style.display = 'block';
                document.getElementById('activity-view').style.display = 'none';
            } else if (mode === 'activity') {
                document.getElementById('books-view').style.display = 'none';
                document.getElementById('activity-view').style.display = 'block';
                
                // Load activity feed if club is selected
                if (ClubsUI.currentClubId) {
                    UIActivity.loadActivity(ClubsUI.currentClubId);
                }
            }
            
            tg.HapticFeedback.impactOccurred('light');
        });
    });
    
    // Activity Filter Chips
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const eventType = chip.dataset.eventType;
            UIActivity.setEventTypeFilter(eventType);
            tg.HapticFeedback.impactOccurred('light');
        });
    });
    
    // Load More Activity Button
    const loadMoreButton = document.getElementById('load-more-activity');
    if (loadMoreButton) {
        loadMoreButton.addEventListener('click', () => {
            if (ClubsUI.currentClubId) {
                UIActivity.loadActivity(
                    ClubsUI.currentClubId, 
                    UIActivity.currentEventType, 
                    UIActivity.currentOffset
                );
            }
            tg.HapticFeedback.impactOccurred('light');
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
            
            // Закриваємо модальне вікно
            document.getElementById('join-club-modal').classList.remove('active');
            
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
                .community {
                    margin-top: 28px;
                    padding-top: 16px;
                    border-top: 1px solid rgba(148,163,184,0.15);
                    font-size: 14px;
                }
                .community-title {
                    margin-bottom: 10px;
                    font-size: 15px;
                    font-weight: 600;
                }
                .community-links {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                }
                .community-links a {
                    color: #22c55e;
                    text-decoration: none;
                    font-weight: 500;
                }
                .community-links a:hover {
                    text-decoration: underline;
                }

                /* Accordion styles */
                .accordion {
                    margin-bottom: 12px;
                }
                .accordion-header {
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 14px 16px;
                    background: #020617;
                    border: 1px solid rgba(148,163,184,0.15);
                    border-radius: 12px;
                    color: #e5e7eb;
                    font-size: 15px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: left;
                }
                .accordion-header:hover {
                    background: rgba(34,197,94,0.05);
                    border-color: rgba(34,197,94,0.3);
                }
                .accordion-icon {
                    transition: transform 0.2s ease;
                    font-size: 12px;
                }
                .accordion-header.active .accordion-icon {
                    transform: rotate(180deg);
                }
                .accordion-content {
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.3s ease;
                }
                .accordion-content.open {
                    max-height: 500px;
                }
                .guide-steps {
                    margin: 16px 0 12px;
                    padding: 16px 20px 16px 32px;
                    background: rgba(2,6,23,0.5);
                    border-radius: 8px;
                    line-height: 1.6;
                }
                .guide-steps li {
                    margin-bottom: 10px;
                    color: #e5e7eb;
                }
                .guide-steps li:last-child {
                    margin-bottom: 0;
                }
                .guide-tip {
                    margin: 12px 0 16px;
                    padding: 12px;
                    background: rgba(34,197,94,0.08);
                    border: 1px solid rgba(34,197,94,0.2);
                    border-radius: 8px;
                    font-size: 14px;
                    line-height: 1.5;
                    color: #e5e7eb;
                }
                .guide-tip b {
                    color: #22c55e;
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
                <div style="text-align:center; margin-bottom: 16px;">
                    <img src="images/onboarding_cover.png" alt="Бібліотекар клубу" 
                         style="max-width: 220px; width: 100%; height: auto; border-radius: 12px;">
                </div>
                
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
                        <li>Створювати приватні книжкові клуби з запрошеннями</li>
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

                <div class="section">
                    <h2>Як це працює</h2>
                    
                    <div class="accordion">
                        <button class="accordion-header" onclick="toggleAccordion('create-guide')">
                            <span>➕ Створити свій клуб</span>
                            <span class="accordion-icon">▼</span>
                        </button>
                        <div class="accordion-content" id="create-guide">
                            <ol class="guide-steps">
                                <li>Натисніть <b>"Створити клуб"</b> на головному екрані</li>
                                <li>Введіть назву клубу та опис (опціонально)</li>
                                <li>Додайте обкладинку клубу (за бажанням)</li>
                                <li>Отримаєте <b>код запрошення</b> для друзів</li>
                                <li>Почніть додавати свої книги до бібліотеки</li>
                                <li>Поділіться кодом з тими, кого хочете запросити</li>
                            </ol>
                            <div class="guide-tip">
                                💡 <b>Порада:</b> Як власник, ви можете призначати адміністраторів та керувати заявками на вступ.
                            </div>
                        </div>
                    </div>

                    <div class="accordion">
                        <button class="accordion-header" onclick="toggleAccordion('join-guide')">
                            <span>🔑 Приєднатися до клубу</span>
                            <span class="accordion-icon">▼</span>
                        </button>
                        <div class="accordion-content" id="join-guide">
                            <ol class="guide-steps">
                                <li>Отримайте <b>код запрошення</b> від адміністратора клубу</li>
                                <li>Натисніть <b>"Приєднатися до клубу"</b> на головному екрані</li>
                                <li>Введіть код запрошення</li>
                                <li>Додайте коментар до заявки (за бажанням)</li>
                                <li>Дочекайтеся схвалення від адміністратора</li>
                                <li>Після схвалення можете додавати книги та брати їх у інших</li>
                            </ol>
                            <div class="guide-tip">
                                💡 <b>Порада:</b> Коли берете книгу, одразу напишіть власнику в Telegram щоб домовитись про передачу.
                            </div>
                        </div>
                    </div>
                </div>

                <div class="community">
                    <div class="community-title">Спільнота і підтримка</div>
                    <div class="community-links">
                        <a href="https://t.me/my_book_club_app" target="_blank">📰 Новини</a>
                        <a href="https://t.me/+7t2mLMB7ovY5MWNi" target="_blank">💬 Обговорення</a>
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

        // Accordion toggle function
        window.toggleAccordion = function(id) {
            const content = document.getElementById(id);
            const header = content.previousElementSibling;
            
            if (content.classList.contains('open')) {
                content.classList.remove('open');
                header.classList.remove('active');
            } else {
                content.classList.add('open');
                header.classList.add('active');
            }
        };

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
