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
                const errorMessage = typeof error.detail === 'string' 
                    ? error.detail 
                    : JSON.stringify(error.detail) || `HTTP ${response.status}`;
                
                // Спеціальне повідомлення для помилок автентифікації
                if (response.status === 401 || response.status === 403) {
                    throw new Error('Схоже сесія завершилась, спробуйте закрити і відкрити додаток заново');
                }
                
                throw new Error(errorMessage);
            }
            
            // Для 204 No Content
            if (response.status === 204) {
                return null;
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            // showAlert не підтримується в старих версіях Telegram WebApp
            // Не показуємо alert якщо це тихий запит
            if (options.silent !== true && tg.showAlert && tg.version && parseFloat(tg.version) >= 6.1) {
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
        async getAll(clubId, filters = {}) {
            const params = new URLSearchParams();
            if (filters.sort_by) params.append('sort_by', filters.sort_by);
            if (filters.search) params.append('search', filters.search);
            
            const query = params.toString() ? `?${params}` : '';
            return API.request(`/api/books/club/${clubId}${query}`);
        },
        
        // Отримати деталі книги
        async getDetails(bookId) {
            return API.request(`/api/books/book/${bookId}`);
        },
        
        // Створити книгу
        async create(bookData) {
            return API.request('/api/books', {
                method: 'POST',
                body: JSON.stringify(bookData)
            });
        },
        
        // Оновити книгу
        async update(bookId, bookData) {
            return API.request(`/api/books/${bookId}`, {
                method: 'PATCH',
                body: JSON.stringify(bookData)
            });
        },

        uploadCover: async (bookId, file, client_request_id) => {
            const formData = new FormData();
            formData.append('file', file);
            if (client_request_id) formData.append('client_request_id', client_request_id);

            const url = `${CONFIG.API_BASE_URL}/api/books/${bookId}/cover`;

            try {
                const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'X-Telegram-Init-Data': tg.initData
                    // NO Content-Type header! Browser sets it automatically with boundary
                },
                body: formData
                });

                if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
                const errorMessage = typeof error.detail === 'string'
                    ? error.detail
                    : JSON.stringify(error.detail) || `HTTP ${response.status}`;
                
                // Спеціальне повідомлення для помилок автентифікації
                if (response.status === 401 || response.status === 403) {
                    throw new Error('Схоже сесія завершилась, спробуйте закрити і відкрити додаток заново');
                }
                
                throw new Error(errorMessage);
                }

                return await response.json();
            } catch (error) {
                console.error('Cover upload error:', error);
                throw error;
            }
            },        

        // Позичити книгу
        async borrow(bookId, clubId) {
            return API.request(`/api/books/${bookId}/borrow`, {
                method: 'POST',
                body: JSON.stringify({ club_id: clubId })
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
        },
        
        // Створити/оновити відгук
        async createOrUpdateReview(bookId, reviewData) {
            return API.request(`/api/books/${bookId}/review`, {
                method: 'POST',
                body: JSON.stringify(reviewData)
            });
        },
        
        // Отримати мій відгук
        async getMyReview(bookId) {
            return API.request(`/api/books/${bookId}/review`, { silent: true });
        },
        
        // Видалити відгук
        async deleteReview(bookId) {
            return API.request(`/api/books/${bookId}/review`, {
                method: 'DELETE'
            });
        },

        async getReviews(bookId) {
            return API.request(`/api/books/${bookId}/reviews`);
        },
        
        // Google Books search
        async searchGoogleBooks(title, author = null) {
            const params = new URLSearchParams();
            params.append('title', title);
            if (author) params.append('author', author);
            
            return API.request(`/api/books/google/search?${params.toString()}`);
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

        // Alias for getDetails
        async get(clubId) {
            return this.getDetails(clubId);
        },
        
        // Оновити клуб
        async update(clubId, clubData) {
            return API.request(`/api/clubs/${clubId}`, {
                method: 'PATCH',
                body: JSON.stringify(clubData)
            });
        },
        
        // Видалити клуб (soft delete)
        async delete(clubId) {
            return API.request(`/api/clubs/${clubId}`, {
                method: 'DELETE'
            });
        },

        // Завантажити аватар клубу
        async uploadAvatar(clubId, file) {
            const formData = new FormData();
            formData.append('file', file);

            const url = `${CONFIG.API_BASE_URL}/api/clubs/${clubId}/avatar`;
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'X-Telegram-Init-Data': tg.initData
                        // NO Content-Type header! Browser sets it automatically with boundary
                    },
                    body: formData
                });
                
                if (!response.ok) {
                    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
                    const errorMessage = typeof error.detail === 'string' 
                        ? error.detail 
                        : JSON.stringify(error.detail) || `HTTP ${response.status}`;
                    throw new Error(errorMessage);
                }
                
                return await response.json();
            } catch (error) {
                console.error('Avatar upload error:', error);
                throw error;
            }
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
        },
        
        // Змінити роль учасника
        async updateMemberRole(clubId, userId, role) {
            return API.request(`/api/clubs/${clubId}/members/${userId}/role`, {
                method: 'PATCH',
                body: JSON.stringify({ role })
            });
        },
        
        // Отримати стрічку активностей клубу
        async getActivity(clubId, eventType = '', limit = 50, offset = 0) {
            const params = new URLSearchParams();
            if (eventType) params.append('event_type', eventType);
            params.append('limit', limit.toString());
            params.append('offset', offset.toString());
            
            const query = params.toString() ? `?${params}` : '';
            return API.request(`/api/clubs/${clubId}/activity${query}`);
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
