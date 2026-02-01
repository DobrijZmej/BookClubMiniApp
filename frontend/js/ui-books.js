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
            
            // Тримач книги
            const holderUsername = book.holder_username || 'невідомо';
            const holderName = book.holder_name || holderUsername;
            
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
                            <span class="readers-icon">👥</span>
                            <span>${readersCount} ${UIUtils.getPluralForm(readersCount, 'читач', 'читачі', 'читачів')}</span>
                        </div>
                        <div class="book-holder">
                            <span class="holder-icon">👤</span>
                            <span>Тримач: @${UIUtils.escapeHtml(holderUsername)}</span>
                        </div>
                    </div>
                    <div class="book-status-col">
                        <span class="book-status-indicator ${statusClass}" title="${statusText}"></span>
                        ${rating > 0 ? `
                            <div class="book-rating">
                                <span class="rating-star">⭐</span>
                                <span>${rating.toFixed(1)}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="book-actions">
                        ${isAvailable ? `
                            <button class="book-action-btn" onclick="event.stopPropagation(); UIBooks.borrowBook(${book.id})" title="Взяти книгу">
                                📖
                            </button>
                        ` : ''}
                        ${isReader ? `
                            <button class="book-action-btn" onclick="event.stopPropagation(); UIBooks.returnBook(${book.id})" title="Повернути книгу">
                                🏠
                            </button>
                        ` : ''}
                        <button class="book-action-btn" onclick="event.stopPropagation(); UIReviews.showBookReview(${book.id})" title="Оцінити книгу">
                            ⭐
                        </button>
                        ${isOwner ? `
                            <button class="book-action-btn" onclick="event.stopPropagation(); UIBooks.editBook(${book.id})" title="Редагувати">
                                ✏️
                            </button>
                            <button class="book-action-btn danger" onclick="event.stopPropagation(); UIBooks.deleteBook(${book.id})" title="Видалити">
                                🗑️
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
                        <div class="book-modal-section">
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
                        <div class="book-modal-section">
                            <strong>⭐ Відгуки:</strong>
                            <div class="empty-reviews">
                                📝 Ще немає відгуків
                            </div>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Помилка завантаження відгуків:', error);
                reviewsHtml = '<div class="book-modal-section"><strong>⭐ Відгуки:</strong><div class="empty-reviews">❌ Помилка завантаження відгуків</div></div>';
            }
            
            modalBody.innerHTML = `
                ${book.cover_url ? `
                    <div class="book-modal-cover">
                        <img src="${book.cover_url}" alt="Обкладинка" onerror="this.src='${UIBooks.getDefaultBookCoverUrl()}';">
                    </div>
                ` : ''}
                
                <div class="modal-title">${UIUtils.escapeHtml(book.title)}</div>
                
                <div class="book-modal-info">
                    <strong>Автор:</strong> ${UIUtils.escapeHtml(book.author)}<br>
                    <strong>Додав:</strong> ${UIUtils.escapeHtml(book.owner_name || book.owner_username || 'невідомо')}<br>
                    <strong>Тримач:</strong> ${UIUtils.escapeHtml(book.holder_name || book.holder_username || 'невідомо')} (@${UIUtils.escapeHtml(book.holder_username || 'невідомо')})<br>
                    <strong>Статус:</strong> ${book.status === 'AVAILABLE' ? '🟢 Доступна' : '🔴 Позичена'}
                </div>
                
                ${book.description 
                    ? `<div class="book-modal-description">
                        <strong>Опис:</strong>
                        ${UIUtils.escapeHtml(book.description)}
                       </div>`
                    : ''
                }
                
                <div class="book-modal-section">
                    <strong>📅 Хронологія:</strong>
                    <div class="history-item">
                        <div class="history-item-header">
                            <span class="history-username">${UIUtils.escapeHtml(book.owner_name || book.owner_username || 'невідомо')}</span>
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
                    
                    ${book.loans && book.loans.length > 0
                        ? `<div class="book-modal-section">
                            <strong>📖 Історія читання:</strong>
                            ${book.loans.map(loan => `
                                <div class="history-item">
                                    <div class="history-item-header">
                                        <span class="history-username">${UIUtils.escapeHtml(loan.user_name || loan.username)}</span>
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
                        : '<div class="empty-history">📖 Ще ніхто не читав цю книгу</div>'
                    }
                </div>
                
                <div class="book-modal-actions">
                    ${isAvailable ? `
                        <button class="btn btn-primary" onclick="UIBooks.borrowBook(${bookId}); UI.closeModal();">
                            📖 Взяти книгу
                        </button>
                    ` : ''}
                    ${isReader ? `
                        <button class="btn btn-success" onclick="UIBooks.returnBook(${bookId}); UI.closeModal();">
                            🏠 Повернути книгу
                        </button>
                    ` : ''}
                    <button class="btn btn-primary" onclick="UIReviews.showBookReview(${bookId}); UI.closeModal();">
                        ⭐ Оцінити книгу
                    </button>
                    ${isOwner ? `
                        <button class="btn btn-secondary" onclick="UIBooks.editBook(${bookId}); UI.closeModal();">
                            ✏️ Редагувати
                        </button>
                        <button class="btn btn-danger" onclick="UIBooks.deleteBook(${bookId}); UI.closeModal();">
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
