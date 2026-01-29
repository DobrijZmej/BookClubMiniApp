/**
 * clubs-form.js
 * Club Form Management (Create/Edit)
 * Version: v1
 */

const ClubForm = {
    modal: null,
    form: null,
    isEditMode: false,
    currentClubId: null,
    avatarFile: null,

    init() {
        this.modal = document.getElementById('club-form-modal');
        this.form = document.getElementById('club-form');
        
        // Close modal handlers
        document.getElementById('close-club-form-modal')?.addEventListener('click', () => {
            this.closeModal();
        });

        // Click outside to close
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Avatar change button
        document.getElementById('change-avatar-btn')?.addEventListener('click', () => {
            document.getElementById('club-avatar-input').click();
        });

        // Avatar file input
        document.getElementById('club-avatar-input')?.addEventListener('change', (e) => {
            this.handleAvatarChange(e);
        });

        // Form submit
        this.form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        console.log('ClubForm initialized');
    },

    /**
     * Open modal in CREATE mode
     */
    openCreateMode() {
        this.isEditMode = false;
        this.currentClubId = null;
        this.avatarFile = null;

        // Set title and button text
        document.getElementById('club-form-title').textContent = 'Створення нового клубу';
        document.getElementById('submit-club-text').textContent = 'Зберегти Клуб';

        // Reset form
        this.form.reset();
        
        // Set defaults
        document.getElementById('club-requires-approval').checked = true;
        
        // Reset avatar preview
        document.getElementById('club-avatar-preview').src = 'images/club_default_avatar.png';

        // Show modal
        this.modal.classList.add('active');
        
        // Haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
        }
    },

    /**
     * Open modal in EDIT mode
     */
    async openEditMode(clubId) {
        this.isEditMode = true;
        this.currentClubId = clubId;
        this.avatarFile = null;

        // Set title and button text
        document.getElementById('club-form-title').textContent = 'Редагування клубу';
        document.getElementById('submit-club-text').textContent = 'Зберегти зміни';

        try {
            // Load club data
            const club = await API.clubs.get(clubId);

            // Fill form with existing data
            document.getElementById('club-name').value = club.name || '';
            document.getElementById('club-description').value = club.description || '';
            document.getElementById('club-requires-approval').checked = club.requires_approval !== false;

            // Set avatar preview
            if (club.cover_url) {
                document.getElementById('club-avatar-preview').src = club.cover_url;
            } else {
                document.getElementById('club-avatar-preview').src = 'images/club_default_avatar.png';
            }

            // Show modal
            this.modal.classList.add('active');

            // Haptic feedback
            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
            }
        } catch (error) {
            console.error('Error loading club for edit:', error);
            UI.showError('Помилка завантаження даних клубу');
        }
    },

    /**
     * Close modal
     */
    closeModal() {
        this.modal.classList.remove('active');
        this.form.reset();
        this.isEditMode = false;
        this.currentClubId = null;
        this.avatarFile = null;

        // Haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    },

    /**
     * Handle avatar file selection
     */
    handleAvatarChange(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            UI.showError('Будь ласка, виберіть файл зображення');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            UI.showError('Розмір файлу не повинен перевищувати 5 МБ');
            return;
        }

        this.avatarFile = file;

        // Preview image
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('club-avatar-preview').src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    },

    /**
     * Handle form submission
     */
    async handleSubmit() {
        // Get form data
        const name = document.getElementById('club-name').value.trim();
        const description = document.getElementById('club-description').value.trim();
        const requiresApproval = document.getElementById('club-requires-approval').checked;

        // Validation
        if (!name) {
            UI.showError('Будь ласка, введіть назву клубу');
            return;
        }

        // Prepare data
        const clubData = {
            name: name,
            description: description,
            is_public: false,  // Завжди закритий клуб
            requires_approval: requiresApproval
        };

        try {
            UI.showLoader();

            if (this.isEditMode) {
                // UPDATE club
                await API.clubs.update(this.currentClubId, clubData);

                // Upload avatar if changed
                if (this.avatarFile) {
                    try {
                        const avatarResult = await API.clubs.uploadAvatar(this.currentClubId, this.avatarFile);
                        console.log('Avatar uploaded:', avatarResult);
                    } catch (avatarError) {
                        console.error('Avatar upload failed:', avatarError);
                        UI.showError('Клуб оновлено, але аватар не вдалося завантажити');
                    }
                }

                UI.showSuccess('Клуб успішно оновлено!');

                // Reload club details if we're on that page
                if (ClubsUI.currentClubId === this.currentClubId) {
                    await ClubsUI.loadClubDetails(this.currentClubId);
                }

                // Reload clubs list
                await ClubsUI.loadClubsList();
            } else {
                // CREATE new club
                const newClub = await API.clubs.create(clubData);

                // Upload avatar if provided
                if (this.avatarFile) {
                    try {
                        const avatarResult = await API.clubs.uploadAvatar(newClub.id, this.avatarFile);
                        console.log('Avatar uploaded:', avatarResult);
                    } catch (avatarError) {
                        console.error('Avatar upload failed:', avatarError);
                        UI.showError('Клуб створено, але аватар не вдалося завантажити');
                    }
                }

                UI.showSuccess('Клуб успішно створено!');

                // Reload clubs list
                await ClubsUI.loadClubsList();

                // Navigate to new club
                await ClubsUI.showClubDetail(newClub.id);
            }

            // Close modal
            this.closeModal();

            // Haptic feedback
            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }
        } catch (error) {
            console.error('Error saving club:', error);
            UI.showError(this.isEditMode ? 'Помилка оновлення клубу' : 'Помилка створення клубу');

            // Haptic feedback
            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
            }
        } finally {
            UI.hideLoader();
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ClubForm.init());
} else {
    ClubForm.init();
}
