// Clubs UI Module
const ClubsUI = {
    currentClubId: null,
    
    /**
     * Завантажити та відобразити список клубів користувача (головна сторінка)
     */
    async loadMyClubs() {
        try {
            UI.setLoading(true);
            const clubs = await API.clubs.getMy();
            
            // ДІАГНОСТИКА
            console.log('Clubs loaded:', clubs);
            
            const container = document.getElementById('my-clubs-list');
            const emptyState = document.getElementById('clubs-empty-state');
            
            if (clubs.length === 0) {
                container.style.display = 'none';
                emptyState.style.display = 'block';
                return;
            }
            
            emptyState.style.display = 'none';
            container.style.display = 'block';
            
            container.innerHTML = clubs.map(club => {
                // Визначаємо роль користувача в клубі
                const userTelegramId = Telegram.WebApp.initDataUnsafe?.user?.id?.toString();
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
                                <span>📋 ${club.invite_code}</span>
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
            console.error('Error loading clubs:', error);
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
    }
};

window.ClubsUI = ClubsUI;
