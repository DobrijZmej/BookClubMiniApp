// UI Books Module - Робота з книгами
const UIBooks = {

    _requestSeq: 0,

    /**
     * Завантаження та відображення книг
     * @param {number} clubId - ID клубу
     */
    async loadBooks(clubId) {
        try {

            const seq = ++this._requestSeq;
            this.clearBooksList();
            this.setBooksLoading(true);
                        
            const sortBySelect = document.getElementById('sort-by');
            const searchInput = document.getElementById('search-input');
            
            const sort_by = sortBySelect ? sortBySelect.value : '';
            const search = searchInput ? searchInput.value : '';
            
            console.log(`Loading books for club ${clubId}, sort_by: ${sort_by}, search: ${search}`);
            
            const books = await API.books.getAll(clubId, { sort_by, search });

            // якщо за час запиту користувач відкрив інший клуб — ігноруємо цей результат
            if (seq !== this._requestSeq) return;            
            
            console.log(`Received ${books.length} books:`, books);
            
            this.renderBooks(books);
        } catch (error) {
            console.error('Error loading books:', error);
            if (tg.showAlert) {
                tg.showAlert(`Помилка: ${error.message.substring(0, 100)}`);
            }
        }
    },

    /**
     * Рендер списку книг
     */
    renderBooks(books) {
        const container = document.getElementById('books-container');
        const emptyState = document.getElementById('empty-state');
        
        console.log(`renderBooks: ${books ? books.length : 0} books`);
        
        if (!books || books.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        container.innerHTML = books.map(book => {
            const isAvailable = (book.status === 'available' || book.status === 'AVAILABLE');
            const statusText = isAvailable ? 'Доступна' : 'Читається';
            const statusClass = isAvailable ? 'available' : 'reading';
            
            // Рейтинг (якщо є відгуки)
            const rating = book.average_rating || 0;
            const readersCount = book.readers_count || 0;
            
            // Перевірка прав власника
            const currentUserId = tg.initDataUnsafe?.user?.id?.toString();
            const isOwner = book.owner_id === currentUserId;
            const isReader = book.current_reader_id === currentUserId;
            
            return `
                <div class="book-card" data-book-id="${book.id}">
                <div class="book-avatar" onclick="UIBooks.showBookDetails(${book.id})">
                <img
                    class="book-cover"
                    src="${UIBooks.getBookCoverUrl(book)}"
                    alt="Обкладинка книги"
                    loading="lazy"
                    onerror="this.onerror=null; this.src='${UIBooks.getDefaultBookCoverUrl()}';"
                />
                </div>
                    <div class="book-info" onclick="UIBooks.showBookDetails(${book.id})">
                        <div class="book-title">${UIUtils.escapeHtml(book.title)}</div>
                        <div class="book-author">${UIUtils.escapeHtml(book.author || 'Невідомий автор')}</div>
                        <div class="book-readers">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                            <span>${readersCount} ${UIUtils.getPluralForm(readersCount, 'читач', 'читачі', 'читачів')}</span>
                        </div>
                    </div>
                    <div class="book-status-col">
                        ${rating > 0 ? `
                            <div class="book-rating">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                                <span>${rating.toFixed(1)}</span>
                            </div>
                        ` : ''}
                        <span class="book-status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="book-actions">
                        ${isAvailable && !isOwner ? `
                            <button class="book-action-btn" onclick="event.stopPropagation(); UIBooks.borrowBook(${book.id})" title="Взяти книгу">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                                    <path d="M12 8v8M8 12h8"/>
                                </svg>
                            </button>
                        ` : ''}
                        ${isReader ? `
                            <button class="book-action-btn" onclick="event.stopPropagation(); UIBooks.returnBook(${book.id})" title="Повернути книгу">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                    <polyline points="9 22 9 12 15 12 15 22"/>
                                </svg>
                            </button>
                        ` : ''}
                        <button class="book-action-btn" onclick="event.stopPropagation(); UIReviews.showBookReview(${book.id})" title="Оцінити книгу">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                        </button>
                        ${isOwner ? `
                            <button class="book-action-btn" onclick="event.stopPropagation(); UIBooks.editBook(${book.id})" title="Редагувати">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            </button>
                            <button class="book-action-btn danger" onclick="event.stopPropagation(); UIBooks.deleteBook(${book.id})" title="Видалити">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    getDefaultBookCoverUrl() {
        return '/images/book_default_cover.png';
    },

    getBookCoverUrl(book) {
        const fallback = UIBooks.getDefaultBookCoverUrl();
        const url = (book?.cover_url || '').trim();
        return url ? url : fallback;
    },

    clearBooksList() {
        const container = document.getElementById('books-container');
        const emptyState = document.getElementById('empty-state');
        if (container) container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'none';
    },

    setBooksLoading(isLoading) {
        const container = document.getElementById('books-container');
        const emptyState = document.getElementById('empty-state');
        if (!container) return;

        if (isLoading) {
            if (emptyState) emptyState.style.display = 'none';
            container.innerHTML = `
            <div class="books-loading" style="padding: 16px; color: var(--color-text-secondary);">
                Завантажую книги…
            </div>
            `;
        }
    },
    /**
     * Показати деталі книги в модальному вікні
     */
    async showBookDetails(bookId) {
        try {
            console.log('📖 Показую деталі книги:', bookId);
            tg.HapticFeedback.impactOccurred('light');
            
            const book = await API.books.getDetails(bookId);
            console.log('📚 Отримані дані книги:', book);
            
            const modal = document.getElementById('book-modal');
            const modalBody = document.getElementById('modal-body');
            
            if (!modal || !modalBody) {
                console.error('❌ Modal elements not found!');
                return;
            }
            
            // Визначаємо права користувача
            const currentUserId = tg.initDataUnsafe?.user?.id?.toString();
            const isOwner = book.owner_id === currentUserId;
            const isReader = book.current_reader_id === currentUserId;
            const isAvailable = (book.status === 'available' || book.status === 'AVAILABLE');

            // Завантажити відгуки
            let reviewsHtml = '';
            try {
                const reviews = await API.books.getReviews(bookId);
                console.log('📝 Отримано відгуки:', reviews);
                
                if (reviews && reviews.length > 0) {
                    // Розрахувати середній рейтинг
                    const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
                    const avgStars = UIUtils.generateStarRating(avgRating);
                    
                    reviewsHtml = `
                        <div style="margin-top: 16px;">
                            <strong>⭐ Відгуки:</strong>
                            <div class="reviews-stats">
                                <div class="avg-rating">
                                    <span class="avg-stars">${avgStars}</span>
                                    <span class="avg-number">${avgRating.toFixed(1)} з 5</span>
                                    <span class="reviews-count">(${reviews.length} ${UIUtils.getPluralForm(reviews.length, 'відгук', 'відгуки', 'відгуків')})</span>
                                </div>
                            </div>
                            ${reviews.map(review => {
                                const stars = UIUtils.generateStarRating(review.rating);
                                const date = new Date(review.created_at).toLocaleDateString('uk-UA');
                                
                                return `
                                    <div class="review-item">
                                        <div class="review-header">
                                            <span class="review-user">👤 ${UIUtils.escapeHtml(review.user_name || review.username || 'Анонім')}</span>
                                            <span class="review-date">${date}</span>
                                        </div>
                                        <div class="review-rating">${stars}</div>
                                        ${review.comment ? `<div class="review-comment">${UIUtils.escapeHtml(review.comment)}</div>` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `;
                } else {
                    reviewsHtml = `
                        <div style="margin-top: 16px;">
                            <strong>⭐ Відгуки:</strong>
                            <div style="text-align: center; padding: 20px; color: var(--tg-theme-hint-color); background: rgba(128, 128, 128, 0.1); border-radius: 8px; margin-top: 8px;">
                                📝 Ще немає відгуків
                            </div>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Помилка завантаження відгуків:', error);
                reviewsHtml = '<div style="margin-top: 16px;"><strong>⭐ Відгуки:</strong><div style="text-align: center; padding: 20px; color: var(--tg-theme-hint-color);">❌ Помилка завантаження відгуків</div></div>';
            }
            
            modalBody.innerHTML = `
                <div class="modal-title">${UIUtils.escapeHtml(book.title)}</div>
                
                <div style="margin-bottom: 16px;">
                    <strong>Автор:</strong> ${UIUtils.escapeHtml(book.author)}<br>
                    <strong>Додав:</strong> @${UIUtils.escapeHtml(book.owner_username || 'невідомо')}<br>
                    <strong>Статус:</strong> ${book.status === 'AVAILABLE' ? '🟢 Доступна' : '🔴 Позичена'}
                </div>
                
                ${book.description 
                    ? `<div style="margin-bottom: 16px;">
                        <strong>Опис:</strong><br>
                        ${UIUtils.escapeHtml(book.description)}
                       </div>`
                    : ''
                }
                
                <div>
                    <strong>📅 Хронологія:</strong>
                    <div style="background: rgba(6, 182, 212, 0.1); border-radius: 8px; padding: 12px; margin-top: 8px;">
                        <div class="history-item">
                            <div class="history-item-header">
                                <span class="history-username">@${UIUtils.escapeHtml(book.owner_username || 'невідомо')}</span>
                                <span class="history-status">📚 Створив книгу</span>
                            </div>
                            <div class="history-date">
                                ${new Date(book.created_at).toLocaleDateString('uk-UA', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                        </div>
                    </div>
                    
                    ${book.loans && book.loans.length > 0
                        ? `<div style="margin-top: 12px;">
                            <strong>📖 Історія читання:</strong>
                            ${book.loans.map(loan => `
                                <div class="history-item" style="background: rgba(16, 185, 129, 0.1); border-radius: 8px; padding: 8px; margin-top: 8px;">
                                    <div class="history-item-header">
                                        <span class="history-username">@${UIUtils.escapeHtml(loan.username)}</span>
                                        <span class="history-status">${loan.status === 'READING' ? '📖 Читає' : '✅ Повернув'}</span>
                                    </div>
                                    <div class="history-date">
                                        Взяв: ${new Date(loan.borrowed_at).toLocaleDateString('uk-UA', { 
                                            day: '2-digit', 
                                            month: '2-digit', 
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                        ${loan.returned_at ? `<br>Повернув: ${new Date(loan.returned_at).toLocaleDateString('uk-UA', { 
                                            day: '2-digit', 
                                            month: '2-digit', 
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}` : ''}
                                    </div>
                                </div>
                            `).join('')}
                           </div>`
                        : '<div style="margin-top: 12px; color: var(--tg-theme-hint-color); text-align: center; padding: 20px; background: rgba(128, 128, 128, 0.1); border-radius: 8px;">📖 Ще ніхто не читав цю книгу</div>'
                    }
                </div>
                
                <div class="book-modal-actions" style="margin-top: 20px; display: flex; gap: 8px; flex-wrap: wrap;">
                    ${isAvailable && !isOwner ? `
                        <button class="btn btn-primary" onclick="UIBooks.borrowBook(${bookId}); UI.closeModal();" style="flex: 1;">
                            📖 Взяти книгу
                        </button>
                    ` : ''}
                    ${isReader ? `
                        <button class="btn btn-success" onclick="UIBooks.returnBook(${bookId}); UI.closeModal();" style="flex: 1;">
                            🏠 Повернути книгу
                        </button>
                    ` : ''}
                    <button class="btn btn-primary" onclick="UIReviews.showBookReview(${bookId}); UI.closeModal();" style="flex: 1;">
                        ⭐ Оцінити книгу
                    </button>
                    ${isOwner ? `
                        <button class="btn btn-secondary" onclick="UIBooks.editBook(${bookId}); UI.closeModal();" style="flex: 1;">
                            ✏️ Редагувати
                        </button>
                        <button class="btn btn-danger" onclick="UIBooks.deleteBook(${bookId}); UI.closeModal();" style="flex: 1;">
                            🗑️ Видалити
                        </button>
                    ` : ''}
                </div>
                
                ${reviewsHtml}
            `;
            
            modal.classList.add('active');
            console.log('✅ Modal відображено');
        } catch (error) {
            console.error('❌ Error showing book details:', error);
        }
    },

    /**
     * Позичити книгу
     */
    async borrowBook(bookId) {
        try {
            tg.HapticFeedback.impactOccurred('medium');
            
            await API.books.borrow(bookId, ClubsUI.currentClubId);
            tg.showAlert('✅ Книгу успішно позичено!');
            
            // Оновлюємо список
            if (ClubsUI.currentClubId) {
                await this.loadBooks(ClubsUI.currentClubId);
            }
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
            if (ClubsUI.currentClubId) {
                await this.loadBooks(ClubsUI.currentClubId);
            }
        } catch (error) {
            console.error('Error returning book:', error);
        }
    },

    /**
     * Редагувати книгу
     */
    async editBook(bookId) {
    return UIBookForm.openEdit(bookId);
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
                    if (ClubsUI.currentClubId) {
                        await this.loadBooks(ClubsUI.currentClubId);
                    }
                } catch (error) {
                    console.error('Error deleting book:', error);
                }
            }
        });
    },

    /**
     * Рендер профілю користувача
     */
    async renderProfile() {
        try {
            const profile = await API.user.getProfile();
            const stats = await API.user.getStats(CONFIG.CHAT_ID);
            
            // Ініціали
            const initials = profile.first_name.charAt(0).toUpperCase();
            const initialsEl = document.getElementById('profile-initials');
            if (initialsEl) {
                initialsEl.textContent = initials;
            }
            
            // Ім'я
            const fullName = `${profile.first_name} ${profile.last_name || ''}`.trim();
            const nameEl = document.getElementById('profile-name');
            if (nameEl) {
                nameEl.textContent = fullName;
            }
            
            // Username
            const username = profile.username ? `@${profile.username}` : 'Без username';
            const usernameEl = document.getElementById('profile-username');
            if (usernameEl) {
                usernameEl.textContent = username;
            }
            
            // Статистика
            const statAdded = document.getElementById('stat-added');
            if (statAdded) statAdded.textContent = stats.books_added;
            
            const statRead = document.getElementById('stat-read');
            if (statRead) statRead.textContent = stats.books_read;
            
            const statReading = document.getElementById('stat-reading');
            if (statReading) statReading.textContent = stats.currently_reading;
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }
};

// Експорт
window.UIBooks = UIBooks;
