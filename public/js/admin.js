/**
 * Halachi Hotel Admin Panel v2
 * With Notes, Analytics, Dark Theme Support
 */

const API_BASE = '';
let adminPassword = localStorage.getItem('admin_password') || '';
let data = {};
let guests = [];
let currentBookings = [];
let currentNotes = [];
let currentRoomId = null;
let currentTourId = null;

const notyf = new Notyf({ duration: 3000, position: { x: 'right', y: 'bottom' } });

function apiGet(endpoint) {
  const cacheBuster = endpoint.includes('?') ? '&_=' : '?_=';
  return fetch(`${API_BASE}${endpoint}${cacheBuster}${Date.now()}`).then(r => r.json());
}

async function apiPost(endpoint, dataObj) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify(dataObj)
  });
  if (response.status === 401) { showAuthModal(); throw new Error('Unauthorized'); }
  return response.json();
}

async function apiPut(endpoint, dataObj) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify(dataObj)
  });
  if (response.status === 401) { showAuthModal(); throw new Error('Unauthorized'); }
  return response.json();
}

async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const response = await fetch(`${API_BASE}/api/admin/upload`, {
    method: 'POST',
    headers: { 'x-admin-password': adminPassword },
    body: formData
  });
  return response.json();
}

function showAuthModal() {
  const password = prompt('Введите пароль администратора:');
  if (password) {
    adminPassword = password;
    localStorage.setItem('admin_password', password);
    init();
  }
}

async function init() {
  updateTime();
  setInterval(updateTime, 60000);
  try {
    await loadAllData();
    renderDashboard();
    renderHotel();
    renderRooms();
    renderTours();
    renderCategories();
    renderReviews();
    renderBookings();
    renderGuests();
    renderChessboard();
    renderNotes();
    renderAnalytics();
    renderSettings();
    initNavigation();
    initModals();
    initImageUploads();
    initGuestListeners();
    initNoteListeners();
  } catch (error) {
    console.error('Init error:', error);
    showAuthModal();
  }
}

async function loadAllData() {
  try {
    const response = await fetch(`${API_BASE}/api/data`);
    if (response.status === 401) { showAuthModal(); return; }
    data = await response.json();
  } catch (error) { console.error('Load error:', error); }
}

function updateTime() {
  const timeEl = document.getElementById('currentTime');
  if (timeEl) timeEl.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const section = item.dataset.section;
      if (!section) return;
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
      item.classList.add('active');
      const sectionEl = document.getElementById(section);
      if (sectionEl) sectionEl.classList.add('active');
      document.querySelector('.page-title').textContent = item.querySelector('span:last-child').textContent;
    });
  });
}

function initModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
  });
}

function initImageUploads() {
  const setupUpload = (inputId, areaId, previewId, type) => {
    const input = document.getElementById(inputId);
    const area = document.getElementById(areaId);
    const preview = document.getElementById(previewId);
    if (!area || !input) return;
    area.addEventListener('click', () => input.click());
    area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('dragover'); });
    area.addEventListener('dragleave', () => area.classList.remove('dragover'));
    area.addEventListener('drop', async e => {
      e.preventDefault();
      area.classList.remove('dragover');
      for (const file of e.dataTransfer.files) {
        if (file.type.startsWith('image/')) await handleImageUpload(file, preview, type);
      }
    });
    input.addEventListener('change', async () => {
      for (const file of input.files) await handleImageUpload(file, preview, type);
    });
  };
  setupUpload('tourImages', 'tourImagesArea', 'tourImagePreview', 'tour');
  setupUpload('roomImages', 'roomImagesArea', 'roomImagePreview', 'room');
  
  const heroInput = document.getElementById('heroImageFile');
  const heroArea = document.getElementById('heroImageArea');
  if (heroArea && heroInput) {
    heroArea.addEventListener('click', () => heroInput.click());
    heroArea.addEventListener('drop', async e => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) await handleHeroUpload(file);
    });
    heroInput.addEventListener('change', async () => {
      const file = heroInput.files[0];
      if (file) await handleHeroUpload(file);
    });
  }
}

async function handleImageUpload(file, previewContainer, type) {
  const result = await uploadImage(file);
  if (result.success) {
    const imgDiv = document.createElement('div');
    imgDiv.className = 'image-preview-item';
    imgDiv.innerHTML = `<img src="${result.url}" alt="Photo" /><button type="button" class="remove-img" onclick="this.parentElement.remove()">×</button><input type="hidden" name="${type}_images_new" value="${result.url}" />`;
    previewContainer.appendChild(imgDiv);
    const input = document.getElementById(type === 'tour' ? 'tourImages' : 'roomImages');
    if (input) input.value = '';
  }
}

async function handleHeroUpload(file) {
  const result = await uploadImage(file);
  if (result.success) {
    const preview = document.getElementById('heroImagePreview');
    const hidden = document.getElementById('heroImageInput');
    if (preview) preview.innerHTML = `<img src="${result.url}" alt="Hero" style="max-width: 100%; max-height: 200px; border-radius: 8px;" />`;
    if (hidden) hidden.value = result.url;
    const fileInput = document.getElementById('heroImageFile');
    if (fileInput) fileInput.value = '';
  }
}

function renderDashboard() {
  document.getElementById('totalRooms').textContent = data.hotel?.rooms?.length || 0;
  document.getElementById('totalTours').textContent = data.tours?.length || 0;
  document.getElementById('totalGuests').textContent = guests.length || 0;
  const avgRating = data.tours?.length > 0 ? (data.tours.reduce((sum, t) => sum + (t.rating || 0), 0) / data.tours.length).toFixed(1) : 0;
  document.getElementById('avgRating').textContent = avgRating;
}

function renderHotel() {
  const form = document.getElementById('hotelForm');
  if (!form || !data.hotel) return;
  const h = data.hotel;
  form.querySelector('[name="name"]').value = h.name || '';
  form.querySelector('[name="phone"]').value = h.phone || '';
  form.querySelector('[name="email"]').value = h.email || '';
  form.querySelector('[name="address"]').value = h.address || '';
  form.querySelector('[name="description"]').value = h.description || '';
  form.querySelector('[name="about"]').value = h.about || '';
  if (h.hero_image) {
    const preview = document.getElementById('heroImagePreview');
    const hidden = document.getElementById('heroImageInput');
    if (preview) preview.innerHTML = `<img src="${h.hero_image}" alt="Hero" style="max-width: 100%; max-height: 200px; border-radius: 8px;" />`;
    if (hidden) hidden.value = h.hero_image;
  }
}

async function saveHotelDirect() {
  const form = document.getElementById('hotelForm');
  const hidden = document.getElementById('heroImageInput');
  const updates = {
    name: form.querySelector('[name="name"]')?.value || '',
    phone: form.querySelector('[name="phone"]')?.value || '',
    email: form.querySelector('[name="email"]')?.value || '',
    address: form.querySelector('[name="address"]')?.value || '',
    description: form.querySelector('[name="description"]')?.value || '',
    about: form.querySelector('[name="about"]')?.value || '',
    hero_image: hidden?.value || data.hotel?.hero_image || ''
  };
  try {
    await apiPost('/api/admin/hotel', updates);
    Object.assign(data.hotel, updates);
    notyf.success('✅ Сохранено!');
  } catch (error) {
    console.error('Save hotel error:', error);
    notyf.error('❌ Ошибка сохранения');
  }
}
window.saveHotelDirect = saveHotelDirect;

function renderRooms() {
  const rooms = data.hotel?.rooms || [];
  const container = document.getElementById('roomsList');
  if (!container) return;
  container.innerHTML = rooms.map(room => `
    <div class="room-item">
      <div class="room-image">${room.images?.[0] ? `<img src="${room.images[0]}" alt="${room.name}" />` : '<span>🖼️</span>'}</div>
      <div class="room-content">
        <div class="room-header">
          <div><div class="room-name">${room.name}</div><div class="room-price">от ${(room.price_from || 0).toLocaleString()} ₽</div></div>
          <div class="action-btns">
            <button class="btn btn-sm" onclick="viewRoom('${room.id}')">👁️</button>
            <button class="btn btn-sm" onclick="editRoom('${room.id}')">✏️</button>
            <button class="btn btn-sm" onclick="deleteRoom('${room.id}')">🗑️</button>
          </div>
        </div>
        <div class="room-meta"><span>👥 до ${room.max_guests || 2} чел.</span><span>📐 ${room.size || '22 м²'}</span></div>
      </div>
    </div>
  `).join('') || '<p style="color: var(--gray);">Номера не добавлены</p>';
  document.getElementById('addRoomBtn')?.addEventListener('click', () => openRoomModal());
}

function openRoomModal(room = null) {
  const modal = document.getElementById('roomModal');
  const form = document.getElementById('roomForm');
  form.reset();
  document.getElementById('roomImagePreview').innerHTML = '<span style="font-size: 24px;">📷</span><p>Нажмите или перетащите фото</p>';
  if (room) {
    document.getElementById('roomModalTitle').textContent = 'Редактировать номер';
    Object.keys(room).forEach(key => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) input.value = room[key];
    });
    if (room.images?.length) {
      document.getElementById('roomImagePreview').innerHTML = room.images.map(img => `<div class="image-preview-item"><img src="${img}" alt="Photo" /><button type="button" class="remove-img" onclick="this.parentElement.remove()">×</button><input type="hidden" name="room_images_existing" value="${img}" /></div>`).join('');
    }
  } else {
    document.getElementById('roomModalTitle').textContent = 'Добавить номер';
  }
  modal.classList.add('active');
}
window.openRoomModal = openRoomModal;

function closeRoomModal() { document.getElementById('roomModal').classList.remove('active'); }
window.closeRoomModal = closeRoomModal;

async function saveRoom(e) {
  e.preventDefault();
  const form = document.getElementById('roomForm');
  const formData = new FormData(form);
  const id = formData.get('id');
  const existing = [];
  document.querySelectorAll('[name="room_images_existing"]').forEach(i => { if (i.value) existing.push(i.value); });
  const newImgs = [];
  document.querySelectorAll('[name="room_images_new"]').forEach(i => { if (i.value) newImgs.push(i.value); });
  const room = { id: id || `room_${Date.now().toString(36)}`, name: formData.get('name') || 'Номер', price_from: parseInt(formData.get('price_from')) || 0, description: formData.get('description') || '', size: formData.get('size') || '', beds: formData.get('beds') || '', max_guests: parseInt(formData.get('max_guests')) || 2, images: [...existing, ...newImgs] };
  try {
    await apiPost('/api/admin/rooms', room);
    if (id) {
      const idx = data.hotel?.rooms?.findIndex(r => r.id === id);
      if (idx >= 0) data.hotel.rooms[idx] = room;
    } else {
      if (!data.hotel.rooms) data.hotel.rooms = [];
      data.hotel.rooms.push(room);
    }
    closeRoomModal();
    renderRooms();
    renderDashboard();
    notyf.success(id ? '✅ Номер обновлён!' : '✅ Номер добавлен!');
  } catch (error) { console.error('Save room error:', error); notyf.error('❌ Ошибка'); }
}
document.getElementById('roomForm')?.addEventListener('submit', saveRoom);

async function deleteRoom(id) {
  if (!confirm('Удалить номер?')) return;
  try {
    await apiDelete(`/api/admin/rooms/${id}`);
    data.hotel.rooms = data.hotel.rooms?.filter(r => r.id !== id) || [];
    renderRooms();
    renderDashboard();
    notyf.success('✅ Номер удалён');
  } catch (error) { console.error('Delete error:', error); notyf.error('❌ Ошибка'); }
}
window.deleteRoom = deleteRoom;

function viewRoom(id) {
  const room = data.hotel?.rooms?.find(r => r.id === id);
  if (room) alert(`📦 ${room.name}\n\n💰 от ${room.price_from?.toLocaleString()} ₽\n\n${room.description || 'Нет описания'}`);
}
window.viewRoom = viewRoom;

function editRoom(id) {
  const room = data.hotel?.rooms?.find(r => r.id === id);
  if (room) openRoomModal(room);
}
window.editRoom = editRoom;

async function apiDelete(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE', headers: { 'x-admin-password': adminPassword } });
  return response.json();
}

function renderTours() {
  const tours = data.tours || [];
  const container = document.getElementById('toursList');
  if (!container) return;
  container.innerHTML = tours.map(tour => `
    <div class="tour-item">
      <div class="tour-image">${tour.images?.[0] ? `<img src="${tour.images[0]}" alt="${tour.title}" />` : '<span>🗺️</span>'}</div>
      <div class="tour-content">
        <div class="tour-header">
          <div><div class="tour-name">${tour.title}</div><div class="tour-price">${(tour.price || 0).toLocaleString()} ₽</div></div>
          <div class="action-btns">
            <button class="btn btn-sm" onclick="editTour('${tour.id}')">✏️</button>
            <button class="btn btn-sm" onclick="deleteTour('${tour.id}')">🗑️</button>
          </div>
        </div>
        <div class="tour-meta"><span>⏱️ ${tour.duration || ''}</span><span>📍 ${tour.location || ''}</span></div>
      </div>
    </div>
  `).join('') || '<p style="color: var(--gray);">Туры не добавлены</p>';
  document.getElementById('addTourBtn')?.addEventListener('click', () => openTourModal());
}

function openTourModal(tour = null) {
  const modal = document.getElementById('tourModal');
  const form = document.getElementById('tourForm');
  form.reset();
  document.getElementById('tourImagePreview').innerHTML = '<span style="font-size: 24px;">📷</span><p>Нажмите или перетащите фото</p>';
  const catSelect = form.querySelector('[name="category"]');
  catSelect.innerHTML = '<option value="">Без категории</option>' + (data.categories || []).map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
  if (tour) {
    document.getElementById('tourModalTitle').textContent = 'Редактировать тур';
    Object.keys(tour).forEach(key => { const input = form.querySelector(`[name="${key}"]`); if (input) input.value = tour[key]; });
    if (tour.images?.length) {
      document.getElementById('tourImagePreview').innerHTML = tour.images.map(img => `<div class="image-preview-item"><img src="${img}" alt="Photo" /><button type="button" class="remove-img" onclick="this.parentElement.remove()">×</button><input type="hidden" name="tour_images_existing" value="${img}" /></div>`).join('');
    }
  } else {
    document.getElementById('tourModalTitle').textContent = 'Добавить тур';
  }
  modal.classList.add('active');
}
window.openTourModal = openTourModal;

function closeTourModal() { document.getElementById('tourModal').classList.remove('active'); }
window.closeTourModal = closeTourModal;

async function saveTour(e) {
  e.preventDefault();
  const form = document.getElementById('tourForm');
  const formData = new FormData(form);
  const id = formData.get('id');
  const existing = [];
  document.querySelectorAll('[name="tour_images_existing"]').forEach(i => { if (i.value) existing.push(i.value); });
  const newImgs = [];
  document.querySelectorAll('[name="tour_images_new"]').forEach(i => { if (i.value) newImgs.push(i.value); });
  const tour = { id: id || `tour_${Date.now().toString(36)}`, title: formData.get('title') || 'Тур', short_desc: formData.get('short_desc') || '', description: formData.get('description') || '', price: parseInt(formData.get('price')) || 0, duration: formData.get('duration') || '', location: formData.get('location') || '', category: formData.get('category') || '', schedule: formData.get('schedule') || '', images: [...existing, ...newImgs] };
  try {
    await apiPost('/api/admin/tours', tour);
    if (id) { const idx = data.tours?.findIndex(t => t.id === id); if (idx >= 0) data.tours[idx] = tour; } else { data.tours = [...(data.tours || []), tour]; }
    closeTourModal();
    renderTours();
    renderDashboard();
    notyf.success(id ? '✅ Тур обновлён!' : '✅ Тур добавлен!');
  } catch (error) { console.error('Save tour error:', error); notyf.error('❌ Ошибка'); }
}
document.getElementById('tourForm')?.addEventListener('submit', saveTour);

async function deleteTour(id) {
  if (!confirm('Удалить тур?')) return;
  try {
    await apiDelete(`/api/admin/tours/${id}`);
    data.tours = data.tours?.filter(t => t.id !== id) || [];
    renderTours();
    renderDashboard();
    notyf.success('✅ Тур удалён');
  } catch (error) { console.error('Delete error:', error); notyf.error('❌ Ошибка'); }
}
window.deleteTour = deleteTour;

function editTour(id) {
  const tour = data.tours?.find(t => t.id === id);
  if (tour) openTourModal(tour);
}
window.editTour = editTour;

function renderCategories() {
  const categories = data.categories || [];
  const container = document.getElementById('categoriesList');
  if (!container) return;
  container.innerHTML = categories.map(cat => `<div class="category-item"><span class="category-icon">${cat.icon || '📁'}</span><span class="category-name">${cat.name}</span><button class="btn btn-sm" onclick="deleteCategory('${cat.id}')">🗑️</button></div>`).join('') || '<p style="color: var(--gray);">Категории не добавлены</p>';
}

function openCategoryModal() { document.getElementById('categoryModal').classList.add('active'); }
window.openCategoryModal = openCategoryModal;
function closeCategoryModal() { document.getElementById('categoryModal').classList.remove('active'); }
window.closeCategoryModal = closeCategoryModal;

async function saveCategory(e) {
  e.preventDefault();
  const form = document.getElementById('categoryForm');
  const formData = new FormData(form);
  try {
    await apiPost('/api/admin/categories', Object.fromEntries(formData));
    const response = await apiGet('/api/data');
    data.categories = response.categories || [];
    closeCategoryModal();
    renderCategories();
    notyf.success('✅ Категория добавлена!');
  } catch (error) { console.error('Save category error:', error); notyf.error('❌ Ошибка'); }
}
document.getElementById('categoryForm')?.addEventListener('submit', saveCategory);

async function deleteCategory(id) { if (!confirm('Удалить категорию?')) return; notyf.info('Функция отключена'); }
window.deleteCategory = deleteCategory;

function renderReviews() {
  const reviews = data.testimonials || [];
  const tbody = document.getElementById('reviewsTableBody');
  if (!tbody) return;
  tbody.innerHTML = reviews.map(r => `<tr><td><strong>${r.name || 'Аноним'}</strong></td><td>${'⭐'.repeat(r.rating || 5)}</td><td>${(r.text || '').substring(0, 50)}...</td><td><span class="status-badge available">${r.status || 'approved'}</span></td><td><button class="btn btn-sm" onclick="approveReview('${r.id}')">✅</button><button class="btn btn-sm" onclick="rejectReview('${r.id}')">❌</button></td></tr>`).join('') || '<tr><td colspan="5" style="text-align: center; color: var(--gray);">Отзывов пока нет</td></tr>';
}

async function approveReview(id) {
  try { await apiPut(`/api/admin/reviews/${id}/approve`, {}); data.testimonials = data.testimonials?.map(r => r.id === id ? { ...r, status: 'approved' } : r) || []; renderReviews(); notyf.success('✅ Одобрено'); } catch (error) { console.error(error); notyf.error('❌ Ошибка'); }
}
window.approveReview = approveReview;

async function rejectReview(id) {
  try { await apiPut(`/api/admin/reviews/${id}/reject`, {}); data.testimonials = data.testimonials?.map(r => r.id === id ? { ...r, status: 'rejected' } : r) || []; renderReviews(); notyf.success('✅ Отклонено'); } catch (error) { console.error(error); notyf.error('❌ Ошибка'); }
}
window.rejectReview = rejectReview;

async function renderBookings() {
  try {
    const bookings = await apiGet('/api/admin/bookings');
    currentBookings = bookings;
    const tbody = document.getElementById('bookingsTableBody');
    if (tbody) {
      tbody.innerHTML = bookings.slice(0, 20).map(b => `<tr><td><code>${b.id?.substring(0, 8) || '-'}</code></td><td><strong>${b.name || '-'}</strong></td><td><a href="tel:${b.phone}">${b.phone || '-'}</a></td><td>${b.room_type || b.tour_type || '-'}${b.guests_count ? `<br><small>👥 ${b.guests_count} чел.</small>` : ''}</td><td>${b.check_in ? new Date(b.check_in).toLocaleDateString('ru-RU') : '-'}${b.check_out ? ' - ' + new Date(b.check_out).toLocaleDateString('ru-RU') : ''}</td><td><span class="status-badge available">${b.status || 'new'}</span></td></tr>`).join('') || '<tr><td colspan="6" style="text-align: center; color: var(--gray);">Нет заявок</td></tr>';
    }
  } catch (error) { console.error('Bookings error:', error); }
  document.getElementById('refreshBookings')?.addEventListener('click', () => renderBookings());
}

async function loadGuests() {
  try {
    const response = await fetch('/api/admin/guests', { headers: { 'x-admin-password': adminPassword } });
    if (response.status === 401) { showAuthModal(); return []; }
    guests = await response.json();
    return guests;
  } catch (error) { console.error('Load guests error:', error); return []; }
}

async function renderGuests() {
  await loadGuests();
  const tbody = document.getElementById('guestsTableBody');
  if (!tbody) return;
  const stats = await fetchGuestsStats();
  document.getElementById('statTotalGuests').textContent = stats.total || 0;
  document.getElementById('statCurrentlyHoused').textContent = stats.currently_housed || 0;
  document.getElementById('statTodayCheckins').textContent = stats.today_checkins || 0;
  tbody.innerHTML = guests.map(guest => `<tr><td><strong>${guest.full_name || '-'}</strong></td><td><a href="tel:${guest.phone}">${guest.phone || '-'}</a></td><td>${guest.room_name || '-'}</td><td>${formatDate(guest.check_in_date)}</td><td>${formatDate(guest.check_out_date) || '-'}</td><td><span style="display: flex; align-items: center; gap: 8px;"><span class="status-badge ${guest.status === 'checked_in' ? 'available' : 'unavailable'}">${guest.status === 'checked_in' ? 'Живёт' : 'Выселен'}</span>${guest.guests_count > 1 ? `<span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 12px; font-size: 12px;">👥 ${guest.guests_count}</span>` : ''}</span></td><td><div class="action-btns"><button class="btn btn-sm" onclick="editGuest('${guest.id}')">✏️</button>${guest.status === 'checked_in' ? `<button class="btn btn-sm" onclick="checkoutGuest('${guest.id}')">🚪</button>` : ''}<button class="btn btn-sm" onclick="deleteGuest('${guest.id}')">🗑️</button></div></td></tr>`).join('') || '<tr><td colspan="7" style="text-align: center; color: var(--gray);">Гостей пока нет</td></tr>';
}

async function fetchGuestsStats() {
  try { const response = await fetch('/api/admin/guests/stats/summary', { headers: { 'x-admin-password': adminPassword } }); return await response.json(); } catch (error) { return { total: 0, currently_housed: 0, today_checkins: 0 }; }
}

function formatDate(dateStr) { if (!dateStr) return ''; try { return new Date(dateStr).toLocaleDateString('ru-RU'); } catch (e) { return dateStr; } }

function openGuestModal(guest = null) {
  const modal = document.getElementById('guestModal');
  const form = document.getElementById('guestForm');
  const title = document.getElementById('guestModalTitle');
  form.reset();
  const roomSelect = form.querySelector('[name="room_id"]');
  const rooms = data.hotel?.rooms || [];
  roomSelect.innerHTML = '<option value="">Выберите номер...</option>' + rooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
  if (guest) {
    title.textContent = 'Редактировать гостя';
    Object.keys(guest).forEach(key => { const input = form.querySelector(`[name="${key}"]`); if (input) input.value = guest[key]; });
  } else { title.textContent = 'Заселение гостя'; }
  modal.classList.add('active');
}
window.openGuestModal = openGuestModal;

function closeGuestModal() { document.getElementById('guestModal').classList.remove('active'); }
window.closeGuestModal = closeGuestModal;

function initGuestListeners() {
  document.getElementById('addGuestBtn')?.addEventListener('click', () => openGuestModal());
  document.getElementById('guestForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = document.getElementById('guestForm');
    const formData = new FormData(form);
    const id = formData.get('id');
    const guestData = { id: id || `guest_${Date.now().toString(36)}`, first_name: formData.get('first_name'), last_name: formData.get('last_name'), full_name: `${formData.get('last_name')} ${formData.get('first_name')}`.trim(), phone: formData.get('phone'), email: formData.get('email'), passport: formData.get('passport'), address: formData.get('address'), room_id: formData.get('room_id'), room_name: data.hotel?.rooms?.find(r => r.id === formData.get('room_id'))?.name || '', check_in_date: formData.get('check_in_date'), check_out_date: formData.get('check_out_date'), guests_count: parseInt(formData.get('guests_count')) || 1, notes: formData.get('notes'), status: id ? guests.find(g => g.id === id)?.status || 'checked_in' : 'checked_in' };
    try {
      await apiPost('/api/admin/guests', guestData);
      closeGuestModal();
      renderGuests();
      notyf.success(id ? '✅ Данные обновлены!' : '✅ Гость заселён!');
    } catch (error) { console.error('Save guest error:', error); notyf.error('❌ Ошибка'); }
  });
}

async function checkoutGuest(id) {
  const confirmed = confirm('Подтвердить выселение гостя?');
  if (!confirmed) return;
  const checkOutDate = new Date().toISOString().split('T')[0];
  const checkOutTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  try {
    await apiPut(`/api/admin/guests/${id}/checkout`, { check_out_date: checkOutDate, check_out_time: checkOutTime });
    renderGuests();
    renderChessboard();
    notyf.success('✅ Гость выселен!');
  } catch (error) { console.error('Checkout error:', error); notyf.error('❌ Ошибка'); }
}
window.checkoutGuest = checkoutGuest;

async function deleteGuest(id) {
  if (!confirm('Удалить запись о госте?')) return;
  try { await apiDelete(`/api/admin/guests/${id}`); renderGuests(); renderChessboard(); notyf.success('✅ Удалено'); } catch (error) { console.error(error); notyf.error('❌ Ошибка'); }
}
window.deleteGuest = deleteGuest;

function editGuest(id) {
  const guest = guests.find(g => g.id === id);
  if (guest) openGuestModal(guest);
}
window.editGuest = editGuest;

// ===== NOTES =====
async function renderNotes() {
  try {
    currentNotes = await apiGet('/api/admin/notes');
    const grid = document.getElementById('notesGrid');
    if (!grid) return;
    grid.innerHTML = currentNotes.map(note => `
      <div class="note-card priority-${note.priority}">
        <div class="note-header">
          <span class="note-category">${getCategoryIcon(note.category)}</span>
          <span class="note-priority">${note.priority}</span>
        </div>
        <h4>${note.title}</h4>
        <p>${note.content || ''}</p>
        <div class="note-actions">
          <button onclick="toggleNoteComplete('${note.id}', ${note.completed ? 0 : 1})">${note.completed ? '↩️' : '✅'}</button>
          <button onclick="editNote('${note.id}')">✏️</button>
          <button onclick="deleteNote('${note.id}')">🗑️</button>
        </div>
      </div>
    `).join('') || '<p style="color: var(--gray);">Заметок пока нет</p>';
  } catch (error) { console.error('Notes error:', error); }
}

function getCategoryIcon(cat) {
  const icons = { general: '📝', booking: '📅', guests: '👥', tasks: '✅', ideas: '💡' };
  return icons[cat] || '📝';
}

function openNoteModal(note = null) {
  const modal = document.getElementById('noteModal');
  const form = document.getElementById('noteForm');
  form.reset();
  if (note) {
    document.getElementById('noteModalTitle').textContent = 'Редактировать заметку';
    Object.keys(note).forEach(key => { const input = form.querySelector(`[name="${key}"]`); if (input) input.value = note[key]; });
  } else {
    document.getElementById('noteModalTitle').textContent = 'Добавить заметку';
  }
  modal.classList.add('active');
}
window.openNoteModal = openNoteModal;

function closeNoteModal() { document.getElementById('noteModal').classList.remove('active'); }
window.closeNoteModal = closeNoteModal;

function initNoteListeners() {
  document.getElementById('noteForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = document.getElementById('noteForm');
    const formData = new FormData(form);
    const id = formData.get('id') || `note_${Date.now().toString(36)}`;
    const noteData = { id, title: formData.get('title