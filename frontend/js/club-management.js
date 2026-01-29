// Club Management Module
const ClubManagement = {
    currentClubId: null,
    currentClubData: null,
    currentUserRole: null,
    
    /**
     * Відкрити модальне вікно управління
     */
    async open(clubId, clubData) {
        this.currentClubId = clubId;
        this.currentClubData = clubData;
        this.currentUserRole = clubData.user_role?.toUpperCase();
        
        const modal = document.getElementById('club-management-modal');
        modal.style.display = 'flex';
        
        // Завантажуємо дані для активної вкладки
        await this.loadMembers();
    },
    
    /**
     * Закрити модальне вікно
     */
    close() {
        const modal = document.getElementById('club-management-modal');
        modal.style.display = 'none';
        this.currentClubId = null;
        this.currentClubData = null;
        this.currentUserRole = null;
    },
    
    /**
     * Перемкнути вкладку
     */
    switchTab(tabName) {
        // Оновлюємо активну кнопку
        document.querySelectorAll('.management-tab').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Оновлюємо активний контент
        document.querySelectorAll('.management-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Завантажуємо дані для вкладки
        switch(tabName) {
            case 'members':
                this.loadMembers();
                break;
            case 'requests':
                this.loadRequests();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    },
    
    /**
     * Завантажити список учасників
     */
    async loadMembers() {
        const container = document.getElementById('members-list');
        
        try {
            UIUtils.showLoader();
            const members = await API.clubs.getMembers(this.currentClubId);
            
            if (members.length === 0) {
                container.innerHTML = `
                    <div class="management-empty-state">
                        <div class="empty-icon">👥</div>
                        <p>Учасників не знайдено</p>
                    </div>
                `;
                return;
            }
            
            const currentUserId = tg.initDataUnsafe?.user?.id?.toString();
            const isOwner = this.currentUserRole === 'OWNER';
            const isAdmin = this.currentUserRole === 'ADMIN';
            
            container.innerHTML = members.map(member => {
                const memberRole = member.role.toUpperCase();
                const isCurrentUser = member.user_id === currentUserId;
                
                // Визначаємо які кнопки показувати
                let actionsHTML = '';
                
                if (!isCurrentUser && (isOwner || isAdmin)) {
                    // OWNER може робити все
                    if (isOwner && memberRole !== 'OWNER') {
                        if (memberRole === 'ADMIN') {
                            actionsHTML += `
                                <button class="member-action-btn btn-remove-admin" 
                                        onclick="ClubManagement.changeRole('${member.user_id}', 'MEMBER')"
                                        title="Зняти права адміністратора">
                                    ⬇️ Зняти адміна
                                </button>
                            `;
                        } else {
                            actionsHTML += `
                                <button class="member-action-btn btn-make-admin" 
                                        onclick="ClubManagement.changeRole('${member.user_id}', 'ADMIN')"
                                        title="Призначити адміністратором">
                                    ⬆️ Зробити адміном
                                </button>
                            `;
                        }
                        
                        actionsHTML += `
                            <button class="member-action-btn btn-remove-member" 
                                    onclick="ClubManagement.removeMember('${member.user_id}', '${UIUtils.escapeHtml(member.user_name || member.username)}')"
                                    title="Видалити з клубу">
                                🗑️ Видалити
                            </button>
                        `;
                    }
                    // ADMIN може тільки видаляти звичайних учасників
                    else if (isAdmin && memberRole === 'MEMBER') {
                        actionsHTML += `
                            <button class="member-action-btn btn-remove-member" 
                                    onclick="ClubManagement.removeMember('${member.user_id}', '${UIUtils.escapeHtml(member.user_name || member.username)}')"
                                    title="Видалити з клубу">
                                🗑️ Видалити
                            </button>
                        `;
                    }
                }
                
                // Бейдж ролі
                const roleBadgeClass = memberRole.toLowerCase();
                const roleText = memberRole === 'OWNER' ? '👑 Власник' : 
                                memberRole === 'ADMIN' ? '⚙️ Адміністратор' : 
                                '✓ Учасник';
                
                return `
                    <div class="member-item">
                        <div class="member-info">
                            <div class="member-name">${UIUtils.escapeHtml(member.user_name || member.username || 'Користувач')}</div>
                            ${member.username ? `<div class="member-username">@${UIUtils.escapeHtml(member.username)}</div>` : ''}
                            <span class="member-role-badge ${roleBadgeClass}">${roleText}</span>
                        </div>
                        ${actionsHTML ? `<div class="member-actions">${actionsHTML}</div>` : ''}
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Error loading members:', error);
            UIUtils.showError('Помилка завантаження учасників');
            container.innerHTML = `
                <div class="management-empty-state">
                    <div class="empty-icon">❌</div>
                    <p>Помилка завантаження</p>
                </div>
            `;
        } finally {
            UIUtils.hideLoader();
        }
    },
    
    /**
     * Змінити роль учасника
     */
    async changeRole(userId, newRole) {
        try {
            tg.HapticFeedback.impactOccurred('medium');
            
            const roleText = newRole === 'ADMIN' ? 'адміністратором' : 'звичайним учасником';
            
            if (!confirm(`Призначити цього користувача ${roleText}?`)) {
                return;
            }
            
            UIUtils.showLoader();
            await API.clubs.updateMemberRole(this.currentClubId, userId, newRole);
            
            UIUtils.showSuccess(`Роль успішно змінено`);
            tg.HapticFeedback.notificationOccurred('success');
            
            // Перезавантажуємо список
            await this.loadMembers();
            
        } catch (error) {
            console.error('Error changing role:', error);
            UIUtils.showError(error.message || 'Помилка зміни ролі');
            tg.HapticFeedback.notificationOccurred('error');
        } finally {
            UIUtils.hideLoader();
        }
    },
    
    /**
     * Видалити учасника
     */
    async removeMember(userId, userName) {
        try {
            tg.HapticFeedback.impactOccurred('medium');
            
            if (!confirm(`Видалити ${userName} з клубу?`)) {
                return;
            }
            
            UIUtils.showLoader();
            await API.clubs.removeMember(this.currentClubId, userId);
            
            UIUtils.showSuccess('Учасника видалено');
            tg.HapticFeedback.notificationOccurred('success');
            
            // Перезавантажуємо список
            await this.loadMembers();
            
        } catch (error) {
            console.error('Error removing member:', error);
            UIUtils.showError(error.message || 'Помилка видалення учасника');
            tg.HapticFeedback.notificationOccurred('error');
        } finally {
            UIUtils.hideLoader();
        }
    },
    
    /**
     * Завантажити заявки на вступ
     */
    async loadRequests() {
        const container = document.getElementById('management-requests-list');
        
        try {
            UIUtils.showLoader();
            const requests = await API.clubs.getJoinRequests(this.currentClubId, 'pending');
            
            if (requests.length === 0) {
                container.innerHTML = `
                    <div class="management-empty-state">
                        <div class="empty-icon">📩</div>
                        <p>Немає нових заявок</p>
                    </div>
                `;
                return;
            }
            
            // Рендеримо заявки напряму в контейнер
            container.innerHTML = requests.map(request => {
                const initials = request.user_name ? request.user_name.charAt(0).toUpperCase() : '?';
                const formattedDate = new Date(request.created_at).toLocaleDateString('uk-UA', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                
                return `
                    <div class="request-item">
                        <div class="request-avatar">${initials}</div>
                        <div class="request-info">
                            <div class="request-user">
                                ${UIUtils.escapeHtml(request.user_name || 'Користувач')}
                                ${request.username ? `<span class="request-username">@${UIUtils.escapeHtml(request.username)}</span>` : ''}
                            </div>
                            <div class="request-date">${formattedDate}</div>
                        </div>
                        <div class="request-actions">
                            <button class="btn btn-success btn-sm" onclick="ClubManagement.handleRequest(${request.id}, 'approved')">
                                ✓ Прийняти
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="ClubManagement.handleRequest(${request.id}, 'rejected')">
                                ✕ Відхилити
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Error loading requests:', error);
            UIUtils.showError('Помилка завантаження заявок');
            container.innerHTML = `
                <div class="management-empty-state">
                    <div class="empty-icon">❌</div>
                    <p>Помилка завантаження</p>
                </div>
            `;
        } finally {
            UIUtils.hideLoader();
        }
    },
    
    /**
     * Обробити заявку на вступ
     */
    async handleRequest(requestId, status) {
        try {
            tg.HapticFeedback.impactOccurred('medium');
            
            UIUtils.showLoader();
            await API.clubs.handleJoinRequest(this.currentClubId, requestId, status);
            
            const message = status === 'approved' ? 'Заявку прийнято' : 'Заявку відхилено';
            UIUtils.showSuccess(message);
            tg.HapticFeedback.notificationOccurred('success');
            
            // Перезавантажуємо список заявок
            await this.loadRequests();
            
            // Оновлюємо лічильник заявок в header
            if (ClubsDetail.currentClubId === this.currentClubId) {
                await ClubsDetail.loadRequestsCount(this.currentClubId);
            }
            
        } catch (error) {
            console.error('Error handling request:', error);
            UIUtils.showError(error.message || 'Помилка обробки заявки');
            tg.HapticFeedback.notificationOccurred('error');
        } finally {
            UIUtils.hideLoader();
        }
    },
    
    /**
     * Завантажити налаштування клубу
     */
    async loadSettings() {
        const container = document.getElementById('club-settings-form');
        
        container.innerHTML = `
            <div class="form-group">
                <label class="form-label" for="settings-club-name">Назва клубу</label>
                <input type="text" id="settings-club-name" class="form-input" 
                       value="${UIUtils.escapeHtml(this.currentClubData.name)}" maxlength="255">
            </div>
            
            <div class="form-group">
                <label class="form-label" for="settings-club-description">Опис</label>
                <textarea id="settings-club-description" class="form-textarea" 
                          rows="4" maxlength="2000">${UIUtils.escapeHtml(this.currentClubData.description || '')}</textarea>
            </div>
            
            <div class="form-group">
                <label class="form-checkbox">
                    <input type="checkbox" id="settings-is-public" 
                           ${this.currentClubData.is_public ? 'checked' : ''}>
                    <span>Публічний клуб (видимий у пошуку)</span>
                </label>
            </div>
            
            <div class="form-group">
                <label class="form-checkbox">
                    <input type="checkbox" id="settings-requires-approval" 
                           ${this.currentClubData.requires_approval ? 'checked' : ''}>
                    <span>Потрібне схвалення заявок</span>
                </label>
            </div>
            
            <div class="settings-actions">
                <button class="btn btn-secondary" onclick="ClubManagement.close()">Скасувати</button>
                <button class="btn btn-primary" onclick="ClubManagement.saveSettings()">💾 Зберегти зміни</button>
            </div>
            
            ${this.currentUserRole === 'OWNER' ? `
                <div class="settings-danger-zone">
                    <h3>⚠️ Небезпечна зона</h3>
                    <p>Видалення клубу є незворотною дією. Всі дані будуть втрачені.</p>
                    <button class="btn btn-danger" onclick="ClubManagement.deleteClub()">
                        🗑️ Видалити клуб
                    </button>
                </div>
            ` : ''}
        `;
    },
    
    /**
     * Зберегти налаштування
     */
    async saveSettings() {
        try {
            tg.HapticFeedback.impactOccurred('medium');
            
            const name = document.getElementById('settings-club-name').value.trim();
            const description = document.getElementById('settings-club-description').value.trim();
            const isPublic = document.getElementById('settings-is-public').checked;
            const requiresApproval = document.getElementById('settings-requires-approval').checked;
            
            if (!name) {
                UIUtils.showError('Назва клубу не може бути порожньою');
                return;
            }
            
            UIUtils.showLoader();
            
            const updatedClub = await API.clubs.update(this.currentClubId, {
                name,
                description,
                is_public: isPublic,
                requires_approval: requiresApproval
            });
            
            UIUtils.showSuccess('Налаштування збережено');
            tg.HapticFeedback.notificationOccurred('success');
            
            // Оновлюємо поточні дані
            this.currentClubData = { ...this.currentClubData, ...updatedClub };
            
            // Оновлюємо header з новою назвою
            document.getElementById('header-title').textContent = name;
            document.getElementById('club-detail-name').textContent = name;
            
            // Закриваємо модалку
            setTimeout(() => this.close(), 1000);
            
        } catch (error) {
            console.error('Error saving settings:', error);
            UIUtils.showError(error.message || 'Помилка збереження налаштувань');
            tg.HapticFeedback.notificationOccurred('error');
        } finally {
            UIUtils.hideLoader();
        }
    },
    
    /**
     * Видалити клуб
     */
    async deleteClub() {
        try {
            tg.HapticFeedback.impactOccurred('heavy');
            
            const clubName = this.currentClubData.name;
            
            if (!confirm(`Ви впевнені, що хочете видалити клуб "${clubName}"?\n\nЦя дія незворотня!`)) {
                return;
            }
            
            if (!confirm('Останнє попередження! Видалити клуб назавжди?')) {
                return;
            }
            
            UIUtils.showLoader();
            
            await API.clubs.delete(this.currentClubId);
            
            UIUtils.showSuccess('Клуб видалено');
            tg.HapticFeedback.notificationOccurred('success');
            
            // Закриваємо модалку та повертаємось до списку клубів
            this.close();
            ClubsList.showClubsList();
            ClubsList.loadMyClubs();
            
        } catch (error) {
            console.error('Error deleting club:', error);
            UIUtils.showError(error.message || 'Помилка видалення клубу');
            tg.HapticFeedback.notificationOccurred('error');
        } finally {
            UIUtils.hideLoader();
        }
    }
};

// Ініціалізація обробників подій
document.addEventListener('DOMContentLoaded', () => {
    // Закриття модального вікна
    document.getElementById('close-management-modal')?.addEventListener('click', () => {
        ClubManagement.close();
    });
    
    // Перемикання вкладок
    document.querySelectorAll('.management-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.currentTarget.dataset.tab;
            ClubManagement.switchTab(tabName);
        });
    });
    
    // Закриття по кліку поза модалкою
    document.getElementById('club-management-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'club-management-modal') {
            ClubManagement.close();
        }
    });
});

// Експорт
window.ClubManagement = ClubManagement;
