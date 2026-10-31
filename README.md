# 🛍️ ShopVerse — Modern E-Commerce Web Application

A full-stack, production-grade e-commerce application built with **FastAPI**, **SQLAlchemy**, **Pydantic v2**, and a responsive modern storefront featuring **Tailwind CSS**.

---

## 🌟 Key Features

### 🛒 1. Product Catalog & Storefront
- **Dynamic Catalog:** Browse rich product cards with real-time stock badges (`In Stock`, `Low Stock`, `Sold Out`, `Featured`).
- **Instant Search & Filters:** Live search by title/description, category filter pills (`Electronics`, `Audio`, `Photography`, `Wearables`, `Apparel`, `Home & Living`), and sorting (`Price: Low to High`, `Price: High to Low`, `Rating`, `Newest`).
- **Product Details Modal:** View full specifications, customer reviews, ratings, and quantity selectors.

### 🎒 2. Cart & Streamlined Checkout
- **Slide-over Shopping Cart:** Real-time item stepper (`+`/`-`), item removal, and subtotal calculation with `localStorage` persistence.
- **Stock Limit Validation:** Prevents adding more items than available in inventory.
- **Promo Discount Coupons:** Supports codes like `SAVE10` (10% off) and `FREESHIP` (Free shipping).
- **One-Page Checkout:** Complete shipping destination, select payment method (Credit Card demo, UPI/QR, Cash on Delivery), and calculate taxes and shipping fees.
- **Instant Stock Decrement:** Stock inventory is automatically deducted upon successful order placement.

### 🚚 3. Live Order Tracking & History
- **Public & Authenticated Tracking:** Track any package using its unique reference number (e.g., `ORD-2026-9810`) or internal ID.
- **Interactive Visual Stepper:** 5-stage progress indicator:
  1. `Pending` (Order placed)
  2. `Processing` (Packed in warehouse)
  3. `Shipped` (Dispatched to carrier)
  4. `Out for Delivery`
  5. `Delivered`
- **Milestone Activity Log:** Shows timestamped carrier logs and admin status notes.
- **Customer "My Orders" Dashboard:** Logged-in customers can review their full order history and track deliveries with one click.

### 🔐 4. Authentication & Role-Based Access Control (RBAC)
- **JWT Authentication:** Secure token-based session handling with Bcrypt password hashing.
- **Role Differentiation:**
  - **`Customer`:** Can browse, add to cart, checkout, view personal order history, and track orders.
  - **`Admin`:** Access to the **Admin Control Panel** with full product CRUD and order status management.
- **⚡ 1-Click Demo Logins:** Instant demo login buttons in the UI for effortless testing:
  - **Admin:** `admin@store.com` / `admin123`
  - **Customer:** `user@store.com` / `user123`

### 📊 5. Admin Control Panel
- **Sales & Inventory Analytics:** Real-time cards for Total Sales Revenue, Total Orders, Catalog Size, and Low Stock inventory alerts.
- **Product CRUD:** Add new products, update prices, stock, categories, images, and descriptions, or delete items.
- **Order Management:** Filter orders by status and update order states in real-time via status dropdown, automatically appending a timestamped milestone checkpoint.

---

## 🗄️ Multi-Database Integration

The application uses **SQLAlchemy ORM**, providing a decoupled database layer that supports multiple SQL databases by setting the `DATABASE_URL` environment variable:

| Database | Supported | Configuration Example |
| :--- | :--- | :--- |
| **SQLite** | ✅ **Default** | `DATABASE_URL=sqlite:///./ecommerce.db` (zero configuration needed) |
| **PostgreSQL** | ✅ Supported | `DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce_db` |
| **MySQL** | ✅ Supported | `DATABASE_URL=mysql+pymysql://user:password@localhost:3306/ecommerce_db` |
| **MongoDB** | 💡 Documented | Can be integrated via `pymongo` / `motor` ODM (see MongoDB section below) |

### Switching to PostgreSQL or MySQL:
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Set your `DATABASE_URL`:
   ```env
   # PostgreSQL
   DATABASE_URL=postgresql://postgres:secret@localhost:5432/ecommerce_db

   # MySQL
   DATABASE_URL=mysql+pymysql://root:secret@localhost:3306/ecommerce_db
   ```
3. Run the app: the tables are auto-created and pre-seeded on startup!

---

## 🚀 Quickstart Guide

### 1. Run Application
Inside the project directory:
```bash
python3 app.py
```
Or with custom port:
```bash
PORT=8000 python3 app.py
```

### 2. Open in Browser
- **Main Storefront:** [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative Redoc API Docs:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

### 3. Pre-Seeded Accounts
| Role | Email | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@store.com` | `admin123` | Full Admin Portal, Product CRUD, Order Status Updates |
| **Customer** | `user@store.com` | `user123` | Store shopping, checkout, My Orders history |

*(Tip: You can also click the quick **"Admin"** or **"Customer"** demo buttons in the top navbar or sign-in modal)*

---

## 🧪 Running Automated Tests

Run the full end-to-end test suite:
```bash
python3 -m unittest tests/test_api.py
```

All 11 integration tests verify:
- Health check
- Customer and Admin JWT login & registration
- Product listing, search, category filtering, and sorting
- Role-based authorization protection (401 / 403 checks)
- Order checkout with stock inventory decrement
- Public order tracking with milestones
- Customer order history retrieval
- Admin product CRUD operations
- Admin order status updates and tracking timeline appending
- Admin dashboard metrics

---

## 📡 API Reference Overview

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new account (`customer` or `admin`).
- `POST /api/auth/login` — Sign in with email and password to receive JWT Bearer token.
- `GET /api/auth/me` — Retrieve the currently authenticated user's profile.

### Products (`/api/products`)
- `GET /api/products` — Get catalog products with query parameters: `category`, `search`, `min_price`, `max_price`, `in_stock_only`, `sort_by`.
- `GET /api/products/categories` — Get distinct product categories with item counts.
- `GET /api/products/{id}` — Get single product details.
- `POST /api/products` — **(Admin Only)** Create a new product.
- `PUT /api/products/{id}` — **(Admin Only)** Update an existing product.
- `DELETE /api/products/{id}` — **(Admin Only)** Delete a product.

### Orders (`/api/orders`)
- `POST /api/orders` — Checkout: validates stock, decrements inventory, creates order & items.
- `GET /api/orders/track/{order_ref}` — Track order by reference or ID with visual progress milestones.
- `GET /api/orders/my-orders` — **(User)** Get logged-in user's order history.
- `GET /api/orders` — **(Admin Only)** List all customer orders with status filter.
- `GET /api/orders/{id}` — Get order details (accessible by owner or admin).
- `PUT /api/orders/{id}/status` — **(Admin Only)** Update order status and append a timeline note.

### Admin Analytics (`/api/admin`)
- `GET /api/admin/stats` — **(Admin Only)** Total revenue, total orders, catalog count, and low-stock alerts.

---

## 📁 Project Architecture

```
ecommerce-app/
├── app.py                      # FastAPI app entrypoint, static files, and lifespan seeder
├── config.py                   # Pydantic BaseSettings (DB URL, JWT Secret, store fees)
├── database.py                 # SQLAlchemy engine, session maker, get_db dependency
├── models.py                   # ORM models (User, Product, Order, OrderItem)
├── schemas.py                  # Pydantic v2 schemas for requests & responses
├── auth.py                     # Bcrypt hashing, JWT generation & RBAC dependencies
├── seed.py                     # Database seeder (Admin, Customer, 10+ realistic products)
├── requirements.txt            # Python dependencies
├── .env.example                # Example environment variables
├── routers/
│   ├── auth_router.py          # /api/auth routes
│   ├── product_router.py       # /api/products routes
│   ├── order_router.py         # /api/orders routes
│   └── admin_router.py         # /api/admin routes
├── static/
│   ├── css/
│   │   └── style.css           # Styling, transitions, animations
│   └── js/
│       ├── api.js              # API client, JWT storage, toast notifications
│       ├── app.js              # Catalog, filters, cart drawer, checkout logic
│       ├── orders.js           # Live order tracking stepper and user history
│       └── admin.js            # Admin metrics, product CRUD, status updates
├── templates/
│   └── index.html              # Responsive SPA frontend with Tailwind CSS
└── tests/
    └── test_api.py             # Integration test suite (11 unit tests)
```
