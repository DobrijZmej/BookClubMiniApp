// Main App Module
(async function() {
    console.log('📱 Telegram Mini App Starting...');
    console.log('Telegram SDK version:', tg.version);
    console.log('initData:', tg.initData ? 'present' : 'MISSING');
    console.log('initDataUnsafe:', tg.initDataUnsafe);
    
    // Ініціалізація Telegram Web App
    tg.ready();
    tg.expand();
    applyTelegramTheme();
    
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
        chatId = 'default_chat';
        console.warn('⚠️ No Telegram user data! Using fallback chat_id. Make sure to open this app through Telegram bot.');
    }
    
    CONFIG.CHAT_ID = chatId;
    
    console.log('Chat ID:', CONFIG.CHAT_ID);
    console.log('Chat Type:', tg.initDataUnsafe.chat_type || 'private');
    console.log('User:', tg.initDataUnsafe.user);
    console.log('Chat:', tg.initDataUnsafe.chat);
    
    // Відображаємо username в header
    if (tg.initDataUnsafe.user) {
        const username = tg.initDataUnsafe.user.username || 
                        tg.initDataUnsafe.user.first_name || 
                        'Користувач';
        document.getElementById('username').textContent = `@${username}`;
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
        if (document.getElementById('club-detail-view').classList.contains('active')) {
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
            document.getElementById('header-title').textContent = '📚 Мої клуби';
            document.getElementById('back-button').style.display = 'none';
        }
    });
    
    // Кнопки на головній сторінці клубів
    document.getElementById('create-new-club-btn').addEventListener('click', () => {
        tg.HapticFeedback.impactOccurred('medium');
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('create-club-view').classList.add('active');
        document.getElementById('header-title').textContent = 'Створити клуб';
        document.getElementById('back-button').style.display = 'block';
    });
    
    document.getElementById('join-existing-club-btn').addEventListener('click', () => {
        tg.HapticFeedback.impactOccurred('medium');
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('join-club-view').classList.add('active');
        document.getElementById('header-title').textContent = 'Приєднатися до клубу';
        document.getElementById('back-button').style.display = 'block';
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
            
            await API.books.create({
                title,
                author,
                description,
                club_id: ClubsUI.currentClubId
            });
            
            // Очищуємо форму
            document.getElementById('add-book-form').reset();
            
            // Повертаємось до списку книг клубу
            document.getElementById('add-book-view').classList.remove('active');
            document.getElementById('club-detail-view').classList.add('active');
            
            // Перезавантажуємо книги
            await UI.loadBooks(ClubsUI.currentClubId);
            
        } catch (error) {
            console.error('Error creating book:', error);
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
    
    // Форма створення клубу
    document.getElementById('create-club-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('club-name').value.trim();
        const description = document.getElementById('club-description').value.trim();
        const isPublic = document.getElementById('club-is-public').checked;
        
        if (!name) {
            alert('Введіть назву клубу');
            return;
        }
        
        try {
            tg.HapticFeedback.impactOccurred('medium');
            UI.setLoading(true);
            
            const club = await API.clubs.create({
                name,
                description,
                is_public: isPublic
            });
            
            // Очищуємо форму
            document.getElementById('create-club-form').reset();
            
            // Повертаємося до списку і перезавантажуємо
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('clubs-list-view').classList.add('active');
            document.getElementById('header-title').textContent = '📚 Мої клуби';
            document.getElementById('back-button').style.display = 'none';
            
            await ClubsUI.loadMyClubs();
            
            // Показуємо код запрошення
            alert(`✅ Клуб "${club.name}" створено!\nКод запрошення: ${club.invite_code}`);
            
        } catch (error) {
            console.error('Error creating club:', error);
        } finally {
            UI.setLoading(false);
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
    
    // ===== Initial Load =====
    
    try {
        UI.setLoading(true);
        
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
