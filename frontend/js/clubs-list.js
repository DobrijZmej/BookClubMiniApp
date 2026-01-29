// Clubs List Module - Відображення списку клубів
const ClubsList = {
    async loadMyClubs() {
        try {
            UIUtils.setLoading(true);
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
            
            container.innerHTML = clubs.map((club) => {
                const userTelegramId = tg.initDataUnsafe?.user?.id?.toString();
                const isOwner = club.owner_id === userTelegramId;
                
                // Визначаємо текст та клас ролі
                let roleText = '✓ Ви учасник';
                let roleClass = 'member';
                
                if (club.user_role) {
                    switch (club.user_role.toUpperCase()) {
                        case 'PENDING':
                            roleText = '⏳ Заявка на розгляді';
                            roleClass = 'pending';
                            break;
                        case 'OWNER':
                            roleText = '👑 Ви власник';
                            roleClass = 'owner';
                            break;
                        case 'ADMIN':
                            roleText = '⚙️ Ви адміністратор';
                            roleClass = 'admin';
                            break;
                        case 'MEMBER':
                            roleText = '✓ Ви учасник';
                            roleClass = 'member';
                            break;
                        default:
                            roleText = '✓ Ви учасник';
                            roleClass = 'member';
                    }
                }
                
                // Avatar/Cover image
                const coverImageUrl = club.cover_url || '';
                const hasImage = coverImageUrl && coverImageUrl.trim() !== '';
                
                let avatarStyle = '';
                let avatarClass = 'club-avatar';
                
                if (hasImage) {
                    avatarStyle = `style="background-image: url('${coverImageUrl}')"`;
                } else {
                    // Використовуємо дефолтну аватарку
                    const defaultAvatar = 'images/club_default_avatar.png';
                    avatarStyle = `style="background-image: url('${defaultAvatar}')"`;
                    avatarClass += ' default-avatar';
                }
                
                const booksCount = club.books_count || 0;
                
                // Статус клубу
                const clubType = club.is_public ? 'Публічний' : 'Закритий клуб';
                
                // Додаємо клас pending для картки якщо це pending заявка
                const cardClass = roleClass === 'pending' ? 'club-card pending' : 'club-card';
                
                return `
                    <div class="${cardClass}" data-club-id="${club.id}">
                        <div class="${avatarClass}" ${avatarStyle}></div>
                        <div class="club-info">
                            <div class="club-title-row">
                                <div class="club-name">${club.name}</div>
                                <span class="club-status ${roleClass}">${roleText}</span>
                            </div>
                            <div class="club-type">${clubType}</div>
                            <div class="club-stats">
                                <div class="club-stat">
                                    <span class="icon-emoji">👥</span>
                                    <span>${club.members_count || 1} учасників</span>
                                </div>
                                <div class="club-stat">
                                    <span class="icon-emoji">📚</span>
                                    <span>${booksCount} книг у обігу</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            document.querySelectorAll('.club-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.copy-btn')) return;
                    
                    const clubId = parseInt(card.dataset.clubId);
                    const clubName = card.querySelector('.club-name').textContent;
                    const roleStatus = card.querySelector('.club-status');
                    
                    // Перевірка чи це pending клуб
                    if (roleStatus && roleStatus.classList.contains('pending')) {
                        if (tg.showAlert) {
                            tg.showAlert('⏳ Ваша заявка на розгляді. Очікуйте підтвердження від адміністратора клубу.');
                        }
                        if (tg.HapticFeedback) {
                            tg.HapticFeedback.notificationOccurred('warning');
                        }
                        return;
                    }
                    
                    ClubsDetail.openClub(clubId, clubName);
                });
            });
        } catch (error) {
            console.error('❌ Error loading clubs:', error);
            if (tg.showAlert) tg.showAlert(`Помилка: ${error.message}`);
        } finally {
            UIUtils.setLoading(false);
        }
    },

    async copyInviteCode(event, inviteCode) {
        event.stopPropagation();
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(inviteCode);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = inviteCode;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            if (tg.showAlert) tg.showAlert(`📋 Код скопійовано: ${inviteCode}`);
        } catch (error) {
            console.error('❌ Помилка копіювання:', error);
            if (tg.showAlert) tg.showAlert(`Не вдалося скопіювати.\nКод: ${inviteCode}`);
        }
    },

    backToClubsList() {
        if (typeof ClubsDetail !== 'undefined') ClubsDetail.currentClubId = null;
        document.getElementById('header-title').textContent = 'Книжковий Обмін';
        document.getElementById('back-button').style.display = 'none';
        
        // Ховаємо кнопки клубу, показуємо кнопки головної
        document.getElementById('add-book-btn').style.display = 'none';
        const editBtn = document.getElementById('edit-club-btn');
        const deleteBtn = document.getElementById('delete-club-btn');
        const manageBtn = document.getElementById('manage-club-btn');
        const requestsBtn = document.getElementById('view-club-requests-btn');
        
        if (editBtn) editBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';
        if (manageBtn) manageBtn.style.display = 'none';
        if (requestsBtn) requestsBtn.style.display = 'none';
        
        document.getElementById('add-club-btn').style.display = 'flex';
        document.getElementById('join-code-btn').style.display = 'flex';
        
        // Перемикаємо views
        document.getElementById('club-detail-view').classList.remove('active');
        document.getElementById('club-requests-view').classList.remove('active');
        document.getElementById('clubs-list-view').classList.add('active');
        
        // Завантажуємо список клубів
        this.showClubsList();
        this.loadMyClubs();
    }
};

window.ClubsList = ClubsList;
