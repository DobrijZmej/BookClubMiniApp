// Clubs UI Module
const ClubsUI = {
    /**
     * Завантажити та відобразити список клубів
     */
    async loadClubs() {
        try {
            UI.setLoading(true);
            const clubs = await API.clubs.getMy();
            
            const container = document.getElementById('clubs-list');
            
            if (clubs.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>🏛️ У вас поки немає клубів</p>
                        <p>Створіть свій клуб або приєднайтесь до існуючого!</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = clubs.map(club => `
                <div class="club-card" data-club-id="${club.id}">
                    <div class="club-card-header">
                        <div>
                            <div class="club-card-title">${club.name}</div>
                            <div class="club-card-code">Код: ${club.invite_code}</div>
                        </div>
                    </div>
                    ${club.description ? `<div class="club-card-description">${club.description}</div>` : ''}
                    <div class="club-card-footer">
                        <span>${club.is_public ? '🌐 Публічний' : '🔒 Приватний'}</span>
                        <span>${new Date(club.created_at).toLocaleDateString('uk-UA')}</span>
                    </div>
                </div>
            `).join('');
            
            // Додати обробники кліків
            container.querySelectorAll('.club-card').forEach(card => {
                card.addEventListener('click', () => {
                    const clubId = card.getAttribute('data-club-id');
                    ClubsUI.showClubDetails(clubId);
                });
            });
            
            // Оновити селектор активного клубу
            ClubsUI.updateActiveClubSelector(clubs);
            
        } catch (error) {
            console.error('Error loading clubs:', error);
            tg.showAlert('Помилка завантаження клубів');
        } finally {
            UI.setLoading(false);
        }
    },

    /**
     * Оновити селектор активного клубу
     */
    updateActiveClubSelector(clubs) {
        const selector = document.getElementById('active-club-selector');
        const select = document.getElementById('active-club-select');
        
        if (clubs.length === 0) {
            selector.style.display = 'none';
            return;
        }
        
        selector.style.display = 'block';
        
        select.innerHTML = clubs.map(club => `
            <option value="${club.chat_id}" ${CONFIG.CHAT_ID === club.chat_id ? 'selected' : ''}>
                ${club.name}
            </option>
        `).join('');
        
        // Обробник зміни клубу
        select.onchange = (e) => {
            CONFIG.CHAT_ID = e.target.value;
            tg.showAlert('Активний клуб змінено!');
            // Перезавантажити бібліотеку
            if (document.querySelector('.tab[data-view="library"]').classList.contains('active')) {
                UI.loadBooks();
            }
        };
    },

    /**
     * Показати деталі клубу
     */
    async showClubDetails(clubId) {
        try {
            UI.setLoading(true);
            const club = await API.clubs.getDetails(clubId);
            
            const modalBody = document.getElementById('club-modal-body');
            const modal = document.getElementById('club-modal');
            
            // Визначаємо роль користувача
            const currentUser = tg.initDataUnsafe.user;
            const myMembership = club.members.find(m => m.user_id === String(currentUser.id));
            const isOwner = myMembership?.role === 'owner';
            const isAdmin = myMembership?.role === 'admin' || isOwner;
            
            modalBody.innerHTML = `
                <h2>${club.name}</h2>
                ${club.description ? `<p class="text-muted">${club.description}</p>` : ''}
                
                <div style="margin: 15px 0;">
                    <strong>Код запрошення:</strong> 
                    <span style="font-family: monospace; background: rgba(0,0,0,0.05); padding: 4px 8px; border-radius: 4px;">
                        ${club.invite_code}
                    </span>
                    <button class="btn btn-sm" onclick="ClubsUI.copyInviteCode('${club.invite_code}')">
                        📋 Копіювати
                    </button>
                </div>
                
                <div style="margin: 15px 0;">
                    <strong>Учасників:</strong> ${club.member_count}
                </div>
                
                ${isAdmin ? `
                    <div style="margin: 15px 0;">
                        <button class="btn btn-secondary btn-sm" onclick="ClubsUI.showJoinRequests(${clubId})">
                            📬 Запити на приєднання
                        </button>
                    </div>
                ` : ''}
                
                <h3 style="margin-top: 20px;">Учасники</h3>
                <div class="members-list">
                    ${club.members.map(member => `
                        <div class="member-item">
                            <div class="member-info">
                                <div class="member-name">
                                    ${member.user_name || 'Користувач'}
                                    ${member.username ? `<span class="member-username">@${member.username}</span>` : ''}
                                </div>
                                <span class="club-role-badge role-${member.role}">${
                                    member.role === 'owner' ? 'Власник' :
                                    member.role === 'admin' ? 'Адмін' : 'Учасник'
                                }</span>
                            </div>
                            ${isOwner && member.role !== 'owner' ? `
                                <div class="member-actions">
                                    <button class="btn btn-danger btn-sm" onclick="ClubsUI.removeMember(${clubId}, '${member.user_id}', '${member.user_name}')">
                                        Видалити
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            
            modal.style.display = 'flex';
            
        } catch (error) {
            console.error('Error loading club details:', error);
            tg.showAlert('Помилка завантаження деталей клубу');
        } finally {
            UI.setLoading(false);
        }
    },

    /**
     * Копіювати код запрошення
     */
    copyInviteCode(code) {
        navigator.clipboard.writeText(code).then(() => {
            tg.showAlert('✅ Код скопійовано!');
        }).catch(() => {
            tg.showAlert('❌ Помилка копіювання');
        });
    },

    /**
     * Показати запити на приєднання
     */
    async showJoinRequests(clubId) {
        try {
            UI.setLoading(true);
            const requests = await API.clubs.getJoinRequests(clubId, 'pending');
            
            const modalBody = document.getElementById('club-modal-body');
            
            if (requests.length === 0) {
                modalBody.innerHTML = `
                    <h2>Запити на приєднання</h2>
                    <div class="empty-state">
                        <p>📭 Немає нових запитів</p>
                    </div>
                    <button class="btn btn-secondary" onclick="ClubsUI.showClubDetails(${clubId})">
                        Назад до клубу
                    </button>
                `;
                return;
            }
            
            modalBody.innerHTML = `
                <h2>Запити на приєднання</h2>
                <div style="margin-top: 20px;">
                    ${requests.map(req => `
                        <div class="request-item" id="request-${req.id}">
                            <div class="request-header">
                                <div>
                                    <div class="request-user">${req.user_name || 'Користувач'}</div>
                                    ${req.username ? `<div class="member-username">@${req.username}</div>` : ''}
                                </div>
                                <div class="request-date">${new Date(req.created_at).toLocaleDateString('uk-UA')}</div>
                            </div>
                            ${req.message ? `<div class="request-message">"${req.message}"</div>` : ''}
                            <div class="request-actions">
                                <button class="btn btn-approve btn-sm" onclick="ClubsUI.reviewRequest(${clubId}, ${req.id}, 'approve')">
                                    ✅ Схвалити
                                </button>
                                <button class="btn btn-reject btn-sm" onclick="ClubsUI.reviewRequest(${clubId}, ${req.id}, 'reject')">
                                    ❌ Відхилити
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-secondary" onclick="ClubsUI.showClubDetails(${clubId})" style="margin-top: 20px;">
                    Назад до клубу
                </button>
            `;
            
        } catch (error) {
            console.error('Error loading join requests:', error);
            tg.showAlert('Помилка завантаження запитів');
        } finally {
            UI.setLoading(false);
        }
    },

    /**
     * Розглянути запит на приєднання
     */
    async reviewRequest(clubId, requestId, action) {
        try {
            await API.clubs.reviewJoinRequest(clubId, requestId, action);
            
            tg.HapticFeedback.notificationOccurred('success');
            tg.showAlert(action === 'approve' ? '✅ Запит схвалено!' : '❌ Запит відхилено');
            
            // Видалити запит з UI
            document.getElementById(`request-${requestId}`)?.remove();
            
            // Перезавантажити запити
            setTimeout(() => ClubsUI.showJoinRequests(clubId), 500);
            
        } catch (error) {
            console.error('Error reviewing request:', error);
            tg.showAlert('Помилка обробки запиту');
        }
    },

    /**
     * Видалити учасника
     */
    async removeMember(clubId, userId, userName) {
        const confirmed = confirm(`Видалити ${userName} з клубу?`);
        if (!confirmed) return;
        
        try {
            await API.clubs.removeMember(clubId, userId);
            
            tg.HapticFeedback.notificationOccurred('success');
            tg.showAlert('✅ Учасника видалено');
            
            // Перезавантажити деталі клубу
            ClubsUI.showClubDetails(clubId);
            
        } catch (error) {
            console.error('Error removing member:', error);
            tg.showAlert('Помилка видалення учасника');
        }
    },

    /**
     * Закрити модальне вікно клубу
     */
    closeClubModal() {
        const modal = document.getElementById('club-modal');
        modal.style.display = 'none';
    }
};

// Експорт
window.ClubsUI = ClubsUI;
