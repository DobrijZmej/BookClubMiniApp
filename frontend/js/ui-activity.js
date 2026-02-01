// Activity Feed UI Module
const UIActivity = {
    currentEventType: '',
    currentOffset: 0,
    limit: 50,
    hasMore: false,
    isLoading: false,

    /**
     * Завантаження стрічки подій
     */
    async loadActivity(clubId, eventType = '', offset = 0) {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.currentEventType = eventType;
            
            if (offset === 0) {
                this.currentOffset = 0;
                document.getElementById('activity-feed').innerHTML = '';
            }
            
            const response = await API.clubs.getActivity(clubId, eventType, this.limit, offset);
            
            this.hasMore = response.has_more;
            this.currentOffset = offset + response.events.length;
            
            this.renderEvents(response.events);
            this.updateLoadMoreButton();
            
            // Показуємо empty state якщо немає подій
            const emptyState = document.getElementById('activity-empty-state');
            const feed = document.getElementById('activity-feed');
            if (response.events.length === 0 && offset === 0) {
                emptyState.style.display = 'block';
                feed.style.display = 'none';
            } else {
                emptyState.style.display = 'none';
                feed.style.display = 'flex';
            }
            
        } catch (error) {
            console.error('Error loading activity feed:', error);
            if (tg.showAlert) {
                tg.showAlert(`Помилка: ${error.message}`);
            }
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Рендеринг подій
     */
    renderEvents(events) {
        const container = document.getElementById('activity-feed');
        
        events.forEach(event => {
            const eventElement = this.createEventElement(event);
            container.appendChild(eventElement);
        });
    },

    /**
     * Створення HTML елементу події
     */
    createEventElement(event) {
        const div = document.createElement('div');
        div.className = 'activity-event';
        div.dataset.bookId = event.book.book_id;
        div.onclick = () => UIBooks.showBookDetails(event.book.book_id);
        
        const icon = this.getEventIcon(event.event_type);
        const text = this.getEventText(event);
        const timeText = this.formatTime(event.event_time);
        
        let reviewHtml = '';
        if (event.event_type === 'REVIEW_BOOK' && event.rating) {
            const stars = '⭐'.repeat(event.rating);
            const reviewPreview = event.review_text ? 
                ` – ${UIUtils.escapeHtml(event.review_text.substring(0, 50))}${event.review_text.length > 50 ? '…' : ''}` : '';
            reviewHtml = `
                <div class="activity-event-review">
                    <span class="activity-event-stars">${stars}</span>
                    ${reviewPreview ? `<span class="activity-event-review-text">${reviewPreview}</span>` : ''}
                </div>
            `;
        }
        
        // Додаємо обкладинку книги
        const coverHtml = event.book.cover_url ? 
            `<div class="activity-event-cover" style="background-image: url('${event.book.cover_url}');"></div>` : '';
        
        div.innerHTML = `
            <div class="activity-event-icon">${icon}</div>
            <div class="activity-event-content">
                <div class="activity-event-text">${text}</div>
                <div class="activity-event-meta">${timeText}</div>
                ${reviewHtml}
            </div>
            ${coverHtml}
        `;
        
        return div;
    },

    /**
     * Іконка для типу події
     */
    getEventIcon(eventType) {
        const icons = {
            'ADD_BOOK': '➕',
            'BORROW_BOOK': '📚',
            'RETURN_BOOK': '🔙',
            'REVIEW_BOOK': '⭐'
        };
        return icons[eventType] || '📌';
    },

    /**
     * Текст події
     */
    getEventText(event) {
        const actorName = UIUtils.escapeHtml(event.actor.display_name);
        const bookTitle = UIUtils.escapeHtml(event.book.title);
        
        const texts = {
            'ADD_BOOK': `<span class="activity-event-actor">${actorName}</span> додав книгу «<span class="activity-event-book">${bookTitle}</span>»`,
            'BORROW_BOOK': `<span class="activity-event-actor">${actorName}</span> взяв «<span class="activity-event-book">${bookTitle}</span>»`,
            'RETURN_BOOK': `<span class="activity-event-actor">${actorName}</span> повернув «<span class="activity-event-book">${bookTitle}</span>»`,
            'REVIEW_BOOK': `<span class="activity-event-actor">${actorName}</span> залишив відгук на «<span class="activity-event-book">${bookTitle}</span>»`
        };
        
        return texts[event.event_type] || 'Подія';
    },

    /**
     * Форматування часу
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'щойно';
        if (diffMins < 60) return `${diffMins} хв тому`;
        if (diffHours < 24) return `${diffHours} год тому`;
        if (diffDays === 1) return 'вчора';
        if (diffDays < 7) return `${diffDays} дн тому`;
        
        return date.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
    },

    /**
     * Оновлення кнопки "Показати ще"
     */
    updateLoadMoreButton() {
        const button = document.getElementById('load-more-activity');
        button.style.display = this.hasMore ? 'block' : 'none';
    },

    /**
     * Перемикання фільтру подій
     */
    setEventTypeFilter(eventType) {
        this.currentEventType = eventType;
        this.currentOffset = 0;
        
        // Оновлюємо активний чип
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.eventType === eventType);
        });
        
        // Завантажуємо події з новим фільтром
        const clubId = ClubsUI.currentClubId;
        if (clubId) {
            this.loadActivity(clubId, eventType, 0);
        }
    }
};
