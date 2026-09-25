# 🎟️ Event Management & Ticketing REST API

> **Assignment 12:** Event Management & Ticketing API with Firebase Firestore, JWT Role-Based Access Control, Anti-Scalper Rate Limiting, and Swagger / OpenAPI 3.0 Documentation.
> 
> **Author:** Pari Gothi  
> **Tech Stack:** Node.js, Express.js, Firebase Admin SDK (Firestore), JSON Web Tokens (JWT), bcryptjs, express-rate-limit, swagger-ui-express, swagger-jsdoc, dotenv, cors.

---

## 📑 Table of Contents
- [🔗 Live link](#-live-link)
- [📌 Features & Architecture](#-features--architecture)
- [🗄️ Firestore Document Schemas](#️-firestore-document-schemas)
- [📋 API Endpoints Specification](#-api-endpoints-specification)
- [🚀 Local Setup & Installation](#-local-setup--installation)
- [🔥 Firebase Setup Guide](#-firebase-setup-guide)
- [☁️ Deploying to Render](#️-deploying-to-render)
- [🧪 Testing the API & Concurrency Flow](#-testing-the-api--concurrency-flow)
- [📂 Project Directory Structure](#-project-directory-structure)

---

## 🔗 Live link:
https://pari-gothi-assignment-12-event.onrender.com

---

## 📌 Features & Architecture

1. **Role-Based Access Control (RBAC)**:
   - **Organizer**: Create, update, delete events, and view attendees for owned events.
   - **Attendee**: Book tickets, view purchase history, and cancel booked tickets.
   - Passwords securely hashed with `bcryptjs`. JWT tokens signed with expiration and role payload.
2. **Firestore ACID Transactions (`runTransaction`)**:
   - **Atomic Booking**: Read event doc, verify `availableTickets >= quantity`, decrement available count, and generate ticket doc inside a single atomic Firestore transaction. Guarantees tickets are **never oversold** under high concurrency.
   - **Atomic Cancellation**: Restores ticket quantity to event doc inventory in an atomic transaction.
3. **Anti-Scalping Rate Limiting**:
   - `express-rate-limit` enforces a strict threshold of **10 requests per minute per IP** on `POST /api/tickets/book`, returning HTTP `429 Too Many Requests`.
4. **Interactive OpenAPI 3.0 (Swagger UI)**:
   - Live Swagger documentation mounted at `/api-docs` generated from JSDoc tags.
5. **Flexible Cloud Credential Management**:
   - Supports both `serviceAccountKey.json` for local development and stringified `FIREBASE_SERVICE_ACCOUNT` environment variable for zero-secret cloud deployments (Render, Railway, Heroku).

---

## 🗄️ Firestore Document Schemas

### 1. `events` Collection
```json
{
  "id": "event_techconf_2026",
  "title": "Global Cloud & AI Summit 2026",
  "description": "Annual flagship backend conference",
  "category": "Technology",
  "eventDate": "2026-06-15T09:00:00Z",
  "venue": "Bandra Kurla Complex, Mumbai",
  "organizerId": "usr_organizer_01",
  "ticketPrice": 1499,
  "totalCapacity": 500,
  "availableTickets": 482,
  "createdAt": "2026-03-01T12:00:00Z"
}
```

### 2. `tickets` Collection
```json
{
  "id": "ticket_rec_88219",
  "eventId": "event_techconf_2026",
  "eventTitle": "Global Cloud & AI Summit 2026",
  "userId": "usr_attendee_99",
  "attendeeName": "Kunal Sharma",
  "attendeeEmail": "kunal@gmail.com",
  "quantity": 2,
  "totalPaid": 2998,
  "bookingRef": "TKT-2026-88219",
  "status": "confirmed",
  "bookedAt": "2026-03-02T16:20:00Z"
}
```

### 3. `users` Collection
```json
{
  "id": "usr_organizer_01",
  "name": "Pari Gothi",
  "email": "pari@example.com",
  "password": "$2a$10$hashedpassword...",
  "role": "organizer",
  "createdAt": "2026-03-01T12:00:00Z"
}
```

---

## 📋 API Endpoints Specification

### 🔐 Authentication
| Method | Endpoint | Role Access | Description |
|---|---|:---:|---|
| `POST` | `/api/auth/register` | Public | Register as `organizer` or `attendee` |
| `POST` | `/api/auth/login` | Public | Authenticate and obtain JWT token |
| `GET` | `/api/auth/profile` | Authenticated | Retrieve authenticated user profile |

### 🎪 Event Management
| Method | Endpoint | Role Access | Description |
|---|---|:---:|---|
| `GET` | `/api/events` | Public | Browse events (supports `?category=...&city=...`) |
| `GET` | `/api/events/:id` | Public | View event details & live remaining ticket count |
| `POST` | `/api/events` | **Organizer** | Create new event listing |
| `PUT` | `/api/events/:id` | **Organizer** | Update event details (Organizer must own event) |
| `DELETE` | `/api/events/:id` | **Organizer** | Delete event (Organizer must own event) |
| `GET` | `/api/events/:id/attendees` | **Organizer** | List registered attendees for the event |

### 🎟️ Ticket Booking (Anti-Scalper Protected)
| Method | Endpoint | Role Access | Description |
|---|---|:---:|---|
| `POST` | `/api/tickets/book` | **Attendee** | **Atomic Booking**: 10 req/min limit, decrements inventory atomically |
| `GET` | `/api/tickets/my-tickets` | **Attendee** | View purchased tickets for current user |
| `POST` | `/api/tickets/:id/cancel` | **Attendee** | Cancel ticket & atomically restore ticket inventory |

### 📚 Documentation
| Method | Endpoint | Role Access | Description |
|---|---|:---:|---|
| `GET` | `/api-docs` | Public | Interactive Swagger / OpenAPI 3.0 UI |

---

## 🚀 Local Setup & Installation

### 1. Clone & Enter Directory
```bash
git clone <your-repository-url>
cd Pari-Gothi_assignment-12-event-management-ticketing-api/Pari_Gothi
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in `Pari_Gothi/`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=super_secret_jwt_key_12345
JWT_EXPIRES_IN=24h
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

### 4. Run the Application
```bash
# Development mode with hot-reloading:
npm run dev

# Production mode:
npm start
```

### 5. Access Interactive Swagger Docs
Open your browser at: **`http://localhost:5000/api-docs`**

---

## 🔥 Firebase Setup Guide

1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
2. Name your project (e.g. `event-ticketing-api`) and create it.
3. In the Firebase console sidebar, navigate to **Build** → **Firestore Database**.
4. Click **Create database**, select a location, and start in **Production mode** (or Test mode).
5. Navigate to **Project settings** (⚙️ gear icon) → **Service accounts** tab.
6. Click **Generate new private key** → **Generate key**.
7. A JSON file will download. Rename it to `serviceAccountKey.json` and place it in the `Pari_Gothi/` directory. *(Note: This file is in `.gitignore` and must NEVER be pushed to GitHub!)*

---

## ☁️ Deploying to Render

### Step 1: Push Project to GitHub
```bash
git add .
git commit -m "feat: complete Event Management & Ticketing API"
git push origin main
```

### Step 2: Minify your Firebase Service Account JSON
Run this one-line command inside `Pari_Gothi` to get a minified string:
```bash
node -e "console.log(JSON.stringify(require('./serviceAccountKey.json')))"
```
Copy the full output string.

### Step 3: Create Web Service on Render
1. Visit [render.com](https://render.com/) and sign in.
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Root Directory**: `Pari_Gothi`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### Step 4: Configure Environment Variables in Render
Under **Environment Variables**, add:
| Key | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | *(Paste the minified JSON string from Step 2)* |
| `JWT_SECRET` | *(Any long secure random string)* |
| `NODE_ENV` | `production` |

Click **Create Web Service**. Once deployed, your Swagger documentation will be live at:
`https://<your-render-subdomain>.onrender.com/api-docs`

---

## 🧪 Testing the API & Concurrency Flow

### 1. Register & Login Organizer
- `POST /api/auth/register` with `{"name": "Organizer 1", "email": "org@test.com", "password": "Password123!", "role": "organizer"}`
- Copy token from response and authorize in Swagger UI (or pass as `Authorization: Bearer <token>`).

### 2. Create an Event
- `POST /api/events` with:
```json
{
  "title": "React India 2026",
  "description": "Frontend Developers Conference",
  "category": "Technology",
  "eventDate": "2026-10-10T10:00:00Z",
  "venue": "Goa Convention Centre, Goa",
  "ticketPrice": 999,
  "totalCapacity": 5
}
```

### 3. Register & Login Attendee
- `POST /api/auth/register` with `{"name": "Attendee 1", "email": "att@test.com", "password": "Password123!", "role": "attendee"}`

### 4. Test Concurrency & Atomic Booking
- Book tickets with quantity 3: `POST /api/tickets/book`
- Try booking quantity 3 again: observe 400 Bad Request (`Insufficient tickets available`) because only 2 tickets remained.
- Available tickets never drops below 0!

### 5. Test Rate Limiter (Anti-Scalper Protection)
- Send more than 10 booking requests within 60 seconds to `POST /api/tickets/book`.
- Receive HTTP 429:
```json
{
  "success": false,
  "message": "Too many booking attempts, try again later."
}
```

### 6. Test Cancellation
- `POST /api/tickets/<ticketId>/cancel`
- Observe `availableTickets` in event is restored by the cancelled ticket quantity.

---

## 📂 Project Directory Structure

```
Pari_Gothi/
├── config/
│   ├── firebaseConfig.js       # Firebase Admin & Firestore initialization
│   └── swagger.js              # Swagger JSDoc OpenAPI 3.0 specification
├── controllers/
│   ├── authController.js       # Register, Login, Profile controllers
│   ├── eventController.js      # Event CRUD, filters, owner verification
│   └── ticketController.js     # Concurrency-safe booking & cancellation
├── docs/                       # Screenshots folder for submission (.gitkeep)
├── middleware/
│   ├── auth.js                 # JWT verification middleware
│   ├── checkRole.js            # Role-guard middleware (organizer / attendee)
│   └── rateLimiter.js          # Anti-scalper booking rate limiter (10 req/min)
├── routes/
│   ├── authRoutes.js           # Auth routes with Swagger annotations
│   ├── eventRoutes.js          # Event routes with Swagger annotations
│   └── ticketRoutes.js         # Ticket routes with Swagger annotations
├── .env.example                # Example environment variables
├── .gitignore                  # Git ignore rules (node_modules, secrets, env)
├── package.json                # Project manifest and npm scripts
├── server.js                   # Express server entrypoint
├── serviceAccountKey.json.example # Example service account key schema
└── README.md                   # Full documentation & setup guide
```
