// Clubs Detail Module - Деталі клубу та управління
const ClubsDetail = {
    currentClubId: null,

    async openClub(clubId, clubName) {
        this.currentClubId = clubId;
        document.getElementById('header-title').textContent = `📚 ${clubName}`;
        document.getElementById('header-title').dataset.clubName = clubName;
        document.getElementById('back-button').style.display = 'block';
        document.getElementById('clubs-list-view').classList.remove('active');
        document.getElementById('club-detail-view').classList.add('active');
        await this.checkClubPermissions(clubId);
        await UIBooks.loadBooks(clubId);
    },

    async checkClubPermissions(clubId) {
        try {
            const userTelegramId = tg.initDataUnsafe?.user?.id?.toString();
            const clubDetails = await API.clubs.getDetails(clubId);
            const isOwnerOrAdmin = clubDetails.owner_id === userTelegramId;
            
            if (isOwnerOrAdmin) {
                const requestsBtn = document.getElementById('view-club-requests-btn');
                if (requestsBtn) requestsBtn.style.display = 'block';
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
                badge.style.display = count > 0 ? 'inline-block' : 'none';
            }
        } catch (error) {
            console.error('❌ Error loading requests count:', error);
        }
    }
};

window.ClubsDetail = ClubsDetail;
