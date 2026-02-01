// UI Utils Module - Утиліти та допоміжні функції
const UIUtils = {
    /**
     * Показати/сховати loader
     */
    setLoading(isLoading) {
        document.getElementById('loader').style.display = isLoading ? 'flex' : 'none';
        document.getElementById('app').style.display = isLoading ? 'none' : 'block';
    },

    /**
     * Показати loader
     */
    showLoader() {
        this.setLoading(true);
    },

    /**
     * Сховати loader
     */
    hideLoader() {
        this.setLoading(false);
    },

    /**
     * Показати повідомлення про успіх
     */
    showSuccess(message) {
        console.log('✅ ' + message);
        alert(message);
    },

    /**
     * Показати повідомлення про помилку
     */
    showError(message) {
        console.error('❌ ' + message);
        alert('❌ ' + message);
    },

    /**
     * Escape HTML для безпеки
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Згенерувати зірки рейтингу для відображення (SVG з підтримкою половинок)
     */
    generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const remainder = rating % 1;
        const hasHalfStar = remainder >= 0.25 && remainder < 0.75;
        const hasFullFromHalf = remainder >= 0.75;
        const actualFullStars = fullStars + (hasFullFromHalf ? 1 : 0);
        
        const svgStarFull = `<svg viewBox="0 0 24 24" class="star-display star-full" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
        const svgStarHalf = `<span class="star-half-display"><svg viewBox="0 0 24 24" class="star-display" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></span>`;
        
        let stars = '';
        
        // Повні зірки
        for (let i = 0; i < actualFullStars; i++) {
            stars += svgStarFull;
        }
        
        // Половина зірки
        if (hasHalfStar) {
            stars += svgStarHalf;
        }
        
        return stars;
    },

    /**
     * Отримати правильну форму множини (українська мова)
     */
    getPluralForm(count, one, few, many) {
        if (count % 10 === 1 && count % 100 !== 11) return one;
        if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return few;
        return many;
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
        
        const tab = document.querySelector(`[data-view="${viewName}"]`);
        if (tab) {
            tab.classList.add('active');
        }
        
        // Показуємо/ховаємо search bar (якщо є)
        const searchBar = document.getElementById('search-bar');
        if (searchBar) {
            searchBar.style.display = viewName === 'library' ? 'flex' : 'none';
        }
    },

    /**
     * Закрити модальне вікно
     */
    closeModal() {
        const modal = document.getElementById('book-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
};

// Експорт
window.UIUtils = UIUtils;
