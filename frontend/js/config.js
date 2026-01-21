// Configuration
const CONFIG = {
    // ВАЖЛИВО: Змініть на ваш реальний API URL
    API_BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:8000'
        : 'https://yourdomain.com',
    
    // Chat ID буде отримано з Telegram
    CHAT_ID: null
};

// Ініціалізація Telegram Web App
const tg = window.Telegram.WebApp;

// Застосування теми Telegram
function applyTelegramTheme() {
    if (tg.themeParams) {
        const root = document.documentElement;
        Object.keys(tg.themeParams).forEach(key => {
            root.style.setProperty(`--tg-theme-${key.replace(/_/g, '-')}`, tg.themeParams[key]);
        });
    }
}

// Експорт
window.CONFIG = CONFIG;
window.tg = tg;
window.applyTelegramTheme = applyTelegramTheme;
