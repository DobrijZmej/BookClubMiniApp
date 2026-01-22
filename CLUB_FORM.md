# Club Form Implementation Guide

## Структура

**Modal Window** - одне вікно для створення і редагування клубу

### Файли

1. **HTML**: `frontend/index.html`
   - `#club-form-modal` - модальне вікно
   - Структура згідно концепту

2. **CSS**: `frontend/css/club-form.css` (новий)
   - Responsive design (768px, 480px)
   - Grid layout (avatar | form)
   - Privacy info block

3. **JS**: `frontend/js/clubs-form.js` (новий)
   - `ClubForm.openCreateMode()` - створення
   - `ClubForm.openEditMode(clubId)` - редагування
   - Avatar preview & validation

4. **API**: `frontend/js/api.js` (v8)
   - `API.clubs.create(clubData)`
   - `API.clubs.update(clubId, clubData)`
   - `API.clubs.get(clubId)` - alias для getDetails

## Використання

### Створення клубу
```javascript
// Кнопка header add-club-btn
ClubForm.openCreateMode();
```

### Редагування клубу
```javascript
// Кнопка header edit-club-btn
ClubForm.openEditMode(clubId);
```

## Функціонал

### ✅ Реалізовано
- Модальне вікно з overlay
- Два режими (create/edit)
- Форма з усіма полями:
  - Назва клубу
  - Опис клубу
  - Тип (публічний/закритий)
  - Потрібне схвалення (checkbox)
- Privacy info block
- Avatar preview
- Validation
- API integration
- Success/error feedback
- Haptic feedback

### ⏳ TODO (низький пріоритет)
- Backend: Upload avatar endpoint
- Frontend: File upload до API
- Frontend: Delete club confirmation

## Дизайн

**Згідно концепту:**
- Header: логотип + назва сервісу + X
- Title: центрований заголовок
- Layout: Grid (avatar зліва, форма справа)
- Avatar: 120×120px з кнопкою "Змінити"
- Privacy info: info-card стиль
- Button: зелена primary action "Зберегти Клуб"
- Responsive: mobile → vertical layout

## Versions

- `club-form.css`: v1
- `clubs-form.js`: v1
- `api.js`: v7 → v8 (додано clubs.get alias)
- `app.js`: v7 → v8 (оновлені handlers)
