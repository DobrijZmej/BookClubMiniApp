// Clubs UI Module
const ClubsUI = {
    currentClubId: null,
    currentChatId: null,
    
    /**
     * Завантажити та відобразити список клубів користувача (головна сторінка)
     */
    async loadMyClubs() {
        try {
            UI.setLoading(true);
            const clubs = await API.clubs.getMy();
            
            const container = document.getElementById('my-clubs-list');
            const emptyState = document.getElementById('clubs-empty-state');
            
            if (clubs.length === 0) {
                container.style.display = 'none';
                emptyState.style.display = 'block';
                return;
            }
            
            emptyState.style.display = 'none';
            container.style.display = 'block';
            
            container.innerHTML = clubs.map(club => `
                <div class="club-card" data-club-id="${club.id}" data-chat-id="${club.chat_id}" onclick="ClubsUI.openClub(${club.id}, '${club.chat_id}', '${club.name}')">
                    <div class="club-card-header">
                        <div>
                            <div class="club-card-title">${club.name}</div>
                            <span class="club-role-badge club-role-${club.role}">${club.role}</span>
                        </div>
                        <div class="club-card-code">📋 ${club.invite_code}</div>
                    </div>
                    ${club.description ? `<div class="club-card-description">${club.description}</div>` : ''}
                    <div class="club-card-footer">
                        <span>${club.is_public ? '🌐 Публічний' : '🔒 Приватний'}</span>
                        <span>👥 ${club.members_count || 1} членів</span>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Error loading clubs:', error);
        } finally {
            UI.setLoading(false);
        }
    },
    
    /**
     * Відкрити деталі клубу (показати книги)
     */
    async openClub(clubId, chatId, clubName) {
        ClubsUI.currentClubId = clubId;
        ClubsUI.currentChatId = chatId;
        
        // Оновити заголовок
        document.getElementById('header-title').textContent = `📚 ${clubName}`;
        document.getElementById('back-button').style.display = 'block';
        
        // Переключити view
        document.getElementById('clubs-list-view').classList.remove('active');
        document.getElementById('club-detail-view').classList.add('active');
        
        // Завантажити книги клубу
        await UI.loadBooks(chatId);
    },
    
    /**
     * Повернутися до списку клубів
     */
    backToClubsList() {
        ClubsUI.currentClubId = null;
        ClubsUI.currentChatId = null;
        
        document.getElementById('header-title').textContent = '📚 Мої клуби';
        document.getElementById('back-button').style.display = 'none';
        
        document.getElementById('club-detail-view').classList.remove('active');
        document.getElementById('clubs-list-view').classList.add('active');
    }
};

window.ClubsUI = ClubsUI;
