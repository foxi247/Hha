/**
 * Халачи Гостиница - Frontend JavaScript
 * Updated: 2026-02-17
 */

const API_BASE = ''; // Same origin

// ===== API FUNCTIONS =====
async function apiGet(endpoint) {
  // Add timestamp to prevent caching
  const cacheBuster = endpoint.includes('?') ? '&_=' : '?_=';
  const response = await fetch(`${API_BASE}${endpoint}${cacheBuster}${Date.now()}`);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

async function apiPost(endpoint, data) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}

// Current room/tour for booking
let currentRoomId = null;
let currentTourId = null;

// Store tours globally
let hotelTours = [];

// ===== RENDER FUNCTIONS =====
function renderRooms(rooms) {
  const grid = document.getElementById('roomsGrid');
  if (!grid) return;
  
  if (!rooms || rooms.length === 0) {
    grid.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 40px;">Номера скоро появятся</p>';
    return;
  }
  
  // Default room image fallback
  const defaultRoomImage = 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80';
  
  grid.innerHTML = rooms.map(room => {
    // Use first uploaded image or default
    const imageSrc = room.images?.[0] || defaultRoomImage;
    
    return `
    <article class="room-card" data-id="${room.id}" onclick="showRoomDetails('${room.id}')" style="cursor: pointer;">
      <div class="room-image">
        <img src="${imageSrc}" alt="${room.name}" loading="lazy" />
        ${room.popular ? '<span class="room-badge">Хит продаж</span>' : ''}
        ${room.images?.length > 1 ? `<span class="room-badge" style="background: rgba(0,0,0,0.6);">📷 ${room.images.length}</span>` : ''}
      </div>
      <div class="room-content">
        <h3 class="room-title">${room.name}</h3>
        <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 12px;">${(room.description || '').substring(0, 80)}...</p>
        <div class="room-features">
          ${(room.features || []).slice(0, 4).map(f => `<span>${f}</span>`).join('')}
          ${(room.features || []).length > 4 ? `<span>+${(room.features || []).length - 4}</span>` : ''}
        </div>
        <div class="room-footer">
          <div class="room-price">
            от ${formatPrice(room.price_from || 0)} <span>/ ночь</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); bookRoom('${room.id}')">Забронировать</button>
        </div>
      </div>
    </article>
  `}).join('');
}

// ===== ROOM DETAILS MODAL =====
function showRoomDetails(roomId) {
  const rooms = window.hotelRooms || [];
  const room = rooms.find(r => r.id === roomId);
  
  if (!room) return;
  
  currentRoomId = roomId;
  
  const modal = document.getElementById('roomModal');
  const title = document.getElementById('roomModalTitle');
  const body = document.getElementById('roomModalBody');
  
  title.textContent = room.name;
  
  // Build images gallery
  const images = room.images?.length > 0 ? room.images : [getRoomImage(room)];
  const imagesHtml = images.map((img, idx) => 
    `<img src="${img}" alt="${room.name}" class="room-gallery-img" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; ${idx > 0 ? 'display: none;' : ''}" data-idx="${idx}" />`
  ).join('');
  
  // Build features
  const featuresHtml = (room.features || []).map(f => `<span class="feature-tag">${f}</span>`).join('');
  
  body.innerHTML = `
    <div class="room-gallery" style="position: relative; margin-bottom: 20px;">
      ${imagesHtml}
      ${images.length > 1 ? `
        <button onclick="prevRoomImage()" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.7); color: white; border: none; padding: 10px; border-radius: 50%; cursor: pointer;">❮</button>
        <button onclick="nextRoomImage()" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.7); color: white; border: none; padding: 10px; border-radius: 50%; cursor: pointer;">❯</button>
        <div style="text-align: center; margin-top: 10px;">
          ${images.map((_, idx) => `<span onclick="showRoomImage(${idx})" style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${idx === 0 ? '#0EA5E9' : '#ccc'}; margin: 0 5px; cursor: pointer;"></span>`).join('')}
        </div>
      ` : ''}
    </div>
    
    <div class="room-info">
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">${room.description || 'Описание отсутствует'}</p>
      
      <h4 style="margin-bottom: 10px;">Удобства:</h4>
      <div class="room-features" style="flex-wrap: wrap; gap: 8px;">
        ${featuresHtml || '<span style="color: var(--gray);">Информация отсутствует</span>'}
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background: var(--bg-secondary); border-radius: 8px;">
        <span style="font-size: 24px; font-weight: bold; color: var(--primary);">${formatPrice(room.price_from || 0)}</span>
        <span style="color: var(--text-secondary);"> / ночь</span>
      </div>
    </div>
  `;
  
  modal.classList.add('active');
}

let currentRoomImages = [];
let currentRoomImageIndex = 0;

function showRoomImage(idx) {
  currentRoomImageIndex = idx;
  const images = document.querySelectorAll('.room-gallery-img');
  const dots = document.querySelectorAll('.room-gallery span[onclick^="showRoomImage"]');
  
  images.forEach((img, i) => {
    img.style.display = i === idx ? 'block' : 'none';
  });
  
  dots.forEach((dot, i) => {
    dot.style.background = i === idx ? '#0EA5E9' : '#ccc';
  });
}

function prevRoomImage() {
  const rooms = window.hotelRooms || [];
  const room = rooms.find(r => r.id === currentRoomId);
  const total = room?.images?.length || 1;
  showRoomImage((currentRoomImageIndex - 1 + total) % total);
}

function nextRoomImage() {
  const rooms = window.hotelRooms || [];
  const room = rooms.find(r => r.id === currentRoomId);
  const total = room?.images?.length || 1;
  showRoomImage((currentRoomImageIndex + 1) % total);
}

function closeRoomModal() {
  document.getElementById('roomModal').classList.remove('active');
  currentRoomId = null;
}

function bookCurrentRoom() {
  if (currentRoomId) {
    bookRoom(currentRoomId);
    closeRoomModal();
  }
}

// Close modal on outside click
document.addEventListener('click', (e) => {
  const modal = document.getElementById('roomModal');
  if (modal && modal.classList.contains('active') && e.target === modal) {
    closeRoomModal();
  }
});

function renderServices(services) {
  const grid = document.getElementById('servicesGrid');
  if (!grid) return;
  
  if (!services || services.length === 0) {
    grid.innerHTML = '<p style="text-align: center; color: var(--gray);">Услуги загружаются...</p>';
    return;
  }
  
  grid.innerHTML = services.map(service => `
    <div class="service-card">
      <div class="service-icon">${service.icon || '✨'}</div>
      <span class="service-name">${service.name || ''}</span>
    </div>
  `).join('');
}

function renderTours(tours) {
  const grid = document.getElementById('toursGrid');
  if (!grid) return;
  
  hotelTours = tours || [];
  
  if (!tours || tours.length === 0) {
    grid.innerHTML = '<p style="text-align: center; color: var(--gray);">Туры скоро появятся</p>';
    return;
  }
  
  // Default tour image fallback
  const defaultTourImage = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80';
  
  grid.innerHTML = tours.map(tour => {
    // Use first uploaded image or default
    const imageSrc = tour.images?.[0] || defaultTourImage;
    
    return `
    <article class="tour-card" data-category="${tour.category || ''}" onclick="showTourDetails('${tour.id}')" style="cursor: pointer;">
      <div class="tour-image">
        <img src="${imageSrc}" alt="${tour.title || ''}" loading="lazy" />
        ${tour.featured ? '<span class="tour-badge">Рекомендуем</span>' : ''}
        ${tour.images?.length > 1 ? `<span class="tour-badge" style="background: rgba(0,0,0,0.6);">📷 ${tour.images.length}</span>` : ''}
      </div>
      <div class="tour-content">
        <h3 class="tour-title">${tour.title || ''}</h3>
        <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 12px;">${tour.short_desc || ''}</p>
        <div class="tour-meta">
          <span>⏱️ ${tour.duration || ''}</span>
          <span>📍 ${tour.location || ''}</span>
        </div>
        <div class="tour-footer">
          <div class="tour-price">${formatPrice(tour.price || 0)}</div>
          <div class="tour-rating">
            <span class="stars">★</span>
            <span>${tour.rating || 0}</span>
          </div>
        </div>
      </div>
    </article>
  `}).join('');
}

function renderCategories(categories) {
  const filter = document.getElementById('categoryFilter');
  if (!filter) return;
  
  filter.innerHTML = `
    <button class="filter-btn active" data-category="all">Все</button>
    ${categories.map(cat => `
      <button class="filter-btn" data-category="${cat.id}">${cat.icon} ${cat.name}</button>
    `).join('')}
  `;
  
  filter.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filter.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterTours(btn.dataset.category);
    });
  });
}

function renderNearby(nearby) {
  const container = document.getElementById('nearbyPlaces');
  if (!container) return;
  
  container.innerHTML = `
    <h4>Что рядом:</h4>
    ${nearby.map(place => `
      <div class="nearby-item">
        <span>${place.name}</span>
        <span>${place.distance}</span>
      </div>
    `).join('')}
  `;
}

function renderReviews(reviews) {
  const grid = document.getElementById('reviewsGrid');
  if (!grid) return;
  
  if (!reviews || reviews.length === 0) {
    grid.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 40px;">Отзывов пока нет</p>';
    return;
  }
  
  grid.innerHTML = reviews.map(review => `
    <div class="review-card">
      <div class="review-header">
        <div class="review-avatar">${(review.name || 'Г').charAt(0)}</div>
        <div>
          <div class="review-name">${review.name || 'Гость'}</div>
          <div class="review-date">${formatDate(review.date)}</div>
        </div>
      </div>
      <div class="review-stars">${'★'.repeat(review.rating || 5)}${'☆'.repeat(5 - (review.rating || 5))}</div>
      <p class="review-text">${review.text || ''}</p>
    </div>
  `).join('');
}

function renderHotelInfo(hotel) {
  // Hero image
  const heroBg = document.querySelector('.hero-bg');
  if (heroBg && hotel.hero_image) {
    heroBg.style.backgroundImage = `url('${hotel.hero_image}')`;
  }
  
  // Address
  const addressEl = document.getElementById('addressText');
  if (addressEl) addressEl.textContent = hotel.address || '';
  
  const contactAddress = document.getElementById('contactAddress');
  if (contactAddress) contactAddress.textContent = hotel.address || '';
  
  // About
  const aboutText = document.getElementById('aboutText');
  if (aboutText) aboutText.textContent = hotel.description || '';
  
  // Visitor counter
  const visitorCount = document.getElementById('visitorCount');
  const footerVisitor = document.getElementById('footerVisitorCount');
  
  if (hotel.visitor_count && visitorCount) {
    animateCounter(visitorCount, hotel.visitor_count);
  }
  if (hotel.visitor_count && footerVisitor) {
    footerVisitor.textContent = hotel.visitor_count.toLocaleString('ru-RU');
  }
}

// ===== FILTER =====
function filterTours(category) {
  const cards = document.querySelectorAll('.tour-card');
  cards.forEach(card => {
    if (category === 'all' || card.dataset.category === category) {
      card.style.display = 'block';
      card.classList.add('fade-in');
    } else {
      card.style.display = 'none';
    }
  });
}

// ===== BOOKING =====
function quickBook() {
  const checkIn = document.getElementById('checkIn').value;
  const checkOut = document.getElementById('checkOut').value;
  const guests = document.getElementById('guests').value;
  
  // Set values in main form
  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.querySelector('[name="check_in"]').value = checkIn;
    bookingForm.querySelector('[name="check_out"]').value = checkOut;
    bookingForm.querySelector('[name="guests"]').value = guests;
    
    // Scroll to form
    document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
  }
}

function bookRoom(roomId) {
  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.querySelector('[name="room_type"]').value = roomId;
    document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
  }
}

async function initBookingForm() {
  const form = document.getElementById('bookingForm');
  if (!form) return;
  
  // Set min dates
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  
  const checkIn = form.querySelector('[name="check_in"]');
  const checkOut = form.querySelector('[name="check_out"]');
  
  if (checkIn) {
    checkIn.min = today;
    checkIn.addEventListener('change', function() {
      if (checkOut && this.value) {
        checkOut.min = this.value;
        if (checkOut.value && checkOut.value < this.value) {
          checkOut.value = this.value;
        }
      }
    });
  }
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем...';
    
    try {
      const result = await apiPost('/api/booking', data);
      
      if (result.success) {
        alert('✓ Заявка принята!\n\nМенеджер свяжется с вами в течение 15 минут.');
        form.reset();
      } else {
        alert('Ошибка: ' + (result.error || 'Попробуйте позвонить нам'));
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Ошибка отправки. Позвоните нам: +7 (928) 123-45-67');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить заявку';
    }
  });
}

// ===== NAVIGATION =====
function initNavigation() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const headerHeight = document.querySelector('.header').offsetHeight;
        const targetPosition = target.offsetTop - headerHeight - 20;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        
        // Close mobile menu
        document.getElementById('mobileMenu')?.classList.remove('active');
      }
    });
  });
  
  // Header scroll effect
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    if (!header) return;
    if (window.scrollY > 50) {
      header.style.boxShadow = 'var(--shadow-md)';
    } else {
      header.style.boxShadow = 'none';
    }
  }, { passive: true });
}

function initMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');
  
  btn?.addEventListener('click', () => {
    menu.classList.toggle('active');
  });
}

// ===== ANIMATIONS =====
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  
  document.querySelectorAll('.room-card, .service-card, .tour-card, .review-card, .contact-card').forEach(el => {
    observer.observe(el);
  });
}

// ===== HELPERS =====
function formatPrice(price) {
  return price.toLocaleString('ru-RU') + ' ₽';
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getRoomImage(room) {
  // Prefer Unsplash hotel room images, fallback to local
  const unsplashImages = {
    'standard': 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80',
    'comfort': 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&q=80',
    'family': 'https://images.unsplash.com/photo-1591088398332-c518a23170f3?w=600&q=80',
    'suite': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80'
  };
  
  // If room has valid Unsplash URL, use it
  if (room.images?.[0]?.startsWith('http')) {
    return room.images[0];
  }
  
  // Try to match by room ID to Unsplash
  if (room.id && unsplashImages[room.id]) {
    return unsplashImages[room.id];
  }
  
  // Default hotel room image
  return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80';
}

function getTourImage(tour) {
  // If tour has valid URL, use it
  if (tour.images?.[0]?.startsWith('http')) {
    return tour.images[0];
  }
  
  // Default tour/travel image
  return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80';
}

function animateCounter(element, target) {
  let current = 0;
  const increment = target / 50;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = Math.floor(current).toLocaleString('ru-RU');
  }, 30);
}

// ===== INITIALIZATION =====
async function init() {
  try {
    // Load all data
    const data = await apiGet('/api/data');
    
    if (data.hotel) {
      renderHotelInfo(data.hotel);
      renderServices(data.hotel.amenities || []);
      renderNearby(data.hotel.nearby_places || []);
      renderReviews(data.hotel.testimonials || []);
      // Store rooms globally for modal
      window.hotelRooms = data.hotel.rooms || [];
      // Render rooms from hotel object
      renderRooms(window.hotelRooms);
    }
    
    if (data.tours) {
      renderTours(data.tours);
    }
    
    if (data.categories) {
      renderCategories(data.categories);
    }
    
    // Initialize components
    initNavigation();
    initMobileMenu();
    initBookingForm();
    initScrollAnimations();
    
    console.log('🏨 Halachi Hotel website initialized');
    
  } catch (error) {
    console.error('Init error:', error);
    // Show fallback data
    showFallbackData();
  }
}

function showFallbackData() {
  // Show static content if API fails
  console.log('Showing fallback content...');
  // Render hardcoded data as fallback
  renderRooms([
    {id: 'standard', name: 'Стандарт', description: 'Уютный номер с необходимым набором удобств', price_from: 3500, features: ['Wi-Fi', 'TV', 'Кондиционер']},
    {id: 'comfort', name: 'Комфорт', description: 'Просторный номер с улучшенной мебелью', price_from: 4800, features: ['Wi-Fi', 'TV', 'Кондиционер', 'Мини-бар']},
    {id: 'family', name: 'Семейный', description: 'Отличный выбор для семьи с детьми', price_from: 6200, features: ['Wi-Fi', 'TV', 'Кондиционер', 'Детская кроватка']}
  ]);
  
  renderServices([
    {icon: '📶', name: 'Бесплатный Wi-Fi'},
    {icon: '🍽️', name: 'Ресторан'},
    {icon: '🅿️', name: 'Бесплатная парковка'},
    {icon: '🛎️', name: 'Круглосуточная стойка'},
    {icon: '🧼', name: 'Прачечная'}
  ]);
  
  renderReviews([
    {name: 'Александр М.', rating: 5, date: '2026-02-10', text: 'Отличная гостиница! Чисто, уютно, вежливый персонал.'},
    {name: 'Елена К.', rating: 5, date: '2026-01-28', text: 'Останавливались с семьёй — просторно и комфортно.'}
  ]);
}

// Start
document.addEventListener('DOMContentLoaded', init);

// ===== TOUR DETAILS MODAL =====
function showTourDetails(tourId) {
  const tour = hotelTours.find(t => t.id === tourId);
  if (!tour) return;
  
  currentTourId = tourId;
  
  const modal = document.getElementById('tourModal');
  const title = document.getElementById('tourModalTitle');
  const body = document.getElementById('tourModalBody');
  
  title.textContent = tour.title || 'Тур';
  
  // Build images gallery
  const images = tour.images?.length > 0 ? tour.images : [getTourImage(tour)];
  const imagesHtml = images.map((img, idx) => 
    `<img src="${img}" alt="${tour.title}" class="tour-gallery-img" style="width: 100%; height: 250px; object-fit: cover; border-radius: 8px; ${idx > 0 ? 'display: none;' : ''}" data-idx="${idx}" />`
  ).join('');
  
  // Build highlights
  const highlightsHtml = (tour.highlights || []).map(h => `<span class="feature-tag">✓ ${h}</span>`).join('');
  
  // Build schedule
  const scheduleHtml = tour.schedule?.length 
    ? `<p style="margin-top: 10px;"><strong>Дни проведения:</strong> ${tour.schedule.join(', ')}</p>` 
    : '';
  
  body.innerHTML = `
    <div class="tour-gallery" style="position: relative; margin-bottom: 20px;">
      ${imagesHtml}
      ${images.length > 1 ? `
        <button onclick="prevTourImage()" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.7); color: white; border: none; padding: 10px; border-radius: 50%; cursor: pointer;">❮</button>
        <button onclick="nextTourImage()" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.7); color: white; border: none; padding: 10px; border-radius: 50%; cursor: pointer;">❯</button>
        <div style="text-align: center; margin-top: 10px;">
          ${images.map((_, idx) => `<span onclick="showTourImage(${idx})" style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${idx === 0 ? '#E85D04' : '#ccc'}; margin: 0 5px; cursor: pointer;"></span>`).join('')}
        </div>
      ` : ''}
    </div>
    
    <div class="tour-info">
      <div style="display: flex; gap: 20px; margin-bottom: 15px; flex-wrap: wrap;">
        <span>⏱️ ${tour.duration || 'Не указано'}</span>
        <span>📍 ${tour.location || 'Дербент'}</span>
        ${tour.meeting_point ? `<span>📍 Сбор: ${tour.meeting_point}</span>` : ''}
      </div>
      
      <p style="font-size: 15px; line-height: 1.7; margin-bottom: 20px; color: var(--text-secondary);">${tour.description || tour.short_desc || 'Описание отсутствует'}</p>
      
      ${tour.highlights?.length ? `
        <h4 style="margin-bottom: 10px;">Что включено:</h4>
        <div style="flex-wrap: wrap; gap: 8px; margin-bottom: 20px;">
          ${highlightsHtml || '<span style="color: var(--gray);">Нет информации</span>'}
        </div>
      ` : ''}
      
      ${scheduleHtml}
      
      ${tour.group_size ? `<p style="margin-top: 10px;"><strong>Группа до:</strong> ${tour.group_size} человек</p>` : ''}
      
      <div style="margin-top: 20px; padding: 20px; background: var(--bg-secondary); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
        <div>
          <span style="font-size: 28px; font-weight: bold; color: var(--primary);">${formatPrice(tour.price || 0)}</span>
          <span style="color: var(--text-secondary);"> / с человека</span>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
          <span style="font-size: 18px;">⭐</span>
          <span style="font-size: 18px; font-weight: 600;">${tour.rating || 0}</span>
          <span style="color: var(--gray); font-size: 14px;">(${tour.reviews_count || 0} отзывов)</span>
        </div>
      </div>
    </div>
  `;
  
  modal.classList.add('active');
}

let currentTourImages = [];
let currentTourImageIndex = 0;

function showTourImage(idx) {
  currentTourImageIndex = idx;
  const images = document.querySelectorAll('.tour-gallery-img');
  const dots = document.querySelectorAll('.tour-gallery span[onclick^="showTourImage"]');
  
  images.forEach((img, i) => {
    img.style.display = i === idx ? 'block' : 'none';
  });
  
  dots.forEach((dot, i) => {
    dot.style.background = i === idx ? '#E85D04' : '#ccc';
  });
}

function prevTourImage() {
  const tour = hotelTours.find(t => t.id === currentTourId);
  const total = tour?.images?.length || 1;
  showTourImage((currentTourImageIndex - 1 + total) % total);
}

function nextTourImage() {
  const tour = hotelTours.find(t => t.id === currentTourId);
  const total = tour?.images?.length || 1;
  showTourImage((currentTourImageIndex + 1) % total);
}

function closeTourModal() {
  document.getElementById('tourModal').classList.remove('active');
  currentTourId = null;
}

function bookCurrentTour() {
  // Scroll to booking form
  const bookingSection = document.getElementById('booking');
  if (bookingSection) {
    closeTourModal();
    bookingSection.scrollIntoView({ behavior: 'smooth' });
    // Set tour info
    const tour = hotelTours.find(t => t.id === currentTourId);
    if (tour) {
      const bookingForm = document.getElementById('bookingForm');
      if (bookingForm) {
        const select = bookingForm.querySelector('[name="room_type"]');
        if (select) {
          select.value = tour.title || '';
          select.innerHTML = `<option value="${tour.id}">${tour.title}</option>` + select.innerHTML;
        }
      }
    }
  }
}

// Close modal on outside click
document.addEventListener('click', (e) => {
  const modal = document.getElementById('tourModal');
  if (modal && modal.classList.contains('active') && e.target === modal) {
    closeTourModal();
  }
});

// Make functions global for onclick handlers
window.quickBook = quickBook;
window.bookRoom = bookRoom;
window.showRoomDetails = showRoomDetails;
window.closeRoomModal = closeRoomModal;
window.bookCurrentRoom = bookCurrentRoom;
window.showRoomImage = showRoomImage;
window.prevRoomImage = prevRoomImage;
window.nextRoomImage = nextRoomImage;

// Tour functions
window.showTourDetails = showTourDetails;
window.closeTourModal = closeTourModal;
window.bookCurrentTour = bookCurrentTour;
window.showTourImage = showTourImage;
window.prevTourImage = prevTourImage;
window.nextTourImage = nextTourImage;

// PWA: Back to top button
window.addEventListener('scroll', () => {
  const backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    if (window.scrollY > 300) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  }
});

// PWA: Offline indicator
window.addEventListener('online', () => {
  const indicator = document.getElementById('offlineIndicator');
  if (indicator) indicator.classList.remove('show');
});

window.addEventListener('offline', () => {
  const indicator = document.getElementById('offlineIndicator');
  if (indicator) indicator.classList.add('show');
});

// Check initial connection status
if (!navigator.onLine) {
  const indicator = document.getElementById('offlineIndicator');
  if (indicator) indicator.classList.add('show');
}

// Console welcome message
console.log('%c🏨 Халачи Гостиница', 'font-size: 24px; font-weight: bold; color: #E85D04;');
console.log('%cДобро пожаловать!', 'font-size: 14px; color: #6B7280;');
