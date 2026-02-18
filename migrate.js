/**
 * Migration Script: JSON to SQLite
 * Run once to migrate data from database.json to SQLite
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'data/halachi.db'));

// Read old data
const oldData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/database.json'), 'utf8'));

// Migrate hotel
if (oldData.hotel) {
  const h = oldData.hotel;
  db.prepare(`
    INSERT OR REPLACE INTO hotel (id, name, phone, email, address, description, about, hero_image, visitor_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('halachi', h.name, h.phone, h.email, h.address, h.description, h.about, h.hero_image, h.visitor_count || 0, new Date().toISOString());
}

// Migrate rooms
if (oldData.hotel?.rooms) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO rooms (id, name, short_name, description, price_from, currency, size, beds, max_guests, features, images, popular, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  oldData.hotel.rooms.forEach((room, i) => {
    stmt.run(
      room.id, room.name, room.short_name, room.description, room.price_from, room.currency || '₽',
      room.size, room.beds, room.max_guests, JSON.stringify(room.features || []), JSON.stringify(room.images || []),
      room.popular ? 1 : 0, i
    );
  });
}

// Migrate tours
if (oldData.tours) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO tours (id, title, short_desc, description, price, currency, duration, location, category, featured, schedule, images, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  oldData.tours.forEach((tour, i) => {
    stmt.run(
      tour.id, tour.title, tour.short_desc, tour.description, tour.price, tour.currency || '₽',
      tour.duration, tour.location, tour.category, tour.featured ? 1 : 0,
      JSON.stringify(tour.schedule || []), JSON.stringify(tour.images || []), i
    );
  });
}

// Migrate categories
if (oldData.categories) {
  const stmt = db.prepare('INSERT OR REPLACE INTO categories (id, name, icon, sort_order) VALUES (?, ?, ?, ?)');
  oldData.categories.forEach((cat, i) => {
    stmt.run(cat.id, cat.name, cat.icon, i);
  });
}

// Migrate reviews
if (oldData.testimonials) {
  const stmt = db.prepare('INSERT OR REPLACE INTO reviews (id, name, rating, text, status, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  oldData.testimonials.forEach(r => {
    stmt.run(`review_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, r.name, r.rating, r.text, 'approved', new Date().toISOString());
  });
}

// Migrate guests
if (oldData.guests) {
  const stmt = db.prepare(`
    INSERT INTO guests (id, first_name, last_name, full_name, phone, email, passport, address, room_id, room_name, 
                       check_in_date, check_in_time, check_out_date, check_out_time, guests_count, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  oldData.guests.forEach(g => {
    stmt.run(
      g.id, g.first_name, g.last_name, g.full_name, g.phone, g.email, g.passport, g.address, g.room_id, g.room_name,
      g.check_in_date, g.check_in_time, g.check_out_date, g.check_out_time, g.guests_count || 1, g.status, g.notes, 
      g.created_at || new Date().toISOString(), g.updated_at
    );
  });
}

console.log('✅ Migration completed!');
console.log(`📊 Database: data/halachi.db`);
