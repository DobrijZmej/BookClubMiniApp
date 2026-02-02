// UI Book Form Module - Create/Edit Book + Upload Cover + Google Books Integration
const UIBookForm = (() => {
  const els = {};
  
  // Track data sources
  let coverSource = 'default'; // 'default' | 'user' | 'google'
  let descriptionSource = 'empty'; // 'empty' | 'user' | 'google'
  let googleBookData = null; // Cache Google Books result
  let googleCoverUrl = null; // URL of downloaded Google cover

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
    
    // Google Books elements
    els.googleSearchBtn = q('google-search-btn');
    els.googleModal = q('google-books-modal');
    els.googleModalBody = q('google-modal-body');
    els.googleModalClose = q('google-modal-close');
  }

  function setMode(mode) {
    // mode: 'create' | 'edit'
    const titleEl = q('book-form-title');
    if (titleEl) {
      titleEl.textContent = mode === 'create' ? '📚 Додавання книги' : '📚 Редагування книги';
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
    
    // Reset source tracking
    coverSource = 'default';
    descriptionSource = 'empty';
    googleBookData = null;
    googleCoverUrl = null;
    
    updateGoogleSearchButton();
  }

  function show() {
    els.view?.classList.add('active');
  }

  function backToClub() {
    els.view?.classList.remove('active');
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
    
    // Track existing data sources
    if (book.cover_url && book.cover_url !== 'images/book_default_cover.png') {
      coverSource = book.cover_source || 'user';
    } else {
      // Explicitly set to default if no cover or default cover
      coverSource = 'default';
      googleCoverUrl = null; // Ensure Google cover URL is cleared
    }
    if (book.description) {
      descriptionSource = book.description_source || 'user';
    } else {
      descriptionSource = 'empty';
    }
    
    updateGoogleSearchButton();
  }

  function getPayload() {
    const payload = {
      title: els.title.value.trim(),
      author: els.author.value.trim(),
      description: els.desc.value.trim(),
    };
    
    // Add Google Books metadata if available
    if (googleBookData) {
      if (googleBookData.google_volume_id) payload.google_volume_id = googleBookData.google_volume_id;
      if (googleBookData.isbn_10) payload.isbn_10 = googleBookData.isbn_10;
      if (googleBookData.isbn_13) payload.isbn_13 = googleBookData.isbn_13;
    }
    
    // Add source tracking
    payload.cover_source = coverSource;
    payload.description_source = descriptionSource;
    
    // Add Google cover URL if available
    if (googleCoverUrl) {
      payload.cover_url = googleCoverUrl;
    }
    
    return payload;
  }
  
  function updateGoogleSearchButton() {
    if (!els.googleSearchBtn) return;
    
    const title = els.title?.value?.trim() || '';
    const author = els.author?.value?.trim() || '';
    
    // Enable if title >= 3 chars AND (author empty OR author >= 3 chars)
    const titleValid = title.length >= 3;
    const authorValid = !author || author.length >= 3;
    
    els.googleSearchBtn.disabled = !(titleValid && authorValid);
  }
  
  async function handleGoogleSearch() {
    const title = els.title?.value?.trim();
    const author = els.author?.value?.trim() || null;
    
    if (!title || title.length < 3) {
      tg.showAlert?.('❗ Введіть назву книги (мінімум 3 символи)');
      return;
    }
    
    if (author && author.length < 3) {
      tg.showAlert?.('❗ Автор має містити мінімум 3 символи або залиште поле порожнім');
      return;
    }
    
    try {
      // Show loading state
      els.googleSearchBtn.classList.add('loading');
      els.googleSearchBtn.disabled = true;
      
      tg.HapticFeedback?.impactOccurred?.('light');
      
      const result = await API.books.searchGoogleBooks(title, author);
      
      if (!result || !result.bestMatch) {
        tg.showAlert?.('📚 Нічого не знайдено в Google Books');
        return;
      }
      
      const bestMatch = result.bestMatch;
      const candidates = result.candidates || [];
      googleBookData = bestMatch;
      
      // Check if user has modified cover or description
      const userHasCover = coverSource === 'user';
      const userHasDescription = descriptionSource === 'user' && els.desc?.value?.trim();
      
      // Decide whether to auto-apply or show selection modal
      const highConfidence = bestMatch.confidence >= 0.80;
      const hasMultipleCandidates = candidates.length > 0;
      const needsUserConfirmation = userHasCover || userHasDescription;
      
      if (needsUserConfirmation) {
        // User has existing data - ask what to replace
        showGoogleConfirmationModal(bestMatch, userHasCover, userHasDescription);
      } else if (!highConfidence || hasMultipleCandidates) {
        // Low confidence or multiple options - show selection modal
        showGoogleSelectionModal(bestMatch, candidates);
      } else {
        // High confidence, no candidates, no user data - auto-apply everything
        applyGoogleData(bestMatch, true, true);
        tg.showAlert?.('✅ Дані з Google Books застосовано');
      }
      
    } catch (err) {
      console.error('Google Books search error:', err);
      tg.showAlert?.('❌ Помилка пошуку в Google Books');
    } finally {
      els.googleSearchBtn.classList.remove('loading');
      updateGoogleSearchButton();
    }
  }
  
  function showGoogleConfirmationModal(bookData, userHasCover, userHasDescription) {
    if (!els.googleModal || !els.googleModalBody) return;
    
    const coverUrl = bookData.image?.thumbnail || bookData.image?.smallThumbnail || '';
    const description = bookData.description || '';
    const authors = bookData.authors?.join(', ') || 'Невідомий автор';
    
    let html = `
      <div class="google-book-preview">
        ${coverUrl ? `<img src="${coverUrl}" alt="Обкладинка" class="google-book-cover">` : ''}
        <div class="google-book-info">
          <h4>${bookData.title}</h4>
          <p><strong>Автор:</strong> ${authors}</p>
          ${bookData.publishedDate ? `<p><strong>Рік:</strong> ${bookData.publishedDate}</p>` : ''}
          ${bookData.language ? `<p><strong>Мова:</strong> ${bookData.language}</p>` : ''}
          <p><strong>Збіг:</strong> ${(bookData.confidence_score * 100).toFixed(0)}%</p>
        </div>
      </div>
    `;
    
    if (description) {
      html += `
        <div class="google-book-description">
          <strong>Опис:</strong><br>
          ${description.substring(0, 300)}${description.length > 300 ? '...' : ''}
        </div>
      `;
    }
    
    html += `<div class="google-modal-actions">`;
    
    if (userHasCover && userHasDescription) {
      html += `
        <button class="btn-replace" data-action="replace-all">Замінити все</button>
        <button class="btn-keep" data-action="keep-all">Залишити мої</button>
      `;
    } else if (userHasCover) {
      html += `
        <button class="btn-replace" data-action="replace-cover">Замінити обкладинку</button>
        <button class="btn-keep" data-action="keep-cover">Залишити мою</button>
      `;
    } else if (userHasDescription) {
      html += `
        <button class="btn-replace" data-action="replace-desc">Замінити опис</button>
        <button class="btn-keep" data-action="keep-desc">Залишити мій</button>
      `;
    }
    
    html += `</div>`;
    
    els.googleModalBody.innerHTML = html;
    
    // Wire up buttons
    els.googleModalBody.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        let replaceCover = !userHasCover; // Always replace cover if not from user
        let replaceDesc = false;
        
        if (action === 'replace-all') {
          replaceCover = true;
          replaceDesc = true;
        } else if (action === 'replace-cover') {
          replaceCover = true;
        } else if (action === 'replace-desc') {
          replaceDesc = true;
        } else if (action === 'keep-cover') {
          replaceCover = false;
        } else if (action === 'keep-desc') {
          replaceDesc = false;
        }
        
        if (replaceCover || replaceDesc) {
          applyGoogleData(bookData, replaceCover, replaceDesc);
          tg.showAlert?.('✅ Дані оновлено');
        }
        
        closeGoogleModal();
      });
    });
    
    els.googleModal.style.display = 'flex';
  }
  
  function closeGoogleModal() {
    if (els.googleModal) {
      els.googleModal.style.display = 'none';
    }
  }
  
  function showGoogleSelectionModal(bestMatch, candidates) {
    if (!els.googleModal || !els.googleModalBody) return;
    
    // Create list of all options: bestMatch + candidates
    const allOptions = [bestMatch, ...candidates];
    
    let html = `
      <div class="google-selection-header">
        <p>Знайдено ${allOptions.length} варіантів. Оберіть потрібну книгу:</p>
      </div>
      <div class="google-books-list">
    `;
    
    allOptions.forEach((book, index) => {
      const coverUrl = book.image?.thumbnail || book.image?.smallThumbnail || '';
      const authors = book.authors?.join(', ') || 'Невідомий автор';
      const description = book.description || '';
      const isBest = index === 0;
      
      html += `
        <div class="google-book-item ${isBest ? 'best-match' : ''}" data-index="${index}">
          ${coverUrl ? `<img src="${coverUrl}" alt="Обкладинка" class="google-book-thumbnail">` : '<div class="google-book-no-cover">📚</div>'}
          <div class="google-book-details">
            <h5>${book.title}${isBest ? ' <span class="badge-best">Найкраще</span>' : ''}</h5>
            <p class="book-author">${authors}</p>
            ${book.publishedDate ? `<p class="book-meta">Рік: ${book.publishedDate}</p>` : ''}
            <p class="book-meta">Збіг: ${(book.confidence_score * 100).toFixed(0)}%</p>
            ${description ? `<p class="book-description">${description.substring(0, 150)}${description.length > 150 ? '...' : ''}</p>` : ''}
          </div>
        </div>
      `;
    });
    
    html += `
      </div>
      <div class="google-modal-actions">
        <button class="btn-cancel" data-action="cancel">Скасувати</button>
      </div>
    `;
    
    els.googleModalBody.innerHTML = html;
    
    // Wire up book selection
    els.googleModalBody.querySelectorAll('.google-book-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        const selectedBook = allOptions[index];
        applyGoogleData(selectedBook, true, true);
        tg.showAlert?.('✅ Дані з Google Books застосовано');
        closeGoogleModal();
      });
    });
    
    // Cancel button
    els.googleModalBody.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      closeGoogleModal();
    });
    
    els.googleModal.style.display = 'flex';
  }
  
  async function applyGoogleData(bookData, applyCover, applyDescription) {
    console.log('📘 applyGoogleData called:', { applyCover, applyDescription, hasImage: !!bookData.image, bookId: getEditingId() });
    
    // Apply cover - download through backend to avoid CORS
    if (applyCover && bookData.image) {
      const coverUrl = bookData.image.thumbnail || bookData.image.smallThumbnail;
      if (coverUrl && els.coverPreview) {
        try {
          // Download image through backend
          const bookId = getEditingId(); // Current book ID if editing
          console.log('⬇️ Downloading cover from Google:', { coverUrl, bookId });
          
          const result = await API.books.downloadGoogleCover(coverUrl, bookId);
          
          console.log('✅ Download result:', result);
          
          if (result && result.cover_url) {
            // Update preview with local URL
            els.coverPreview.src = result.cover_url;
            
            // Store the cover URL for submission
            googleCoverUrl = result.cover_url;
            
            // Mark that cover is from Google (already saved)
            coverSource = 'google';
            
            // Clear file input - cover already uploaded
            if (els.coverInput) {
              els.coverInput.value = '';
            }
            
            console.log('✅ Google cover applied:', { googleCoverUrl, coverSource });
          }
        } catch (err) {
          console.error('Failed to download Google cover:', err);
          tg.showAlert?.('Не вдалося завантажити обкладинку');
        }
      } else {
        console.warn('❌ Cover not applied: coverUrl or coverPreview missing', { coverUrl, hasPreview: !!els.coverPreview });
      }
    } else {
      console.log('⏭️ Skipping cover:', { applyCover, hasImage: !!bookData.image });
    }
    
    // Apply description
    if (applyDescription && bookData.description && els.desc) {
      els.desc.value = bookData.description;
      descriptionSource = 'google';
    }
    
    // Apply author if field is empty
    if (bookData.authors && bookData.authors.length > 0 && els.author) {
      const currentAuthor = els.author.value?.trim();
      if (!currentAuthor) {
        els.author.value = bookData.authors.join(', ');
        console.log('✅ Author from Google Books applied:', els.author.value);
      }
    }
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

    // Google Books search
    els.googleSearchBtn?.addEventListener('click', (e) => { e.preventDefault(); handleGoogleSearch(); });
    els.googleModalClose?.addEventListener('click', closeGoogleModal);
    els.googleModal?.addEventListener('click', (e) => {
      if (e.target === els.googleModal) closeGoogleModal();
    });
    
    // Enable/disable Google search button on input
    els.title?.addEventListener('input', updateGoogleSearchButton);
    els.author?.addEventListener('input', updateGoogleSearchButton);
    
    // Track user modifications
    els.coverInput?.addEventListener('change', () => {
      const f = els.coverInput.files?.[0];
      if (!f || !els.coverPreview) return;
      els.coverPreview.src = URL.createObjectURL(f);
      coverSource = 'user';
    });
    
    els.desc?.addEventListener('input', () => {
      if (els.desc.value.trim()) {
        descriptionSource = 'user';
      }
    });
    
    // вставка зображення з буферу обміну (Ctrl+V)
    document.addEventListener('paste', (e) => {
      if (!els.view?.classList.contains('active')) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') === 0) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (!blob) continue;

          const timestamp = Date.now();
          const file = new File([blob], `pasted-image-${timestamp}.png`, { type: blob.type });

          if (els.coverPreview) {
            els.coverPreview.src = URL.createObjectURL(file);
          }

          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          if (els.coverInput) {
            els.coverInput.files = dataTransfer.files;
          }

          coverSource = 'user';
          tg.showAlert?.('📋 Зображення вставлено з буферу обміну');
          break;
        }
      }
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
