// Clubs Detail Module - Деталі клубу та управління
const ClubsDetail = {
    currentClubId: null,
    currentClubData: null,

    async openClub(clubId, clubName) {
        this.currentClubId = clubId;
        
        // Оновлюємо header
        document.getElementById('header-title').textContent = clubName;
        document.getElementById('back-button').style.display = 'block';
        
        // Показуємо кнопки клубу, ховаємо кнопки головної
        document.getElementById('add-book-btn').style.display = 'flex';
        document.getElementById('edit-club-btn').style.display = 'flex';
        document.getElementById('delete-club-btn').style.display = 'flex';
        document.getElementById('search-clubs-btn').style.display = 'none';
        document.getElementById('add-club-btn').style.display = 'none';
        document.getElementById('join-code-btn').style.display = 'none';
        
        // Перемикаємо views
        document.getElementById('clubs-list-view').classList.remove('active');
        document.getElementById('club-detail-view').classList.add('active');
        
        // Завантажуємо дані клубу
        await this.loadClubDetails(clubId);
        await this.checkClubPermissions(clubId);
        await UIBooks.loadBooks(clubId);
    },

    async loadClubDetails(clubId) {
        try {
            const club = await API.clubs.getDetails(clubId);
            this.currentClubData = club;
            
            // Оновлюємо інформацію про клуб
            document.getElementById('club-detail-name').textContent = club.name;
            document.getElementById('club-detail-description').textContent = club.description || 'Опис клубу відсутній';
            
            // Оновлюємо статистику
            document.getElementById('club-members-count').textContent = `${club.members_count || 0} учасників`;
            document.getElementById('club-books-count').textContent = `${club.books_count || 0} книг у обігу`;
            
            // Оновлюємо аватар
            const avatar = document.getElementById('club-detail-avatar');
            if (club.cover_image_url) {
                avatar.style.backgroundImage = `url('${club.cover_image_url}')`;
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
            const userTelegramId = tg.initDataUnsafe?.user?.id?.toString();
            const isOwnerOrAdmin = this.currentClubData && this.currentClubData.owner_id === userTelegramId;
            
            if (isOwnerOrAdmin) {
                const requestsBtn = document.getElementById('view-club-requests-btn');
                if (requestsBtn) requestsBtn.style.display = 'flex';
                await this.loadRequestsCount(clubId);
            } else {
                const requestsBtn = document.getElementById('view-club-requests-btn');
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
    }
};

window.ClubsDetail = ClubsDetail;
