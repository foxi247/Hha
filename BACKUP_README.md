# HALACHI HOTEL PROJECT - BACKUP
**Дата:** 2026-02-18
**Версия:** Final

## PROJECT DESCRIPTION
Веб-сайт гостиницы "Халачи" в Дербенте с админ-панелью

## TECH STACK
- **Backend:** Node.js + Express
- **Frontend:** Vanilla JS, HTML, CSS
- **Database:** JSON файлы (data/database.json)
- **Server Port:** 3000

## FEATURES

### Public Website (/)
- Главная страница с hero-секцией
- Каталог номеров (Standard, Comfort, Family, Luxe)
- Каталог туров/экскурсий
- Фильтрация по категориям
- Форма бронирования
- Отзывы
- Контакты

### Admin Panel (/admin)
- **Гостиница:** редактирование названия, телефона, email, адреса, главного фото
- **Номера:** CRUD + загрузка фото
- **Туры:** CRUD + загрузка фото + расписание по дням недели
- **Категории:** CRUD
- **Отзывы:** модерация (одобрить/отклонить)
- **Заявки:** просмотр заявок на бронирование с датами и кол-вом гостей
- **Гости:** учёт гостей с заселением/выселением
- **Шахматка:** визуальный календарь бронирований по комнатам × дням
- **Настройки:** счётчик посетителей, пароль админа
- **Экспорт:** выгрузка данных в JSON

## DATA STRUCTURE

### Rooms
```json
{
  "id": "standard",
  "name": "Стандарт",
  "description": "...",
  "price_from": 3500,
  "images": ["url1", "url2"],
  "features": ["Wi-Fi", "TV", "AC"],
  "max_guests": 2
}
```

### Tours
```json
{
  "id": "tour_xxx",
  "title": "Обзорная экскурсия",
  "category": "cat_id",
  "price": 2500,
  "duration": "3 часа",
  "schedule": ["Пн", "Ср", "Пт"],
  "images": ["url1"]
}
```

### Guests
```json
{
  "id": "guest_xxx",
  "full_name": "Иванов Иван",
  "first_name": "Иван",
  "last_name": "Иванов",
  "phone": "+7928...",
  "email": "...",
  "passport": "...",
  "room_id": "standard",
  "room_name": "Стандарт",
  "check_in_date": "2026-02-18",
  "check_in_time": "14:30",
  "check_out_date": "2026-02-22",
  "check_out_time": "12:00",
  "guests_count": 3,
  "status": "checked_in" | "checked_out",
  "notes": "..."
}
```

### Bookings (JSON files in data/bookings/)
```json
{
  "id": "mlqxxx",
  "name": "Имя",
  "phone": "+7928...",
  "check_in": "2026-02-20",
  "check_out": "2026-02-22",
  "guests_count": 2,
  "room_type": "Стандарт",
  "status": "new" | "confirmed" | "rejected"
}
```

## API ENDPOINTS

### Public
- `GET /api/data` - все данные
- `GET /api/rooms` - номера
- `GET /api/tours` - туры
- `GET /api/categories` - категории
- `POST /api/booking` - создать заявку

### Admin (require x-admin-password header)
- `POST /api/admin/hotel` - обновить отель
- `PUT /api/admin/hotel` - обновить отель
- `POST /api/admin/rooms` - добавить номер
- `PUT /api/admin/rooms/:id` - обновить номер
- `DELETE /api/admin/rooms/:id` - удалить номер
- `POST /api/admin/tours` - добавить тур
- `PUT /api/admin/tours/:id` - обновить тур
- `DELETE /api/admin/tours/:id` - удалить тур
- `POST /api/admin/categories` - добавить категорию
- `PUT /api/admin/reviews/:id/approve` - одобрить отзыв
- `PUT /api/admin/reviews/:id/reject` - отклонить отзыв
- `GET /api/admin/bookings` - заявки
- `GET /api/admin/guests` - все гости
- `POST /api/admin/guests` - заселить
- `PUT /api/admin/guests/:id` - обновить
- `PUT /api/admin/guests/:id/checkout` - выселить
- `DELETE /api/admin/guests/:id` - удалить
- `GET /api/admin/guests/stats/summary` - статистика
- `POST /api/admin/upload` - загрузка фото
- `POST /api/admin/seo` - SEO настройки

## PROJECT STRUCTURE
```
halachi-hotel/
├── server.js          # Express server
├── package.json
├── data/
│   ├── database.json  # Main database
│   └── bookings/      # Booking requests
├── public/
│   ├── index.html     # Main website
│   ├── admin.html     # Admin panel
│   ├── css/
│   │   ├── style.css
│   │   └── admin.css
│   ├── js/
│   │   ├── app.js     # Website logic
│   │   └── admin.js   # Admin logic
│   └── images/
└── middleware/
    └── upload.js      # Image upload middleware
```

## FILES CREATED/MODIFIED
- server.js - основной сервер
- public/index.html - главная страница
- public/admin.html - админка
- public/css/style.css - стили сайта
- public/css/admin.css - стили админки
- public/js/app.js - логика сайта
- public/js/admin.js - логика админки
- data/database.json - база данных

## KEY FEATURES FOR FUTURE REFERENCE
1. Guest management with check-in/check-out times
2. Visual chessboard (шахматка) for bookings
3. Multiple guests per booking (up to 2)
4. Image upload with preview
5. Booking requests with dates and guest count
6. Real-time stats in admin

## IMPROVEMENT IDEAS FOR NEXT SESSION
1. Make it a proper web app (PWA)
2. Add proper database (PostgreSQL/MongoDB)
3. Add authentication system
4. Add reports/analytics
5. Add email notifications
6. Add online payment
7. Multi-language support
8. Add booking deposits
