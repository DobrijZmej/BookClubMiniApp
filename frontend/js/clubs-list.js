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
                const roleText = '✓ Ви учасник';
                const roleClass = isOwner ? 'owner' : 'member';
                
                const coverImageUrl = club.cover_image_url || '';
                const hasImage = coverImageUrl && coverImageUrl.trim() !== '';
                const gradientIndex = (club.id % 5) + 1;
                const gradientClass = hasImage ? '' : `gradient-${gradientIndex}`;
                const coverStyle = hasImage ? `style="background-image: url('${coverImageUrl}')"` : '';
                const coverImageClass = hasImage ? '' : `no-image ${gradientClass}`;
                const booksCount = club.books_count || 0;
                
                // Статус клубу
                const clubType = club.is_public ? 'Публічний' : 'Закритий клуб';
                
                return `
                    <div class="club-card" data-club-id="${club.id}">
                        <div class="club-avatar ${coverImageClass}" ${coverStyle}></div>
                        <div class="club-info">
                            <div class="club-title-row">
                                <div class="club-name">${club.name}</div>
                                <span class="club-status ${roleClass}">${roleText}</span>
                            </div>
                            <div class="club-type">${clubType}</div>
                            <div class="club-stats">
                                <div class="club-stat">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                        <circle cx="9" cy="7" r="4"/>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                    </svg>
                                    <span>${club.members_count || 1} учасників</span>
                                </div>
                                <div class="club-stat">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                                    </svg>
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
        document.getElementById('club-detail-view').classList.remove('active');
        document.getElementById('club-requests-view').classList.remove('active');
        document.getElementById('clubs-list-view').classList.add('active');
    }
};

window.ClubsList = ClubsList;
