// Clubs UI Module
const ClubsUI = {
    currentClubId: null,
    
    /**
     * Завантажити та відобразити список клубів користувача (головна сторінка)
     */
    async loadMyClubs() {
        try {
            UI.setLoading(true);
            console.log('🔍 Завантажую клуби користувача...');
            const clubs = await API.clubs.getMy();
            
            // ДІАГНОСТИКА
            console.log('Clubs loaded:', clubs);
            console.log('Clubs count:', clubs.length);
            
            const container = document.getElementById('my-clubs-list');
            const emptyState = document.getElementById('clubs-empty-state');
            
            if (clubs.length === 0) {
                console.log('📭 Клубів не знайдено, показую empty state');
                container.style.display = 'none';
                emptyState.style.display = 'block';
                return;
            }
            
            console.log('📚 Знайдено клубів:', clubs.length);
            emptyState.style.display = 'none';
            container.style.display = 'block';
            
            container.innerHTML = clubs.map(club => {
                // Визначаємо роль користувача в клубі
                const userTelegramId = tg.initDataUnsafe?.user?.id?.toString();
                console.log('👤 User Telegram ID:', userTelegramId);
                console.log('🏛️ Club owner ID:', club.owner_id);
                const isOwner = club.owner_id === userTelegramId;
                const roleText = isOwner ? 'Власник' : 'Учасник';
                const roleClass = isOwner ? 'owner' : 'member';
                
                return `
                    <div class="club-card" data-club-id="${club.id}" onclick="ClubsUI.openClub(${club.id}, '${club.name}')">
                        <div class="club-header">
                            <div class="club-name">${club.name}</div>
                            <span class="status status-${roleClass}">${roleText}</span>
                        </div>
                        ${club.description ? `<div class="club-description">${club.description}</div>` : ''}
                        <div class="club-stats">
                            <div class="club-stat">
                                <button class="btn-copy" onclick="ClubsUI.copyInviteCode(event, '${club.invite_code}')" title="Копіювати код">📋</button>
                                <span> ${club.invite_code}</span>
                            </div>
                            <div class="club-stat">
                                <span>${club.is_public ? '🌐 Публічний' : '🔒 Приватний'}</span>
                            </div>
                            <div class="club-stat">
                                <span>👥 ${club.members_count || 1}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('❌ Error loading clubs:', error);
            console.error('Error details:', error.message);
            if (tg.showAlert) {
                tg.showAlert(`Помилка завантаження клубів: ${error.message}`);
            }
        } finally {
            UI.setLoading(false);
        }
    },
    
    /**
     * Відкрити деталі клубу (показати книги)
     */
    async openClub(clubId, clubName) {
        ClubsUI.currentClubId = clubId;
        
        // Оновити заголовок
        document.getElementById('header-title').textContent = `📚 ${clubName}`;
        document.getElementById('back-button').style.display = 'block';
        
        // Переключити view
        document.getElementById('clubs-list-view').classList.remove('active');
        document.getElementById('club-detail-view').classList.add('active');
        
        // Завантажити книги клубу
        await UI.loadBooks(clubId);
    },
    
    /**
     * Повернутися до списку клубів
     */
    backToClubsList() {
        ClubsUI.currentClubId = null;
        
        document.getElementById('header-title').textContent = '📚 Мої клуби';
        document.getElementById('back-button').style.display = 'none';
        
        document.getElementById('club-detail-view').classList.remove('active');
        document.getElementById('clubs-list-view').classList.add('active');
    },
    
    /**
     * Копіювати код запрошення в буфер обміну
     */
    async copyInviteCode(event, inviteCode) {
        // Зупиняємо event propagation, щоб не відкрився клуб
        event.stopPropagation();
        
        try {
            // Спробуємо використати modern Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(inviteCode);
                console.log('✅ Код скопійовано через Clipboard API:', inviteCode);
            } else {
                // Fallback для старих браузерів або HTTP
                const textArea = document.createElement('textarea');
                textArea.value = inviteCode;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                console.log('✅ Код скопійовано через fallback:', inviteCode);
            }
            
            // Показуємо успішне повідомлення
            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }
            
            if (tg.showAlert) {
                tg.showAlert(`📋 Код скопійовано: ${inviteCode}`);
            } else {
                // Fallback для браузерів без Telegram WebApp
                alert(`📋 Код скопійовано: ${inviteCode}`);
            }
            
        } catch (error) {
            console.error('❌ Помилка копіювання:', error);
            
            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('error');
            }
            
            // Показуємо код користувачу для ручного копіювання
            const message = `Не вдалося скопіювати автоматично.\nКод запрошення: ${inviteCode}`;
            if (tg.showAlert) {
                tg.showAlert(message);
            } else {
                alert(message);
            }
        }
    }
};

window.ClubsUI = ClubsUI;
