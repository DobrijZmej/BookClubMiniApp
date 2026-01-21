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
            // showAlert не підтримується в старих версіях Telegram WebApp
            if (tg.showAlert && tg.version && parseFloat(tg.version) >= 6.1) {
                tg.showAlert(`Помилка: ${error.message}`);
            }
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
     * Clubs endpoints
     */
    clubs: {
        // Створити клуб
        async create(clubData) {
            return API.request('/api/clubs', {
                method: 'POST',
                body: JSON.stringify(clubData)
            });
        },
        
        // Отримати мої клуби
        async getMy() {
            return API.request('/api/clubs/my');
        },
        
        // Отримати деталі клубу
        async getDetails(clubId) {
            return API.request(`/api/clubs/${clubId}`);
        },
        
        // Оновити клуб
        async update(clubId, clubData) {
            return API.request(`/api/clubs/${clubId}`, {
                method: 'PATCH',
                body: JSON.stringify(clubData)
            });
        },
        
        // Запит на приєднання
        async requestJoin(inviteCode, message) {
            return API.request('/api/clubs/join', {
                method: 'POST',
                body: JSON.stringify({ invite_code: inviteCode, message })
            });
        },
        
        // Отримати запити на приєднання
        async getJoinRequests(clubId, status = 'pending') {
            return API.request(`/api/clubs/${clubId}/requests?status=${status}`);
        },
        
        // Схвалити/відхилити запит
        async reviewJoinRequest(clubId, requestId, action) {
            return API.request(`/api/clubs/${clubId}/requests/${requestId}`, {
                method: 'POST',
                body: JSON.stringify({ action })
            });
        },
        
        // Отримати учасників клубу
        async getMembers(clubId) {
            return API.request(`/api/clubs/${clubId}/members`);
        },
        
        // Видалити учасника
        async removeMember(clubId, userId) {
            return API.request(`/api/clubs/${clubId}/members/${userId}`, {
                method: 'DELETE'
            });
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
