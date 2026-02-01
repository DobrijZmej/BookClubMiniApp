// Clubs Detail Module - Деталі клубу та управління
const ClubsDetail = {
    currentClubId: null,
    currentClubData: null,
    membersCache: null, // Кеш учасників клубу
    membersTagCloudVisible: false, // Стан хмари тегів

    async openClub(clubId, clubName) {
        this.currentClubId = clubId;
        
        // Очищуємо кеш при зміні клубу
        this.clearMembersCache();
        
        // Оновлюємо header
        document.getElementById('header-title').textContent = clubName;
        document.getElementById('back-button').style.display = 'block';
        
        // Показуємо кнопки клубу, ховаємо кнопки головної
        document.getElementById('add-book-btn').style.display = 'flex';
        document.getElementById('add-club-btn').style.display = 'none';
        document.getElementById('join-code-btn').style.display = 'none';
        
        // Перемикаємо views
        document.getElementById('clubs-list-view').classList.remove('active');
        document.getElementById('club-detail-view').classList.add('active');
        
        // Завантажуємо дані клубу
        await this.loadClubDetails(clubId);
        await this.checkClubPermissions(clubId);
        
        // Ініціалізуємо хмару тегів учасників
        this.initMembersTagCloud();
        
        await UIBooks.loadBooks(clubId);
    },

    async loadClubDetails(clubId) {
        try {
            const club = await API.clubs.getDetails(clubId);
            this.currentClubData = club;
            
            // Оновлюємо інформацію про клуб
            document.getElementById('club-detail-name').textContent = club.name;
            
            // Опис клубу - ховаємо якщо відсутній
            const descBlock = document.getElementById('club-detail-description');
            if (club.description && club.description.trim()) {
                descBlock.textContent = club.description;
                descBlock.style.display = 'block';
            } else {
                descBlock.style.display = 'none';
            }
            
            // Оновлюємо статистику
            document.getElementById('club-members-count').textContent = `${club.members_count || 0} учасників`;
            document.getElementById('club-books-count').textContent = `${club.books_count || 0} книг у обігу`;
            
            // Оновлюємо аватар
            const avatar = document.getElementById('club-detail-avatar');
            if (club.cover_url) {
                avatar.style.backgroundImage = `url('${club.cover_url}')`;
                avatar.style.backgroundSize = 'cover';
            } else {
                avatar.style.backgroundImage = "url('images/club_default_avatar.png')";
                avatar.style.backgroundSize = '60%';
                avatar.style.backgroundRepeat = 'no-repeat';
                avatar.style.backgroundPosition = 'center';
            }
        } catch (error) {
            console.error('❌ Error loading club details:', error);
        }
    },

    async checkClubPermissions(clubId) {
        try {
            // Перевіряємо роль користувача
            const userRole = this.currentClubData?.user_role?.toUpperCase();
            const isOwnerOrAdmin = userRole === 'OWNER' || userRole === 'ADMIN';
            
            // Показуємо/ховаємо кнопку управління
            const manageBtn = document.getElementById('manage-club-btn');
            const requestsBtn = document.getElementById('view-club-requests-btn');
            
            if (isOwnerOrAdmin) {
                if (manageBtn) {
                    manageBtn.style.display = 'flex';
                    manageBtn.onclick = () => {
                        ClubManagement.open(this.currentClubId, this.currentClubData);
                    };
                }
                
                // Завантажуємо кількість заявок для бейджа
                if (requestsBtn) {
                    requestsBtn.style.display = 'flex';
                    await this.loadRequestsCount(clubId);
                }
            } else {
                if (manageBtn) manageBtn.style.display = 'none';
                if (requestsBtn) requestsBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('❌ Error checking permissions:', error);
        }
    },

    async loadRequestsCount(clubId) {
        try {
            const requests = await API.clubs.getJoinRequests(clubId, 'pending');
            const count = requests.length;
            const badge = document.getElementById('requests-count');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline-flex' : 'none';
            }
        } catch (error) {
            console.error('❌ Error loading requests count:', error);
        }
    },

    /**
     * Ініціалізує обробник для клікабельної кількості учасників
     */
    initMembersTagCloud() {
        const membersCount = document.getElementById('club-members-count');
        if (membersCount) {
            membersCount.onclick = () => this.toggleMembersTagCloud();
        }
    },

    /**
     * Перемикає відображення хмари тегів учасників
     */
    async toggleMembersTagCloud() {
        const tagCloud = document.getElementById('members-tag-cloud');
        
        if (this.membersTagCloudVisible) {
            // Приховуємо хмару
            tagCloud.style.display = 'none';
            this.membersTagCloudVisible = false;
        } else {
            // Показуємо хмару
            await this.loadAndRenderMembers();
            tagCloud.style.display = 'flex';
            this.membersTagCloudVisible = true;
        }
    },

    /**
     * Завантажує учасників клубу (з кешем)
     */
    async loadMembers() {
        if (this.membersCache && this.membersCache.clubId === this.currentClubId) {
            return this.membersCache.members;
        }

        try {
            const members = await API.clubs.getMembers(this.currentClubId);
            this.membersCache = {
                clubId: this.currentClubId,
                members: members
            };
            return members;
        } catch (error) {
            console.error('❌ Error loading members:', error);
            if (tg.showAlert) {
                tg.showAlert(`Помилка завантаження учасників: ${error.message}`);
            }
            return [];
        }
    },

    /**
     * Завантажує та рендерить учасників у хмарі тегів
     */
    async loadAndRenderMembers() {
        const members = await this.loadMembers();
        this.renderMembersTagCloud(members);
    },

    /**
     * Рендерить хмару тегів учасників
     */
    renderMembersTagCloud(members) {
        const tagCloud = document.getElementById('members-tag-cloud');
        
        if (!members || members.length === 0) {
            tagCloud.innerHTML = '<div style="color: var(--color-text-secondary); font-size: 0.875rem;">Учасники відсутні</div>';
            return;
        }

        // Сортуємо за display_name (user_name або username)
        const sortedMembers = [...members].sort((a, b) => {
            const nameA = (a.user_name || a.username || '').toLowerCase();
            const nameB = (b.user_name || b.username || '').toLowerCase();
            return nameA.localeCompare(nameB, 'uk');
        });

        // Генеруємо теги
        tagCloud.innerHTML = sortedMembers.map(member => {
            const displayName = member.user_name || member.username || 'Невідомо';
            return `
                <div class="member-tag" data-member-name="${displayName}">
                    <span class="icon-emoji">🔍</span>
                    <span>${displayName}</span>
                </div>
            `;
        }).join('');

        // Додаємо обробники подій
        tagCloud.querySelectorAll('.member-tag').forEach(tag => {
            tag.onclick = () => {
                const memberName = tag.getAttribute('data-member-name');
                this.filterBooksByMember(memberName);
            };
        });
    },

    /**
     * Фільтрує книги по вибраному учаснику
     */
    filterBooksByMember(memberName) {
        // Закриваємо хмару тегів
        document.getElementById('members-tag-cloud').style.display = 'none';
        this.membersTagCloudVisible = false;

        // Вставляємо ім'я учасника в пошук
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = memberName;
            // Викликаємо пошук
            UIBooks.loadBooks(this.currentClubId);
        }
    },

    /**
     * Очищує кеш учасників (викликати при зміні клубу)
     */
    clearMembersCache() {
        this.membersCache = null;
        this.membersTagCloudVisible = false;
        const tagCloud = document.getElementById('members-tag-cloud');
        if (tagCloud) {
            tagCloud.style.display = 'none';
        }
    }
};

window.ClubsDetail = ClubsDetail;
