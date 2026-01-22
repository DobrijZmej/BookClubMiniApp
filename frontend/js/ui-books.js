// UI Books Module - Робота з книгами
const UIBooks = {
    /**
     * Завантаження та відображення книг
     * @param {number} clubId - ID клубу
     */
    async loadBooks(clubId) {
        try {
            const statusFilter = document.getElementById('filter-status');
            const searchInput = document.getElementById('search-input');
            
            const status = statusFilter ? statusFilter.value : '';
            const search = searchInput ? searchInput.value : '';
            
            console.log(`Loading books for club ${clubId}, status: ${status}`);
            
            const books = await API.books.getAll(clubId, { status, search });
            
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
            const statusIcon = (book.status === 'available' || book.status === 'AVAILABLE') ? '🟢' : '🔴';
            const isOwner = book.owner_id === String(tg.initDataUnsafe.user?.id);
            
            console.log(`Book ${book.title}: status="${book.status}", isOwner=${isOwner}`);
            
            return `
                <div class="book-card" data-book-id="${book.id}">
                    <span class="book-status">${statusIcon}</span>
                    
                    <div class="book-header">
                        <div>
                            <div class="book-title">${UIUtils.escapeHtml(book.title)}</div>
                            <div class="book-author">${UIUtils.escapeHtml(book.author)}</div>
                        </div>
                    </div>
                    
                    <div class="book-owner">
                        @${UIUtils.escapeHtml(book.owner_username || 'невідомо')}
                    </div>
                    
                    <div class="book-actions">
                        <button class="btn-small btn-details" onclick="UIBooks.showBookDetails(${book.id})">
                            Деталі
                        </button>
                        
                        <button class="btn-small btn-review" onclick="UIReviews.showBookReview(${book.id})">
                            ⭐ Відгук
                        </button>
                        
                        ${(book.status === 'available' || book.status === 'AVAILABLE') 
                            ? `<button class="btn-small btn-borrow" onclick="UIBooks.borrowBook(${book.id})">
                                Взяти
                               </button>`
                            : (book.status === 'reading' || book.status === 'READING') && !isOwner
                                ? `<button class="btn-small btn-details" disabled>
                                    Зайнято
                                   </button>`
                                : ''
                        }
                        
                        ${(book.status === 'reading' || book.status === 'READING') && isOwner
                            ? `<button class="btn-small btn-return" onclick="UIBooks.returnBook(${book.id})">
                                Повернути
                               </button>`
                            : ''
                        }
                        
                        ${isOwner
                            ? `<button class="btn-small btn-delete" onclick="UIBooks.deleteBook(${book.id})">
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
            
            await API.books.borrow(bookId, CONFIG.CHAT_ID);
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
