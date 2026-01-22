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
            ClubsUI.backToClubDetails();
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
            tg.HapticFeedback.impactOccurred('medium');
            if (ClubsUI.currentClubId) {
                // Зберігаємо поточну назву клубу
                const currentClubName = document.getElementById('header-title').textContent;
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                document.getElementById('add-book-view').classList.add('active');
                document.getElementById('header-title').textContent = 'Додати книгу';
                document.getElementById('header-title').dataset.previousTitle = currentClubName;
                document.getElementById('back-button').style.display = 'flex';
            } else {
                tg.showAlert('Оберіть клуб спочатку');
            }
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
    
    const filterStatus = document.getElementById('filter-status');
    if (filterStatus) {
        filterStatus.addEventListener('change', () => {
            if (ClubsUI.currentClubId) {
                UI.loadBooks(ClubsUI.currentClubId);
            }
        });
    }
    
    // Форма додавання книги
    document.getElementById('add-book-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!ClubsUI.currentClubId) {
            console.error('No active club selected');
            return;
        }
        
        const form = e.target;
        const editingBookId = form.dataset.editingBookId;
        
        const title = document.getElementById('book-title').value.trim();
        const author = document.getElementById('book-author').value.trim() || 'Невідомий автор';
        const description = document.getElementById('book-description').value.trim();
        
        if (!title) {
            alert('Введіть назву книги');
            return;
        }
        
        try {
            tg.HapticFeedback.impactOccurred('medium');
            UI.setLoading(true);
            
            if (editingBookId) {
                // Редагування існуючої книги
                await API.books.update(editingBookId, {
                    title,
                    author,
                    description
                });
                tg.showAlert('✅ Книгу оновлено');
                delete form.dataset.editingBookId;
            } else {
                // Створення нової книги
                await API.books.create({
                    title,
                    author,
                    description,
                    club_id: ClubsUI.currentClubId
                });
                tg.showAlert('✅ Книгу додано');
            }
            
            // Очищуємо форму
            form.reset();
            
            // Повертаємо текст кнопки
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Додати книгу';
            }
            
            // Повертаємось до списку книг клубу
            document.getElementById('add-book-view').classList.remove('active');
            document.getElementById('club-detail-view').classList.add('active');
            
            // Відновлюємо заголовок
            const previousTitle = document.getElementById('header-title').dataset.previousTitle;
            if (previousTitle) {
                document.getElementById('header-title').textContent = previousTitle;
            }
            
            // Перезавантажуємо книги
            await UI.loadBooks(ClubsUI.currentClubId);
            
        } catch (error) {
            console.error('Error saving book:', error);
            tg.showAlert('❌ Помилка збереження книги');
        } finally {
            UI.setLoading(false);
        }
    });
    
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
            
            // Повертаємось до списку
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('clubs-list-view').classList.add('active');
            document.getElementById('header-title').textContent = '📚 Мої клуби';
            document.getElementById('back-button').style.display = 'none';
            
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
