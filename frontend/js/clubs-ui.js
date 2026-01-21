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
        document.getElementById('header-title').dataset.clubName = clubName;
        document.getElementById('back-button').style.display = 'block';
        
        // Переключити view
        document.getElementById('clubs-list-view').classList.remove('active');
        document.getElementById('club-detail-view').classList.add('active');
        
        // Перевірити чи користувач є власником і показати кнопку заявок
        await this.checkClubPermissions(clubId);
        
        // Завантажити книги клубу
        await UI.loadBooks(clubId);
    },
    
    /**
     * Перевірити права доступу до клубу і показати відповідні кнопки
     */
    async checkClubPermissions(clubId) {
        try {
            const userTelegramId = tg.initDataUnsafe?.user?.id?.toString();
            console.log('👤 Checking permissions for user:', userTelegramId);
            
            // Отримуємо деталі клубу та членство
            const clubDetails = await API.clubs.getDetails(clubId);
            const isOwnerOrAdmin = clubDetails.owner_id === userTelegramId;
            
            console.log('🏛️ Club owner:', clubDetails.owner_id);
            console.log('🔑 Is owner/admin:', isOwnerOrAdmin);
            
            if (isOwnerOrAdmin) {
                // Показуємо кнопку заявок
                const requestsBtn = document.getElementById('view-club-requests-btn');
                requestsBtn.style.display = 'block';
                
                // Завантажуємо кількість заявок
                await this.loadRequestsCount(clubId);
            } else {
                // Ховаємо кнопку заявок
                document.getElementById('view-club-requests-btn').style.display = 'none';
            }
        } catch (error) {
            console.error('❌ Error checking permissions:', error);
        }
    },
    
    /**
     * Завантажити кількість pending заявок
     */
    async loadRequestsCount(clubId) {
        try {
            const requests = await API.clubs.getJoinRequests(clubId, 'pending');
            const count = requests.length;
            
            const badge = document.getElementById('requests-count');
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-block' : 'none';
            
            console.log(`📝 Found ${count} pending requests for club ${clubId}`);
        } catch (error) {
            console.error('❌ Error loading requests count:', error);
        }
    },
    
    /**
     * Показати список заявок на вступ
     */
    async showClubRequests(clubId) {
        try {
            UI.setLoading(true);
            
            const requests = await API.clubs.getJoinRequests(clubId, 'pending');
            console.log('📝 Loaded requests:', requests);
            
            // Переключити на view заявок
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('club-requests-view').classList.add('active');
            document.getElementById('header-title').textContent = '📝 Заявки на вступ';
            
            this.renderRequests(requests);
        } catch (error) {
            console.error('❌ Error loading requests:', error);
        } finally {
            UI.setLoading(false);
        }
    },
    
    /**
     * Відобразити список заявок
     */
    renderRequests(requests) {
        const container = document.getElementById('requests-container');
        const emptyState = document.getElementById('requests-empty-state');
        
        if (!requests || requests.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        container.innerHTML = requests.map(request => {
            const initials = request.user_name ? request.user_name.charAt(0).toUpperCase() : '?';
            const formattedDate = new Date(request.created_at).toLocaleDateString('uk-UA', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            return `
                <div class="request-item">
                    <div class="request-header">
                        <div class="request-user">
                            <div class="request-avatar">${initials}</div>
                            <div class="request-info">
                                <h4>${UI.escapeHtml(request.user_name || 'Користувач')}</h4>
                                <div class="username">@${UI.escapeHtml(request.username || 'невідомо')}</div>
                            </div>
                        </div>
                        <div class="request-date">${formattedDate}</div>
                    </div>
                    
                    ${request.message ? `
                        <div class="request-message">
                            "${UI.escapeHtml(request.message)}"
                        </div>
                    ` : ''}
                    
                    <div class="request-actions">
                        <button class="btn-approve" onclick="ClubsUI.reviewRequest(${request.id}, 'approve')">
                            ✅ Схвалити
                        </button>
                        <button class="btn-reject" onclick="ClubsUI.reviewRequest(${request.id}, 'reject')">
                            ❌ Відхилити
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    /**
     * Розглянути заявку (схвалити або відхилити)
     */
    async reviewRequest(requestId, action) {
        try {
            if (!ClubsUI.currentClubId) {
                console.error('No active club selected');
                return;
            }
            
            tg.HapticFeedback.impactOccurred('medium');
            
            await API.clubs.reviewJoinRequest(ClubsUI.currentClubId, requestId, action);
            
            const actionText = action === 'approve' ? 'схвалено' : 'відхилено';
            tg.showAlert(`✅ Заявку ${actionText}!`);
            
            // Перезавантажуємо заявки
            await this.showClubRequests(ClubsUI.currentClubId);
            
            // Оновлюємо лічильник заявок
            await this.loadRequestsCount(ClubsUI.currentClubId);
            
        } catch (error) {
            console.error('❌ Error reviewing request:', error);
            tg.showAlert(`Помилка: ${error.message}`);
        }
    },
    
    /**
     * Повернутися до списку клубів
     */
    backToClubsList() {
        ClubsUI.currentClubId = null;
        
        document.getElementById('header-title').textContent = '📚 Мої клуби';
        document.getElementById('back-button').style.display = 'none';
        
        document.getElementById('club-detail-view').classList.remove('active');
        document.getElementById('club-requests-view').classList.remove('active');
        document.getElementById('clubs-list-view').classList.add('active');
    },
    
    /**
     * Повернутися до деталей клубу з заявок
     */
    backToClubDetails() {
        if (!ClubsUI.currentClubId) return;
        
        document.getElementById('club-requests-view').classList.remove('active');
        document.getElementById('club-detail-view').classList.add('active');
        
        // Відновлюємо назву клубу (можна зробити більш елегантно)
        const clubName = document.getElementById('header-title').dataset.clubName || 'Клуб';
        document.getElementById('header-title').textContent = `📚 ${clubName}`;
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
