# Crop Marketplace

A direct trading platform connecting Kenyan farmers and buyers — transparent
pricing, location-based listings, order requests, and admin oversight.

Built as a full-stack web application with Flask (backend), React + Vite
(frontend), and SQLite. Designed to remove brokers from the produce supply
chain so farmers earn more and buyers source smarter.

---

## Features

### Farmer
- Create crop listings with name, quantity, unit (kg / bag / crate / piece), and price
- Upload up to 3 photos per listing
- Pin pickup location on an interactive map (Leaflet + OpenStreetMap)
- Edit listings inline; pickup location locks once an order is accepted
- Manage incoming orders: accept, reject, or mark completed
- Message buyers directly within each order

### Buyer
- Browse crops in a 3-column grid with thumbnails and key details
- Search by crop name; filter by location, county, town, and price range
- Filter listings by distance from your current location (10 / 25 / 50 / 100 km)
- Send order requests with proposed price and delivery notes
- See estimated order total live before submitting
- Pickup pin and Google Maps link unlock once the farmer accepts
- Message farmers directly to coordinate

### Admin
- **Overview tab:** KPI cards (GMV, orders, active listings, users), orders-over-time area chart, conversion funnel
- **Reports tab:** orders by county, top crops, top farmers, top buyers (by revenue and order volume)
- **Users tab:** activate or deactivate user accounts
- Date range filter across all reports: last 7 / 30 / 90 days, this year, all time, or custom range

---

## Tech stack

| Layer        | Tools                                                    |
| ------------ | -------------------------------------------------------- |
| Backend      | Python 3, Flask, Flask-SQLAlchemy, Flask-JWT-Extended    |
| Database     | SQLite                                                   |
| Frontend     | React 18, Vite, React Router                             |
| Charts       | Recharts                                                 |
| Maps         | Leaflet + OpenStreetMap                                  |
| Styling      | Plain CSS with design tokens (CSS custom properties)     |
| Auth         | JWT access tokens                                        |

---

## Project structure

```
crop-marketplace/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory + config
│   │   ├── models.py            # SQLAlchemy models: User, Crop, Order, etc.
│   │   ├── routes/
│   │   │   ├── auth.py          # Register / login / me
│   │   │   ├── crops.py         # Crop CRUD + image upload + distance filter
│   │   │   ├── orders.py        # Order create/list, status transitions, messages
│   │   │   └── admin.py         # User management + reports endpoints
│   │   ├── services/            # Bootstrap (admin seed, schema migrations)
│   │   └── utils/               # authz decorators, etc.
│   ├── instance/
│   │   ├── app.db               # SQLite database (gitignored)
│   │   └── uploads/             # Crop image storage
│   ├── .env.example             # Copy to .env and customize
│   ├── requirements.txt
│   └── run.py                   # Entry point
│
└── frontend/
    ├── src/
    │   ├── pages/               # Home, Login, Register, Buyer*, Farmer*, AdminDashboard
    │   ├── components/          # Nav, PageHeader, Modal, StatusPill, etc.
    │   ├── context/             # Auth + Toast contexts
    │   ├── utils/format.js      # KSh + number formatting
    │   ├── api.js               # API client (fetch wrapper)
    │   ├── styles.css           # Design tokens + all styling
    │   └── App.jsx              # Routes
    ├── public/                  # Static images (hero, gallery)
    ├── package.json
    └── vite.config.js
```

---

## Getting started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### 1. Clone the repo

```bash
git clone https://github.com/annewaithaka/crop-marketplace.git
cd crop-marketplace
```

### 2. Backend setup

```bash
cd backend

# Create a virtual environment
python -m venv .venv

# Activate it
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy the example env file and fill in values
cp .env.example .env       # macOS / Linux
copy .env.example .env     # Windows

# Run the dev server
python run.py
```

The API will be live at `http://127.0.0.1:5000`. A default admin account is
auto-seeded on first run (credentials are read from `.env`).

### 3. Frontend setup

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The app will be live at `http://localhost:5173` (or `5174` if `5173` is busy).

### 4. Sign in

Open the app and register as a farmer or buyer. To use the admin dashboard,
sign in with the credentials defined in `backend/.env`:

```
ADMIN_EMAIL=admin@local.test
ADMIN_PASSWORD=Admin123!
```

(Change these in your own `.env` for any real use.)

---

## Environment variables

`backend/.env`:

```env
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
DATABASE_URL=sqlite:///instance/app.db
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
ADMIN_EMAIL=admin@local.test
ADMIN_PASSWORD=Admin123!
```

If your frontend runs on a different port, add it to `CORS_ORIGINS` (comma-separated).

---

## API reference (selected endpoints)

All non-public endpoints require a `Authorization: Bearer <jwt>` header.

### Auth
- `POST   /api/auth/register` — create farmer or buyer account
- `POST   /api/auth/login` — returns JWT access token
- `GET    /api/auth/me` — current user info

### Crops
- `GET    /api/crops` — public browse with filters (name, location, price, distance)
- `POST   /api/crops` — farmer: create listing
- `PUT    /api/crops/:id` — farmer: update own listing
- `DELETE /api/crops/:id` — farmer: delete own listing
- `GET    /api/crops/mine` — farmer: list own crops
- `POST   /api/crops/:id/images` — upload up to 3 images

### Orders
- `POST   /api/orders` — buyer: request an order
- `GET    /api/orders/mine` — buyer: my orders
- `GET    /api/orders/incoming` — farmer: orders on my crops
- `PUT    /api/orders/:id/status` — farmer: accept / reject / complete
- `GET    /api/orders/:id/messages` — order conversation
- `POST   /api/orders/:id/messages` — send a message

### Admin
- `GET    /api/admin/users` — list users
- `PUT    /api/admin/users/:id/active` — activate / deactivate user
- `GET    /api/admin/reports/kpis` — totals: GMV, orders, listings, users
- `GET    /api/admin/reports/orders-over-time` — time series (auto-bucketed)
- `GET    /api/admin/reports/top-crops` — leaderboard by orders + revenue
- `GET    /api/admin/reports/top-farmers` — leaderboard
- `GET    /api/admin/reports/top-buyers` — leaderboard
- `GET    /api/admin/reports/orders-by-county` — geographic breakdown
- `GET    /api/admin/reports/funnel` — pending → accepted → completed

All report endpoints accept optional `?from=YYYY-MM-DD&to=YYYY-MM-DD` query
parameters; omitting them returns all-time data.

---

## Data model

```
User       (id, name, email, phone, role, is_active, password_hash, created_at)
   ├── crops          (one-to-many, if role=farmer)
   └── orders         (one-to-many, if role=buyer)

Crop       (id, farmer_id, name, quantity, unit, price_per_unit,
            location, county, town, lat, lng, pickup_locked,
            pack_size_kg, min_order_qty, created_at)
   ├── images         (one-to-many)
   └── orders         (one-to-many)

CropImage  (id, crop_id, filename, created_at)

Order      (id, crop_id, buyer_id, quantity_requested, contact_details,
            proposed_price, delivery_notes, status, created_at)
   └── messages       (one-to-many)

OrderMessage (id, order_id, sender_id, sender_role, message, created_at)
```

Order statuses: `pending` → `accepted` → `completed`, with `rejected` as a
terminal state. Accepting an order locks the crop's pickup location so
the farmer can't change it after a deal is in motion.

---

## Design notes

- **Light, B2B-leaning theme** — deep teal-green primary, slate-gray neutrals,
  generous whitespace. Trust-building without being sterile.
- **System font stack** — no external font dependencies, works fully offline.
- **CSS custom properties** for theming — all colors, radii, shadows, and
  typography live in `:root` for easy maintenance.
- **Recharts for visualizations** — accessible, declarative, small bundle.
- **Modal-driven forms** for edits and order requests — keeps the underlying
  page calm; no jarring expand/collapse inside cards.
- **Privacy by default** — exact pickup coordinates are hidden from buyers
  until the farmer accepts the order.

---

## Known limitations

- SQLite is fine for development and demos; production use would benefit from PostgreSQL.
- No password reset flow.
- No email notifications (orders are checked manually).
- Images are stored on the local filesystem under `backend/instance/uploads/`;
  a real deployment would use S3 or similar.
- No automated tests yet.

---

## License

This project is for educational purposes.