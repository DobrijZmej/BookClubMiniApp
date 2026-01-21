// UI Module - відповідає за рендеринг інтерфейсу
const UI = {
    /**
     * Показати/сховати loader
     */
    setLoading(isLoading) {
        document.getElementById('loader').style.display = isLoading ? 'flex' : 'none';
        document.getElementById('app').style.display = isLoading ? 'none' : 'block';
    },

    /**
     * Переключити view
     */
    switchView(viewName) {
        // Ховаємо всі views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        
        // Показуємо вибраний view
        document.getElementById(`${viewName}-view`).classList.add('active');
        
        // Оновлюємо активний таб
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
        
        // Показуємо/ховаємо search bar
        document.getElementById('search-bar').style.display = 
            viewName === 'library' ? 'flex' : 'none';
    },

    /**
     * Рендер списку книг
     */
    renderBooks(books) {
        const container = document.getElementById('books-container');
        const emptyState = document.getElementById('empty-state');
        
        // ДІАГНОСТИКА
        alert(`renderBooks: отримано ${books ? books.length : 0} книг`);
        
        if (!books || books.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        container.innerHTML = books.map(book => {
            const statusIcon = book.status === 'available' ? '🟢' : '🔴';
            const isOwner = book.owner_id === String(tg.initDataUnsafe.user?.id);
            
            return `
                <div class="book-card" data-book-id="${book.id}">
                    <div class="book-card-header">
                        <div>
                            <div class="book-title">${this.escapeHtml(book.title)}</div>
                            <div class="book-author">${this.escapeHtml(book.author)}</div>
                        </div>
                        <span class="book-status">${statusIcon}</span>
                    </div>
                    
                    <div class="book-owner">
                        Додав: @${this.escapeHtml(book.owner_username || 'невідомо')}
                    </div>
                    
                    <div class="book-actions">
                        <button class="btn-small btn-details" onclick="UI.showBookDetails(${book.id})">
                            Деталі
                        </button>
                        
                        ${book.status === 'available' 
                            ? `<button class="btn-small btn-borrow" onclick="UI.borrowBook(${book.id})">
                                Взяти
                               </button>`
                            : book.status === 'reading' && !isOwner
                                ? `<button class="btn-small btn-details" disabled>
                                    Зайнято
                                   </button>`
                                : ''
                        }
                        
                        ${book.status === 'reading' && isOwner
                            ? `<button class="btn-small btn-return" onclick="UI.returnBook(${book.id})">
                                Повернути
                               </button>`
                            : ''
                        }
                        
                        ${isOwner
                            ? `<button class="btn-small btn-delete" onclick="UI.deleteBook(${book.id})">
                                ❌
                               </button>`
                            : ''
                        }
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Показати деталі книги в модальному вікні
     */
    async showBookDetails(bookId) {
        try {
            tg.HapticFeedback.impactOccurred('light');
            
            const book = await API.books.getDetails(CONFIG.CHAT_ID, bookId);
            const modal = document.getElementById('book-modal');
            const modalBody = document.getElementById('modal-body');
            
            modalBody.innerHTML = `
                <div class="modal-title">${this.escapeHtml(book.title)}</div>
                
                <div style="margin-bottom: 16px;">
                    <strong>Автор:</strong> ${this.escapeHtml(book.author)}<br>
                    <strong>Додав:</strong> @${this.escapeHtml(book.owner_username || 'невідомо')}<br>
                    <strong>Статус:</strong> ${book.status === 'available' ? '🟢 Доступна' : '🔴 Позичена'}
                </div>
                
                ${book.description 
                    ? `<div style="margin-bottom: 16px;">
                        <strong>Опис:</strong><br>
                        ${this.escapeHtml(book.description)}
                       </div>`
                    : ''
                }
                
                <div>
                    <strong>Історія читання:</strong>
                    ${book.loans && book.loans.length > 0
                        ? book.loans.map(loan => `
                            <div class="history-item">
                                <div class="history-item-header">
                                    <span class="history-username">@${this.escapeHtml(loan.username)}</span>
                                    <span class="history-status">${loan.status === 'reading' ? '📖 Читає' : '✅ Повернув'}</span>
                                </div>
                                <div class="history-date">
                                    ${new Date(loan.borrowed_at).toLocaleDateString('uk-UA', { 
                                        day: '2-digit', 
                                        month: '2-digit', 
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        `).join('')
                        : '<p style="color: var(--tg-theme-hint-color); text-align: center; padding: 20px;">Історія порожня</p>'
                    }
                </div>
            `;
            
            modal.classList.add('active');
        } catch (error) {
            console.error('Error showing book details:', error);
        }
    },

    /**
     * Позичити книгу
     */
    async borrowBook(bookId) {
        try {
            tg.HapticFeedback.impactOccurred('medium');
            
            await API.books.borrow(bookId, CONFIG.CHAT_ID);
            tg.showAlert('✅ Книгу успішно позичено!');
            
            // Оновлюємо список
            await this.loadBooks();
        } catch (error) {
            console.error('Error borrowing book:', error);
        }
    },

    /**
     * Повернути книгу
     */
    async returnBook(bookId) {
        try {
            tg.HapticFeedback.impactOccurred('medium');
            
            await API.books.return(bookId);
            tg.showAlert('✅ Книгу повернено!');
            
            // Оновлюємо список
            await this.loadBooks();
        } catch (error) {
            console.error('Error returning book:', error);
        }
    },

    /**
     * Видалити книгу
     */
    async deleteBook(bookId) {
        tg.showConfirm('Видалити цю книгу?', async (confirmed) => {
            if (confirmed) {
                try {
                    tg.HapticFeedback.impactOccurred('heavy');
                    
                    await API.books.delete(bookId);
                    tg.showAlert('✅ Книгу видалено');
                    
                    // Оновлюємо список
                    await this.loadBooks();
                } catch (error) {
                    console.error('Error deleting book:', error);
                }
            }
        });
    },

    /**
     * Завантаження та відображення книг
     * @param {number} clubId - ID клубу
     */
    async loadBooks(clubId) {
        try {
            const status = document.getElementById('filter-status').value;
            const search = document.getElementById('search-input').value;
            
            // ДІАГНОСТИКА
            alert(`Завантажуємо книги для клубу ID: ${clubId}`);
            
            const books = await API.books.getAll(clubId, { status, search });
            
            // ДІАГНОСТИКА
            alert(`Отримано ${books.length} книг\nПерша книга: ${books[0] ? JSON.stringify(books[0]).substring(0, 150) : 'немає'}`);
            
            this.renderBooks(books);
        } catch (error) {
            console.error('Error loading books:', error);
            alert(`Помилка завантаження книг: ${error.message}`);
        }
    },

    /**
     * Рендер профілю
     */
    async renderProfile() {
        try {
            const profile = await API.user.getProfile();
            const stats = await API.user.getStats(CONFIG.CHAT_ID);
            
            // Ініціали
            const initials = profile.first_name.charAt(0).toUpperCase();
            document.getElementById('profile-initials').textContent = initials;
            
            // Ім'я
            const fullName = `${profile.first_name} ${profile.last_name || ''}`.trim();
            document.getElementById('profile-name').textContent = fullName;
            
            // Username
            const username = profile.username ? `@${profile.username}` : 'Без username';
            document.getElementById('profile-username').textContent = username;
            
            // Статистика
            document.getElementById('stat-added').textContent = stats.books_added;
            document.getElementById('stat-read').textContent = stats.books_read;
            document.getElementById('stat-reading').textContent = stats.currently_reading;
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    },

    /**
     * Закрити модальне вікно
     */
    closeModal() {
        document.getElementById('book-modal').classList.remove('active');
    },

    /**
     * Escape HTML для безпеки
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Експорт
window.UI = UI;
