// Clubs Requests Module - Управління заявками на вступ
const ClubsRequests = {
    async showClubRequests(clubId) {
        try {
            UIUtils.setLoading(true);
            const requests = await API.clubs.getJoinRequests(clubId, 'pending');
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById('club-requests-view').classList.add('active');
            this.renderRequests(requests);
        } catch (error) {
            console.error('❌ Error loading requests:', error);
        } finally {
            UIUtils.setLoading(false);
        }
    },

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
                                <h4>${UIUtils.escapeHtml(request.user_name || 'Користувач')}</h4>
                                <div class="username">@${UIUtils.escapeHtml(request.username || 'невідомо')}</div>
                            </div>
                        </div>
                        <div class="request-date">${formattedDate}</div>
                    </div>
                    ${request.message ? `<div class="request-message">"${UIUtils.escapeHtml(request.message)}"</div>` : ''}
                    <div class="request-actions">
                        <button class="btn-approve" onclick="ClubsRequests.reviewRequest(${request.id}, 'approve')">✅ Схвалити</button>
                        <button class="btn-reject" onclick="ClubsRequests.reviewRequest(${request.id}, 'reject')">❌ Відхилити</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    async reviewRequest(requestId, action) {
        try {
            if (!ClubsDetail.currentClubId) {
                console.error('No active club selected');
                return;
            }
            
            tg.HapticFeedback.impactOccurred('medium');
            await API.clubs.reviewJoinRequest(ClubsDetail.currentClubId, requestId, action);
            
            const actionText = action === 'approve' ? 'схвалено' : 'відхилено';
            tg.showAlert(`✅ Заявку ${actionText}!`);
            
            await this.showClubRequests(ClubsDetail.currentClubId);
            await ClubsDetail.loadRequestsCount(ClubsDetail.currentClubId);
        } catch (error) {
            console.error('❌ Error reviewing request:', error);
            tg.showAlert(`Помилка: ${error.message}`);
        }
    },

    backToClubDetails() {
        if (!ClubsDetail.currentClubId) return;
        document.getElementById('club-requests-view').classList.remove('active');
        document.getElementById('club-detail-view').classList.add('active');
        const clubName = document.getElementById('header-title').dataset.clubName || 'Клуб';
        document.getElementById('header-title').textContent = `📚 ${clubName}`;
        if (tg?.BackButton) tg.BackButton.hide();
    }
};

window.ClubsRequests = ClubsRequests;
