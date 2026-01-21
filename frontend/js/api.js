// API Module
const API = {
    /**
     * Базовий метод для HTTP запитів
     */
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': tg.initData,
            ...options.headers
        };
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
                throw new Error(error.detail || `HTTP ${response.status}`);
            }
            
            // Для 204 No Content
            if (response.status === 204) {
                return null;
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            tg.showAlert(`Помилка: ${error.message}`);
            throw error;
        }
    },

    /**
     * Books endpoints
     */
    books: {
        // Отримати список книг
        async getAll(chatId, filters = {}) {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.search) params.append('search', filters.search);
            
            const query = params.toString() ? `?${params}` : '';
            return API.request(`/api/books/${chatId}${query}`);
        },
        
        // Отримати деталі книги
        async getDetails(chatId, bookId) {
            return API.request(`/api/books/${chatId}/book/${bookId}`);
        },
        
        // Створити книгу
        async create(bookData) {
            return API.request('/api/books', {
                method: 'POST',
                body: JSON.stringify(bookData)
            });
        },
        
        // Позичити книгу
        async borrow(bookId, chatId) {
            return API.request(`/api/books/${bookId}/borrow`, {
                method: 'POST',
                body: JSON.stringify({ chat_id: chatId })
            });
        },
        
        // Повернути книгу
        async return(bookId) {
            return API.request(`/api/books/${bookId}/return`, {
                method: 'POST'
            });
        },
        
        // Видалити книгу
        async delete(bookId) {
            return API.request(`/api/books/${bookId}`, {
                method: 'DELETE'
            });
        }
    },

    /**
     * User endpoints
     */
    user: {
        // Отримати профіль
        async getProfile() {
            return API.request('/api/user/profile');
        },
        
        // Отримати статистику
        async getStats(chatId) {
            return API.request(`/api/user/stats/${chatId}`);
        }
    },

    /**
     * Health check
     */
    async healthCheck() {
        return API.request('/api/health');
    }
};

// Експорт
window.API = API;
