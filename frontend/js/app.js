// Main App Module
(async function() {
    console.log('📱 Telegram Mini App Starting...');
    
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
        tg.showAlert('Не вдається підключитися до сервера');
    }
    
    // ===== Event Listeners =====
    
    // Переключення табів
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', async (e) => {
            const viewName = e.currentTarget.getAttribute('data-view');
            tg.HapticFeedback.impactOccurred('soft');
            UI.switchView(viewName);
            
            // Завантажуємо дані для view
            if (viewName === 'library') {
                await UI.loadBooks();
            } else if (viewName === 'clubs') {
                await ClubsUI.loadClubs();
            }
        });
    });
    
    // Пошук і фільтри
    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            UI.loadBooks();
        }, 300); // Debounce 300ms
    });
    
    document.getElementById('filter-status').addEventListener('change', () => {
        UI.loadBooks();
    });
    
    // Форма додавання книги
    document.getElementById('add-book-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('book-title').value.trim();
        const author = document.getElementById('book-author').value.trim() || 'Невідомий автор';
        const description = document.getElementById('book-description').value.trim();
        
        if (!title) {
            tg.showAlert('Введіть назву книги');
            return;
        }
        
        try {
            tg.HapticFeedback.impactOccurred('medium');
            UI.setLoading(true);
            
            await API.books.create({
                title,
                author,
                description,
                chat_id: CONFIG.CHAT_ID
            });
            
            // Очищуємо форму
            document.getElementById('add-book-form').reset();
            
            // Показуємо повідомлення
            tg.showAlert('✅ Книгу додано!');
            
            // Переключаємось на бібліотеку
            UI.switchView('library');
            await UI.loadBooks();
            
        } catch (error) {
            console.error('Error adding book:', error);
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
    
    // Закриття модального вікна клубу
    document.getElementById('close-club-modal').addEventListener('click', () => {
        ClubsUI.closeClubModal();
    });
    
    document.getElementById('club-modal').addEventListener('click', (e) => {
        if (e.target.id === 'club-modal') {
            ClubsUI.closeClubModal();
        }
    });
    
    // Кнопка "Створити клуб"
    document.getElementById('create-club-btn').addEventListener('click', () => {
        console.log('Create club button clicked');
        document.getElementById('clubs-list-container').style.display = 'none';
        document.getElementById('create-club-form-container').style.display = 'block';
        document.getElementById('join-club-container').style.display = 'none';
    });
    
    // Кнопка "Скасувати створення клубу"
    document.getElementById('cancel-create-club-btn').addEventListener('click', () => {
        document.getElementById('clubs-list-container').style.display = 'block';
        document.getElementById('create-club-form-container').style.display = 'none';
        document.getElementById('join-club-container').style.display = 'block';
        document.getElementById('create-club-form').reset();
    });
    
    // Форма створення клубу
    document.getElementById('create-club-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('club-name').value.trim();
        const description = document.getElementById('club-description').value.trim();
        const isPublic = document.getElementById('club-is-public').checked;
        
        if (!name) {
            tg.showAlert('Введіть назву клубу');
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
            
            // Показуємо повідомлення
            tg.showAlert(`✅ Клуб "${club.name}" створено!\nКод: ${club.invite_code}`);
            
            // Повертаємось до списку
            document.getElementById('clubs-list-container').style.display = 'block';
            document.getElementById('create-club-form-container').style.display = 'none';
            document.getElementById('join-club-container').style.display = 'block';
            
            // Перезавантажуємо список клубів
            await ClubsUI.loadClubs();
            
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
            tg.showAlert('Введіть код запрошення');
            return;
        }
        
        try {
            tg.HapticFeedback.impactOccurred('medium');
            UI.setLoading(true);
            
            await API.clubs.requestJoin(inviteCode, message);
            
            // Очищуємо форму
            document.getElementById('join-club-form').reset();
            
            // Показуємо повідомлення
            tg.showAlert('✅ Запит надіслано! Очікуйте схвалення від адміністратора');
            
        } catch (error) {
            console.error('Error joining club:', error);
        } finally {
            UI.setLoading(false);
        }
    });
    });
    
    // Back button у Telegram
    tg.BackButton.onClick(() => {
        const activeView = document.querySelector('.view.active').id;
        
        if (activeView === 'library-view') {
            tg.close();
        } else {
            UI.switchView('library');
            UI.loadBooks();
        }
    });
    
    // Показуємо Back button коли не на головній
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const viewName = tab.getAttribute('data-view');
            if (viewName === 'library') {
                tg.BackButton.hide();
            } else {
                tg.BackButton.show();
            }
        });
    });
    
    // ===== Initial Load =====
    
    try {
        UI.setLoading(true);
        
        // Завантажуємо бібліотеку (початковий view)
        await UI.loadBooks();
        
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
