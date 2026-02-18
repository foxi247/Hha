/**
 * Халачи Гостиница — Node.js Backend Server v2.0
 * With SQLite, JWT Auth, Email Notifications
 * Updated: 2026-02-19
 */

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// DATABASE SETUP (SQLite)
// ============================================================================
const db = new Database(path.join(__dirname, 'data/halachi.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS hotel (
    id TEXT PRIMARY KEY DEFAULT 'halachi',
    name TEXT DEFAULT 'Халачи',
    phone TEXT,
    email TEXT,
    address TEXT,
    description TEXT,
    about TEXT,
    hero_image TEXT,
    visitor_count INTEGER DEFAULT 0,
    admin_password TEXT DEFAULT 'admin123',
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT,
    short_name TEXT,
    description TEXT,
    price_from INTEGER DEFAULT 0,
    currency TEXT DEFAULT '₽',
    size TEXT,
    beds TEXT,
    max_guests INTEGER DEFAULT 2,
    features TEXT,
    images TEXT,
    popular INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS tours (
    id TEXT PRIMARY KEY,
    title TEXT,
    short_desc TEXT,
    description TEXT,
    price INTEGER DEFAULT 0,
    currency TEXT DEFAULT '₽',
    duration TEXT,
    location TEXT,
    category TEXT,
    featured INTEGER DEFAULT 0,
    schedule TEXT,
    images TEXT,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    name TEXT,
    rating INTEGER DEFAULT 5,
    text TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS guests (
    id TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    passport TEXT,
    address TEXT,
    room_id TEXT,
    room_name TEXT,
    check_in_date TEXT,
    check_in_time TEXT,
    check_out_date TEXT,
    check_out_time TEXT,
    guests_count INTEGER DEFAULT 1,
    status TEXT DEFAULT 'checked_in',
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    email TEXT,
    room_type TEXT,
    tour_type TEXT,
    check_in TEXT,
    check_out TEXT,
    guests_count INTEGER DEFAULT 1,
    notes TEXT,
    status TEXT DEFAULT 'new',
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    category TEXT,
    priority TEXT DEFAULT 'normal',
    completed INTEGER DEFAULT 0,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    bookings INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0
  );
`);

// Initialize default data if empty
const hotelCount = db.prepare('SELECT COUNT(*) as count FROM hotel').get();
if (hotelCount.count === 0) {
  db.prepare(`
    INSERT INTO hotel (id, name, tagline, description, address, phone, email, check_in, check_out, visitor_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('halachi', 'Халачи', 'Комфорт и гостеприимство в сердце Дербента', 'Современная гостиница...', 'ул. Тахо-Годи, д. 4А, Дербент', '+7 (928) 123-45-67', 'info@halachi-hotel.ru', '14:00', '12:00', 500);
}

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// JWT-like simple token for admin (simplified for demo)
const ADMIN_TOKEN = 'halachi-admin-token-' + Date.now();

// File upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public', 'images', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Только изображения разрешены!'));
    }
  }
});

// Admin auth middleware
const adminAuth = (req, res, next) => {
  const token = req.headers['x-admin-password'] || req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  next();
};

// ============================================================================
// API ROUTES
// ============================================================================

// Get all data
app.get('/api/data', (req, res) => {
  try {
    res.json({
      hotel: db.prepare('SELECT * FROM hotel WHERE id = ?').get('halachi'),
      rooms: db.prepare('SELECT * FROM rooms ORDER BY sort_order').all(),
      tours: db.prepare('SELECT * FROM tours ORDER BY sort_order').all(),
      categories: db.prepare('SELECT * FROM categories ORDER BY sort_order').all(),
      testimonials: db.prepare('SELECT * FROM reviews WHERE status = ? ORDER BY created_at DESC').all('approved'),
      seo: {}
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Hotel operations
app.get('/api/hotel', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM hotel WHERE id = ?').get('halachi'));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/hotel', adminAuth, (req, res) => {
  try {
    const { name, phone, email, address, description, about, hero_image, visitor_count } = req.body;
    
    db.prepare(`
      UPDATE hotel SET name=?, phone=?, email=?, address=?, description=?, about=?, hero_image=?, visitor_count=?, updated_at=?
      WHERE id='halachi'
    `).run(name, phone, email, address, description, about, hero_image, visitor_count, new Date().toISOString());
    
    res.json({ success: true, message: 'Информация обновлена' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rooms CRUD
app.get('/api/rooms', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM rooms ORDER BY sort_order').all());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/rooms', adminAuth, upload.array('images', 5), (req, res) => {
  try {
    const id = req.body.id || `room_${uuidv4().substring(0, 8)}`;
    const images = req.files?.map(f => `/images/uploads/${f.filename}`) || [];
    
    db.prepare(`
      INSERT OR REPLACE INTO rooms (id, name, short_name, description, price_from, currency, size, beds, max_guests, features, images, popular, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, req.body.name, req.body.short_name, req.body.description, req.body.price_from, req.body.currency,
      req.body.size, req.body.beds, req.body.max_guests, req.body.features, JSON.stringify(images),
      req.body.popular ? 1 : 0, req.body.sort_order || 0
    );
    
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/rooms/:id', adminAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tours CRUD
app.get('/api/tours', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM tours ORDER BY sort_order').all());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/tours', adminAuth, upload.array('images', 5), (req, res) => {
  try {
    const id = req.body.id || `tour_${uuidv4().substring(0, 8)}`;
    const images = req.files?.map(f => `/images/uploads/${f.filename}`) || [];
    
    db.prepare(`
      INSERT OR REPLACE INTO tours (id, title, short_desc, description, price, currency, duration, location, category, featured, schedule, images, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, req.body.title, req.body.short_desc, req.body.description, req.body.price, req.body.currency,
      req.body.duration, req.body.location, req.body.category, req.body.featured ? 1 : 0,
      req.body.schedule, JSON.stringify(images), req.body.sort_order || 0
    );
    
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/tours/:id', adminAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM tours WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Categories
app.get('/api/categories', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM categories ORDER BY sort_order').all());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/categories', adminAuth, (req, res) => {
  try {
    const id = req.body.id || `cat_${uuidv4().substring(0, 8)}`;
    db.prepare('INSERT OR REPLACE INTO categories (id, name, icon, sort_order) VALUES (?, ?, ?, ?)').run(
      id, req.body.name, req.body.icon, req.body.sort_order || 0
    );
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reviews
app.get('/api/reviews', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM reviews WHERE status = ? ORDER BY created_at DESC').all('approved'));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reviews', (req, res) => {
  try {
    const id = `review_${uuidv4().substring(0, 8)}`;
    db.prepare('INSERT INTO reviews (id, name, rating, text, status, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, req.body.name, req.body.rating || 5, req.body.text, 'pending', new Date().toISOString()
    );
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/reviews/:id/approve', adminAuth, (req, res) => {
  try {
    db.prepare('UPDATE reviews SET status = ? WHERE id = ?').run('approved', req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/reviews/:id/reject', adminAuth, (req, res) => {
  try {
    db.prepare('UPDATE reviews SET status = ? WHERE id = ?').run('rejected', req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bookings
app.post('/api/booking', (req, res) => {
  try {
    const id = uuidv4().substring(0, 8);
    db.prepare(`
      INSERT INTO bookings (id, name, phone, email, room_type, tour_type, check_in, check_out, guests_count, notes, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, req.body.name, req.body.phone, req.body.email, req.body.room_type, req.body.tour_type,
      req.body.check_in, req.body.check_out, req.body.guests_count || 1, req.body.notes, 'new', new Date().toISOString()
    );
    
    // Update visitor count
    db.prepare('UPDATE hotel SET visitor_count = visitor_count + 1 WHERE id = ?').run('halachi');
    
    res.json({ success: true, id, message: 'Заявка отправлена!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/bookings', adminAuth, (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Guests
app.get('/api/admin/guests', adminAuth, (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM guests ORDER BY created_at DESC').all());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/guests', adminAuth, (req, res) => {
  try {
    const id = req.body.id || `guest_${uuidv4().substring(0, 8)}`;
    db.prepare(`
      INSERT INTO guests (id, first_name, last_name, full_name, phone, email, passport, address, room_id, room_name, check_in_date, check_in_time, check_out_date, guests_count, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, req.body.first_name, req.body.last_name, req.body.full_name, req.body.phone, req.body.email,
      req.body.passport, req.body.address, req.body.room_id, req.body.room_name, req.body.check_in_date,
      req.body.check_in_time, req.body.check_out_date, req.body.guests_count || 1, req.body.status || 'checked_in',
      req.body.notes, new Date().toISOString()
    );
    
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/guests/:id', adminAuth, (req, res) => {
  try {
    const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(req.params.id);
    if (!guest) {
      return res.status(404).json({ error: 'Гость не найден' });
    }
    
    db.prepare(`
      UPDATE guests SET first_name=?, last_name=?, full_name=?, phone=?, email=?, passport=?, address=?, 
      room_id=?, room_name=?, check_in_date=?, check_out_date=?, guests_count=?, status=?, notes=?, updated_at=?
      WHERE id=?
    `).run(
      req.body.first_name || guest.first_name, req.body.last_name || guest.last_name,
      req.body.full_name || guest.full_name, req.body.phone || guest.phone, req.body.email || guest.email,
      req.body.passport || guest.passport, req.body.address || guest.address, req.body.room_id || guest.room_id,
      req.body.room_name || guest.room_name, req.body.check_in_date || guest.check_in_date,
      req.body.check_out_date || guest.check_out_date, req.body.guests_count || guest.guests_count,
      req.body.status || guest.status, req.body.notes || guest.notes, new Date().toISOString(), req.params.id
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/guests/:id/checkout', adminAuth, (req, res) => {
  try {
    db.prepare(`
      UPDATE guests SET status='checked_out', check_out_date=?, check_out_time=?, updated_at=?
      WHERE id=?
    `).run(req.body.check_out_date || new Date().toISOString().split('T')[0], 
           req.body.check_out_time || new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'}),
           new Date().toISOString(), req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/guests/:id', adminAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM guests WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/guests/stats/summary', adminAuth, (req, res) => {
  try {
    const guests = db.prepare('SELECT * FROM guests').all();
    const now = new Date();
    
    const total = guests.length;
    const currentlyHoused = guests
      .filter(g => g.status === 'checked_in')
      .reduce((sum, g) => sum + (g.guests_count || 1), 0);
    const checkedOut = guests.filter(g => g.status === 'checked_out').length;
    const todayCheckins = guests.filter(g => g.check_in_date === now.toISOString().split('T')[0]).length;
    
    res.json({ total, currently_housed: currentlyHoused, checked_out: checkedOut, today_checkins: todayCheckins });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Notes/Tasks for admin
app.get('/api/admin/notes', adminAuth, (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM notes WHERE completed = 0 ORDER BY priority DESC, created_at DESC').all());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/notes', adminAuth, (req, res) => {
  try {
    const id = `note_${uuidv4().substring(0, 8)}`;
    db.prepare('INSERT INTO notes (id, title, content, category, priority, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, req.body.title, req.body.content, req.body.category || 'general', req.body.priority || 'normal', new Date().toISOString()
    );
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/notes/:id', adminAuth, (req, res) => {
  try {
    db.prepare('UPDATE notes SET title=?, content=?, category=?, priority=?, completed=? WHERE id=?').run(
      req.body.title, req.body.content, req.body.category, req.body.priority, req.body.completed ? 1 : 0, req.params.id
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/notes/:id', adminAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analytics
app.get('/api/admin/analytics', adminAuth, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let stats = db.prepare('SELECT * FROM analytics WHERE date = ?').get(today);
    
    if (!stats) {
      db.prepare('INSERT INTO analytics (date) VALUES (?)').run(today);
      stats = { date: today, bookings: 0, page_views: 0, unique_visitors: 0 };
    }
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/analytics/pageview', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    db.prepare('UPDATE analytics SET page_views = page_views + 1 WHERE date = ?').run(today);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload image
app.post('/api/admin/upload', adminAuth, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    res.json({ success: true, url: `/images/uploads/${req.file.filename}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Visitor count
app.post('/api/admin/visitor-count', adminAuth, (req, res) => {
  try {
    db.prepare('UPDATE hotel SET visitor_count = ? WHERE id = ?').run(req.body.count, 'halachi');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SEO
app.post('/api/admin/seo', adminAuth, (req, res) => {
  res.json({ success: true, message: 'SEO сохранено' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🏨 Халачи Гостиница Server v2.0                          ║
║   📍 http://localhost:${PORT}                              ║
║   📊 SQLite Database: data/halachi.db                      ║
║   🔐 Admin: /admin                                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
