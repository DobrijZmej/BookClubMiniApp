// UI Book Form Module - Create/Edit Book + Upload Cover
const UIBookForm = (() => {
  const els = {};

  function q(id) { return document.getElementById(id); }

  function cache() {
    els.view = q('add-book-view');
    els.form = q('add-book-form');

    els.pageTitle = els.view?.querySelector('.tg-page-title');

    els.title = q('book-title');
    els.author = q('book-author');
    els.desc = q('book-description');

    els.coverPreview = q('book-cover-preview');
    els.coverInput = q('book-cover-input');

    els.saveBtn = q('save-book-btn');
    els.deleteBtn = q('delete-book-btn');

    els.backBtn = q('book-back-button');
    els.closeBtn = q('book-close-button');
  }

  function setMode(mode) {
    // mode: 'create' | 'edit'
    if (els.pageTitle) {
      els.pageTitle.textContent = mode === 'create' ? 'Додавання книги' : 'Редагування книги';
    }
    if (els.deleteBtn) {
      els.deleteBtn.style.display = mode === 'create' ? 'none' : 'inline-flex';
    }
  }

  function reset() {
    els.form?.reset();
    delete els.form.dataset.editingBookId;
    delete els.form.dataset.clubId;

    if (els.coverPreview) els.coverPreview.src = 'images/book_default_cover.png';
    if (els.coverInput) els.coverInput.value = '';
  }

  function show() {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    els.view?.classList.add('active');
  }

  function backToClub() {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    q('club-detail-view')?.classList.add('active');
  }

  function getEditingId() {
    const v = els.form?.dataset?.editingBookId;
    return v ? Number(v) : null;
  }

  function setEditingId(bookId) {
    if (!els.form) return;
    if (bookId) els.form.dataset.editingBookId = String(bookId);
    else delete els.form.dataset.editingBookId;
  }

  async function openCreate(clubId) {
    tg.HapticFeedback?.impactOccurred?.('light');
    reset();
    setMode('create');
    els.form.dataset.clubId = String(clubId);
    show();
  }

  async function openEdit(bookId) {
    tg.HapticFeedback?.impactOccurred?.('light');
    reset();
    setMode('edit');
    setEditingId(bookId);
    show();

    const book = await API.books.getDetails(bookId);

    els.title.value = book.title || '';
    els.author.value = (book.author && book.author !== 'Невідомий автор') ? book.author : '';
    els.desc.value = book.description || '';

    if (book.cover_url && els.coverPreview) {
      els.coverPreview.src = book.cover_url;
    }

    // потрібен clubId для перезавантаження списку після save
    if (book.club_id) els.form.dataset.clubId = String(book.club_id);
    else if (ClubsUI?.currentClubId) els.form.dataset.clubId = String(ClubsUI.currentClubId);
  }

  function getPayload() {
    return {
      title: els.title.value.trim(),
      author: els.author.value.trim(),
      description: els.desc.value.trim(),
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = getPayload();
    if (!payload.title) {
      tg.showAlert?.('❗ Вкажіть назву книги');
      return;
    }

    const bookId = getEditingId();
    const clubId = Number(els.form.dataset.clubId || ClubsUI?.currentClubId);

    try {
      tg.HapticFeedback?.impactOccurred?.('medium');

      // Generate client_request_id for tracing (use crypto if available)
      let clientRequestId = null;
      try {
        clientRequestId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `cid_${Date.now()}_${Math.floor(Math.random()*100000)}`;
      } catch (e) {
        clientRequestId = `cid_${Date.now()}_${Math.floor(Math.random()*100000)}`;
      }

      console.debug('Book form submit', { bookId, clubId, clientRequestId, payload });

      // 1) create/update текстових полів
      let result;
      if (bookId) {
        result = await API.books.update(bookId, payload); // PATCH
      } else {
        result = await API.books.create({ ...payload, club_id: clubId, client_request_id: clientRequestId }); // POST
        console.debug('Create response', result, { clientRequestId });
      }

      const effectiveBookId = bookId || result?.id;
      if (!effectiveBookId) {
        throw new Error('No book id returned');
      }

      // 2) upload cover (якщо вибрали файл)
      const file = els.coverInput?.files?.[0];
      if (file) {
        console.debug('Uploading cover', { effectiveBookId, clientRequestId, fileName: file.name });
        const uploadRes = await API.books.uploadCover(effectiveBookId, file, clientRequestId);
        console.debug('Upload response', uploadRes, { clientRequestId });
        // якщо upload повернув cover_url — оновимо preview (і не робимо PATCH)
        if (uploadRes?.cover_url && els.coverPreview) {
          els.coverPreview.src = uploadRes.cover_url;
        }
      }

      tg.showAlert?.(bookId ? '✅ Зміни збережено' : '✅ Книгу додано');

      // 3) refresh списку книг
      if (clubId) await UIBooks.loadBooks(clubId);

      backToClub();
      
      // 4) прокрутити до відредагованої книги
      if (bookId) {
        // Невелика затримка для завершення рендерингу
        setTimeout(() => {
          const bookCard = document.querySelector(`[data-book-id="${effectiveBookId}"]`);
          if (bookCard) {
            bookCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      }
    } catch (err) {
      console.error('Book form submit error:', err);
      tg.showAlert?.('❌ Не вдалося зберегти книгу');
    }
  }

  async function handleDelete() {
    const bookId = getEditingId();
    if (!bookId) return;

    tg.showConfirm?.('Видалити цю книгу?', async (confirmed) => {
      if (!confirmed) return;

      try {
        tg.HapticFeedback?.impactOccurred?.('heavy');
        await API.books.delete(bookId);
        tg.showAlert?.('✅ Книгу видалено');

        const clubId = Number(els.form.dataset.clubId || ClubsUI?.currentClubId);
        if (clubId) await UIBooks.loadBooks(clubId);

        backToClub();
      } catch (err) {
        console.error('Book delete error:', err);
        tg.showAlert?.('❌ Не вдалося видалити книгу');
      }
    });
  }

  function wire() {
    els.form?.addEventListener('submit', handleSubmit);
    els.deleteBtn?.addEventListener('click', (e) => { e.preventDefault(); handleDelete(); });

    els.backBtn?.addEventListener('click', (e) => { e.preventDefault(); backToClub(); });
    els.closeBtn?.addEventListener('click', (e) => { e.preventDefault(); backToClub(); });

    // локальне прев’ю обкладинки
    els.coverInput?.addEventListener('change', () => {
      const f = els.coverInput.files?.[0];
      if (!f || !els.coverPreview) return;
      els.coverPreview.src = URL.createObjectURL(f);
    });
  }

  function init() {
    cache();
    wire();
  }

  return { init, openCreate, openEdit };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UIBookForm.init());
} else {
    UIBookForm.init();
}
