// UI Main Module - Головний entry point для всіх UI модулів
// Забезпечує зворотну сумісність зі старим кодом

const UI = {
    // Utils
    setLoading: (...args) => UIUtils.setLoading(...args),
    escapeHtml: (...args) => UIUtils.escapeHtml(...args),
    generateStarRating: (...args) => UIUtils.generateStarRating(...args),
    getPluralForm: (...args) => UIUtils.getPluralForm(...args),
    switchView: (...args) => UIUtils.switchView(...args),
    closeModal: (...args) => UIUtils.closeModal(...args),
    
    // Books
    loadBooks: (...args) => UIBooks.loadBooks(...args),
    renderBooks: (...args) => UIBooks.renderBooks(...args),
    showBookDetails: (...args) => UIBooks.showBookDetails(...args),
    borrowBook: (...args) => UIBooks.borrowBook(...args),
    returnBook: (...args) => UIBooks.returnBook(...args),
    deleteBook: (...args) => UIBooks.deleteBook(...args),
    renderProfile: (...args) => UIBooks.renderProfile(...args),
    
    // Reviews
    showBookReview: (...args) => UIReviews.showBookReview(...args),
    saveBookReview: (...args) => UIReviews.saveBookReview(...args),
    deleteBookReview: (...args) => UIReviews.deleteBookReview(...args),
    goBackFromReview: (...args) => UIReviews.goBackFromReview(...args),
    
    // Getter/Setter для currentBookId (для зворотної сумісності)
    get currentBookId() {
        return UIReviews.currentBookId;
    },
    set currentBookId(value) {
        UIReviews.currentBookId = value;
    }
};

// Експорт
window.UI = UI;
