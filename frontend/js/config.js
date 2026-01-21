// Configuration
const CONFIG = {
    // Автоматично визначає localhost для розробки або production URL
    API_BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:8000'
        : 'https://bookclub.uca.co.ua',
    
    // Chat ID буде отримано з Telegram
    CHAT_ID: null,
    
    // Dev режим для роботи поза Telegram
    IS_DEV_MODE: window.location.hostname === 'localhost' || window.location.search.includes('dev=true'),
    
    // Mock користувач для dev режиму
    DEV_USER: {
        id: 123456789,
        username: 'dev_user',
        first_name: 'Dev',
        last_name: 'User'
    }
};

// Ініціалізація Telegram Web App з fallback
const tg = window.Telegram?.WebApp || {
    initData: '',
    initDataUnsafe: CONFIG.IS_DEV_MODE ? {
        user: CONFIG.DEV_USER
    } : {},
    version: '1.0',
    ready: () => {},
    expand: () => {},
    close: () => {}
};

// Застосування теми Telegram
function applyTelegramTheme() {
    if (tg.themeParams) {
        const root = document.documentElement;
        Object.keys(tg.themeParams).forEach(key => {
            root.style.setProperty(`--tg-theme-${key.replace(/_/g, '-')}`, tg.themeParams[key]);
        });
    }
}

// Генерація mock initData для dev режиму
function generateMockInitData() {
    if (!CONFIG.IS_DEV_MODE) return '';
    
    const authDate = Math.floor(Date.now() / 1000);
    const userData = JSON.stringify(CONFIG.DEV_USER);
    
    // Простий mock без реальної криптографії (тільки для dev)
    return `user=${encodeURIComponent(userData)}&auth_date=${authDate}&hash=dev_mock_hash`;
}

// Встановлення mock initData для dev режиму
if (CONFIG.IS_DEV_MODE && !tg.initData) {
    tg.initData = generateMockInitData();
    console.log('🔧 Dev режим активний. Mock користувач:', CONFIG.DEV_USER);
}

// Експорт
window.CONFIG = CONFIG;
window.tg = tg;
window.applyTelegramTheme = applyTelegramTheme;
