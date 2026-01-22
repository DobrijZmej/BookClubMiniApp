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
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.showAlert(message);
        } else {
            alert(message);
        }
    },

    /**
     * Показати повідомлення про помилку
     */
    showError(message) {
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.showAlert('❌ ' + message);
        } else {
            alert('❌ ' + message);
        }
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
