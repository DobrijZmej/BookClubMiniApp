// ClubsUI Main Module - Entry point для всіх клуб-модулів
// Забезпечує зворотну сумісність зі старим кодом

const ClubsUI = {
    // List functions
    loadMyClubs: (...args) => ClubsList.loadMyClubs(...args),
    loadClubsList: (...args) => ClubsList.loadMyClubs(...args),
    copyInviteCode: (...args) => ClubsList.copyInviteCode(...args),
    backToClubsList: (...args) => ClubsList.backToClubsList(...args),
    
    // Detail functions
    openClub: (...args) => ClubsDetail.openClub(...args),
    showClubDetail: (...args) => ClubsDetail.openClub(...args),
    loadClubDetails: (...args) => ClubsDetail.loadClubDetails(...args),
    checkClubPermissions: (...args) => ClubsDetail.checkClubPermissions(...args),
    loadRequestsCount: (...args) => ClubsDetail.loadRequestsCount(...args),
    
    // Requests functions
    showClubRequests: (...args) => ClubsRequests.showClubRequests(...args),
    renderRequests: (...args) => ClubsRequests.renderRequests(...args),
    reviewRequest: (...args) => ClubsRequests.reviewRequest(...args),
    backToClubDetails: (...args) => ClubsRequests.backToClubDetails(...args),
    
    // Current club ID getter/setter
    get currentClubId() {
        return ClubsDetail.currentClubId;
    },
    set currentClubId(value) {
        ClubsDetail.currentClubId = value;
    }
};

// Експорт
window.ClubsUI = ClubsUI;
