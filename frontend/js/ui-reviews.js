// UI Reviews Module - Робота з відгуками на книги
const UIReviews = {
    currentBookId: null,

    /**
     * Показати форму відгука
     */
    async showBookReview(bookId) {
        try {
            this.currentBookId = bookId;
            
            // Відкрити модальне вікно
            document.getElementById('book-review-modal').classList.add('active');
            
            // Спробувати завантажити існуючий відгук (тихо)
            try {
                const existingReview = await API.books.getMyReview(bookId);
                console.log('📝 Існуючий відгук:', existingReview);
                
                // Заповнити форму існуючими даними
                this.fillReviewForm(existingReview);
                
                // Показати кнопку видалення
                const deleteBtn = document.getElementById('delete-review-btn');
                if (deleteBtn) {
                    deleteBtn.style.display = 'block';
                }
                
                // Оновити заголовок
                document.getElementById('review-modal-title').textContent = '⭐ Редагувати відгук';
                
            } catch (error) {
                // Тихо обробляємо відсутність відгука - просто показуємо нову форму
                console.log('📝 Відгук не знайдено, показую нову форму');
                this.clearReviewForm();
                
                const deleteBtn = document.getElementById('delete-review-btn');
                if (deleteBtn) {
                    deleteBtn.style.display = 'none';
                }
                
                // Оновити заголовок
                document.getElementById('review-modal-title').textContent = '⭐ Відгук на книгу';
            }
            
        } catch (error) {
            console.error('Error showing review form:', error);
            tg.showAlert('Помилка завантаження форми відгука');
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
        const commentField = document.getElementById('review-comment');
        if (commentField) {
            commentField.value = review.comment || '';
        }
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
        const commentField = document.getElementById('review-comment');
        if (commentField) {
            commentField.value = '';
        }
    },

    /**
     * Зберегти відгук
     */
    async saveBookReview() {
        try {
            if (!this.currentBookId) {
                console.error('No book selected');
                return;
            }
            
            // Отримати дані з форми
            const rating = document.querySelector('input[name="rating"]:checked')?.value;
            const commentField = document.getElementById('review-comment');
            const comment = commentField ? commentField.value.trim() : '';
            
            if (!rating) {
                tg.showAlert('Оберіть рейтинг від 1 до 5 зірок');
                return;
            }
            
            const reviewData = {
                rating: parseInt(rating),
                comment: comment || null
            };
            
            tg.HapticFeedback.impactOccurred('medium');
            
            await API.books.createOrUpdateReview(this.currentBookId, reviewData);
            tg.showAlert('✅ Відгук збережено!');
            
            // Закрити modal
            document.getElementById('book-review-modal').classList.remove('active');
            this.currentBookId = null;
            
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
                    if (!this.currentBookId) {
                        console.error('No book selected');
                        return;
                    }
                    
                    tg.HapticFeedback.impactOccurred('heavy');
                    
                    await API.books.deleteReview(this.currentBookId);
                    tg.showAlert('✅ Відгук видалено');
                    
                    // Закрити modal
                    document.getElementById('book-review-modal').classList.remove('active');
                    this.currentBookId = null;
                    
                } catch (error) {
                    console.error('Error deleting review:', error);
                    tg.showAlert(`Помилка: ${error.message}`);
                }
            }
        });
    },

    /**Закрити модальне вікно відгука
     */
    closeReviewModal() {
        document.getElementById('book-review-modal').classList.remove('active');
        this.currentBookId = nullame || 'Клуб';
        document.getElementById('header-title').textContent = `📚 ${clubName}`;
    }
};

// Експорт
window.UIReviews = UIReviews;
