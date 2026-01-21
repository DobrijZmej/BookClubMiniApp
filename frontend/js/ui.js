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
                            <div class="book-title">${this.escapeHtml(book.title)}</div>
                            <div class="book-author">${this.escapeHtml(book.author)}</div>
                        </div>
                    </div>
                    
                    <div class="book-owner">
                        Додав: @${this.escapeHtml(book.owner_username || 'невідомо')}
                    </div>
                    
                    <div class="book-actions">
                        <button class="btn-small btn-details" onclick="UI.showBookDetails(${book.id})">
                            Деталі
                        </button>
                        
                        <button class="btn-small btn-review" onclick="UI.showBookReview(${book.id})">
                            ⭐ Відгук
                        </button>
                        
                        ${(book.status === 'available' || book.status === 'AVAILABLE') 
                            ? `<button class="btn-small btn-borrow" onclick="UI.borrowBook(${book.id})">
                                Взяти
                               </button>`
                            : (book.status === 'reading' || book.status === 'READING') && !isOwner
                                ? `<button class="btn-small btn-details" disabled>
                                    Зайнято
                                   </button>`
                                : ''
                        }
                        
                        ${(book.status === 'reading' || book.status === 'READING') && isOwner
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
            console.log('📖 Показую деталі книги:', bookId);
            tg.HapticFeedback.impactOccurred('light');
            
            const book = await API.books.getDetails(bookId);
            console.log('📚 Отримані дані книги:', book);
            
            const modal = document.getElementById('book-modal');
            const modalBody = document.getElementById('modal-body');
            
            console.log('🎯 Modal element:', modal);
            console.log('📄 Modal body element:', modalBody);
            
            if (!modal) {
                console.error('❌ Modal element not found!');
                return;
            }
            
            if (!modalBody) {
                console.error('❌ Modal body element not found!');
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
                    const avgStars = this.generateStarRating(avgRating);
                    
                    reviewsHtml = `
                        <div style="margin-top: 16px;">
                            <strong>⭐ Відгуки:</strong>
                            <div class="reviews-stats">
                                <div class="avg-rating">
                                    <span class="avg-stars">${avgStars}</span>
                                    <span class="avg-number">${avgRating.toFixed(1)} з 5</span>
                                    <span class="reviews-count">(${reviews.length} ${this.getPluralForm(reviews.length, 'відгук', 'відгуки', 'відгуків')})</span>
                                </div>
                            </div>
                            ${reviews.map(review => {
                                const stars = this.generateStarRating(review.rating);
                                const date = new Date(review.created_at).toLocaleDateString('uk-UA');
                                
                                return `
                                    <div class="review-item">
                                        <div class="review-header">
                                            <span class="review-user">👤 ${this.escapeHtml(review.user_name || review.username || 'Анонім')}</span>
                                            <span class="review-date">${date}</span>
                                        </div>
                                        <div class="review-rating">${stars}</div>
                                        ${review.comment ? `<div class="review-comment">${this.escapeHtml(review.comment)}</div>` : ''}
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
                reviewsHtml = `
                    <div style="margin-top: 16px;">
                        <strong>⭐ Відгуки:</strong>
                        <div style="text-align: center; padding: 20px; color: var(--tg-theme-hint-color); background: rgba(255, 0, 0, 0.1); border-radius: 8px; margin-top: 8px;">
                            ❌ Помилка завантаження відгуків
                        </div>
                    </div>
                `;
            }
            
            modalBody.innerHTML = `
                <div class="modal-title">${this.escapeHtml(book.title)}</div>
                
                <div style="margin-bottom: 16px;">
                    <strong>Автор:</strong> ${this.escapeHtml(book.author)}<br>
                    <strong>Додав:</strong> @${this.escapeHtml(book.owner_username || 'невідомо')}<br>
                    <strong>Статус:</strong> ${book.status === 'AVAILABLE' ? '🟢 Доступна' : '🔴 Позичена'}
                </div>
                
                ${book.description 
                    ? `<div style="margin-bottom: 16px;">
                        <strong>Опис:</strong><br>
                        ${this.escapeHtml(book.description)}
                       </div>`
                    : ''
                }
                
                <div>
                    <strong>📅 Хронологія:</strong>
                    <div style="background: rgba(6, 182, 212, 0.1); border-radius: 8px; padding: 12px; margin-top: 8px;">
                        <div class="history-item">
                            <div class="history-item-header">
                                <span class="history-username">@${this.escapeHtml(book.owner_username || 'невідомо')}</span>
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
                                        <span class="history-username">@${this.escapeHtml(loan.username)}</span>
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
            
            console.log('🖼️ Контент модального вікна:', modalBody.innerHTML);
            modal.classList.add('active');
            console.log('✅ Modal відображено');
        } catch (error) {
            console.error('❌ Error showing book details:', error);
        }
    },

    /**
     * Згенерувати зірки рейтингу для відображення
     */
    generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        
        // Повні зірки
        for (let i = 0; i < fullStars; i++) {
            stars += '⭐';
        }
        
        // Половина зірки
        if (hasHalfStar) {
            stars += '⭐'; // Використаємо повну зірку
        }
        
        // Порожні зірки
        for (let i = 0; i < emptyStars; i++) {
            stars += '☆';
        }
        
        return stars;
    },

    /**
     * Отримати правильну форму множини
     */
    getPluralForm(count, one, few, many) {
        if (count % 10 === 1 && count % 100 !== 11) return one;
        if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return few;
        return many;
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
     * Показати форму відгука
     */
    async showBookReview(bookId) {
        try {
            UI.currentBookId = bookId;
            
            // Переключити на view відгука
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('book-review-view').classList.add('active');
            
            // Оновити заголовок
            document.getElementById('header-title').textContent = '⭐ Відгук на книгу';
            document.getElementById('back-button').style.display = 'block';
            
            // Спробувати завантажити існуючий відгук
            try {
                const existingReview = await API.books.getMyReview(bookId);
                console.log('📝 Існуючий відгук:', existingReview);
                
                // Заповнити форму існуючими даними
                this.fillReviewForm(existingReview);
                
                // Показати кнопку видалення
                document.getElementById('delete-review-btn').style.display = 'block';
                
                // Оновити заголовок
                document.getElementById('header-title').textContent = '⭐ Редагувати відгук';
                
            } catch (error) {
                console.log('📝 Відгук не знайдено, показую нову форму');
                // Очистити форму для нового відгука
                this.clearReviewForm();
                document.getElementById('delete-review-btn').style.display = 'none';
            }
            
        } catch (error) {
            console.error('Error showing review form:', error);
        }
    },

    /**
     * Заповнити форму відгука існуючими даними
     */
    fillReviewForm(review) {
        // Встановити рейтинг
        const ratingInput = document.querySelector(`input[name="rating"][value="${review.rating}"]`);
        if (ratingInput) {
            ratingInput.checked = true;
        }
        
        // Встановити коментар
        document.getElementById('review-comment').value = review.comment || '';
    },

    /**
     * Очистити форму відгука
     */
    clearReviewForm() {
        // Очистити рейтинг
        document.querySelectorAll('input[name="rating"]').forEach(input => {
            input.checked = false;
        });
        
        // Очистити коментар
        document.getElementById('review-comment').value = '';
    },

    /**
     * Зберегти відгук
     */
    async saveBookReview() {
        try {
            if (!UI.currentBookId) {
                console.error('No book selected');
                return;
            }
            
            // Отримати дані з форми
            const rating = document.querySelector('input[name="rating"]:checked')?.value;
            const comment = document.getElementById('review-comment').value.trim();
            
            if (!rating) {
                tg.showAlert('Оберіть рейтинг від 1 до 5 зірок');
                return;
            }
            
            const reviewData = {
                rating: parseInt(rating),
                comment: comment || null
            };
            
            tg.HapticFeedback.impactOccurred('medium');
            
            await API.books.createOrUpdateReview(UI.currentBookId, reviewData);
            tg.showAlert('✅ Відгук збережено!');
            
            // Повернутися назад
            this.goBackFromReview();
            
        } catch (error) {
            console.error('Error saving review:', error);
            tg.showAlert(`Помилка: ${error.message}`);
        }
    },

    /**
     * Видалити відгук
     */
    async deleteBookReview() {
        tg.showConfirm('Видалити відгук?', async (confirmed) => {
            if (confirmed) {
                try {
                    if (!UI.currentBookId) {
                        console.error('No book selected');
                        return;
                    }
                    
                    tg.HapticFeedback.impactOccurred('heavy');
                    
                    await API.books.deleteReview(UI.currentBookId);
                    tg.showAlert('✅ Відгук видалено');
                    
                    // Повернутися назад
                    this.goBackFromReview();
                    
                } catch (error) {
                    console.error('Error deleting review:', error);
                    tg.showAlert(`Помилка: ${error.message}`);
                }
            }
        });
    },

    /**
     * Повернутися з форми відгука
     */
    goBackFromReview() {
        UI.currentBookId = null;
        
        // Повернутися до деталей клубу
        document.getElementById('book-review-view').classList.remove('active');
        document.getElementById('club-detail-view').classList.add('active');
        
        // Відновити заголовок
        const clubName = document.getElementById('header-title').dataset.clubName || 'Клуб';
        document.getElementById('header-title').textContent = `📚 ${clubName}`;
    },

    /**
     * Завантаження та відображення книг
     * @param {number} clubId - ID клубу
     */
    async loadBooks(clubId) {
        try {
            const status = document.getElementById('filter-status').value;
            const search = document.getElementById('search-input').value;
            
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
