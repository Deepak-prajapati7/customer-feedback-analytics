# FeedbackPro AI — Customer Feedback Analytics Demo

FeedbackPro AI is a static HTML/CSS/vanilla JavaScript dashboard. It runs without a build step and stores the demo workspace in the current browser's LocalStorage.

## Demo authentication

Use either of the demo accounts below from `login.html`:

- **Admin workspace**: `admin@feedbackpro.io` / `admin123` (opens `index.html`)
- **Customer portal**: `customer@feedbackpro.io` / `customer123` (opens `customer.html`, also accessible directly as a guest)

This is demo-only client-side authentication, not secure production authentication. Sign-up creates a browser session only; passwords and user accounts are not sent to or persisted by a server. Do not use real credentials or sensitive customer information.

## Features

- Dedicated Customer Portal (`customer.html`) where customers can browse community reviews, filter by product/rating, write new reviews, and track admin updates & replies
- Admin Review Management (`index.html`) with full review editing (name, email, product, category, star rating, recommendation, title, text, response status, and reply), reply composer, and CSV export
- Responsive dashboard with KPI cards, trends, ratings, sentiment, date and category filters
- Local rule-based sentiment, topic and urgency analysis with explanations and suggested follow-up
- Evidence-linked Insights Copilot answers based on the current browser dataset
- Complaint tracking with priority, assignment and resolution status
- CSV and Excel import with preview, validation, duplicate detection and dashboard refresh
- Business insights, PDF/print reports, notifications, and dark/light appearance
- Browser LocalStorage persistence and resettable sample data

Sentiment and Copilot are deterministic local fallbacks, not a hosted LLM. They require no AI credentials and do not send review text to a third party. Excel import, charts and PDF export load existing libraries from CDNs, so those particular features need an internet connection.

## Run locally

### Option 1: Start Full Backend Server (Recommended)
Run the Node.js backend server (zero external dependencies required):

```bash
npm start
# or: node server.js
```

The backend server runs at `http://localhost:3000`:
- **Admin Portal**: [http://localhost:3000/index.html](http://localhost:3000/index.html)
- **Customer Feedback Portal**: [http://localhost:3000/customer.html](http://localhost:3000/customer.html)
- **Login**: [http://localhost:3000/login.html](http://localhost:3000/login.html)
- **Health Check**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

### Option 2: Static Server Mode
```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000/login.html`.

## Backend REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Healthcheck and server status |
| `GET` | `/api/bootstrap` | Initial seed and multi-tab state sync |
| `GET` | `/api/sync-state` | Real-time version check for client polling |
| `GET` | `/api/reviews` | List reviews with filters (`rating`, `status`, `product`, `search`, `sort`) |
| `GET` | `/api/reviews/:id` | Fetch review by ID |
| `POST` | `/api/reviews` | Submit new customer review (auto NLP sentiment & urgency scored) |
| `PUT` | `/api/reviews/:id` | Update / edit review details |
| `POST` | `/api/reviews/:id/reply` | Reply to review (updates status to responded, records date) |
| `PATCH` | `/api/reviews/:id/status` | Toggle responseStatus (`pending` / `responded`) |
| `DELETE` | `/api/reviews/:id` | Delete review record |
| `DELETE` | `/api/reviews` | Clear all reviews |
| `POST` | `/api/reviews/import` | Bulk import feedback rows |
| `POST` | `/api/admin/reset-sample` | Reset database to initial sample dataset |
| `GET` | `/api/analytics/summary` | Real-time KPIs (avg rating, NPS, response rate, distribution) |
| `GET` | `/api/analytics/export/csv` | Download reviews as CSV directly from server |
| `POST` | `/api/auth/login` | Authenticate admin or customer user |
| `POST` | `/api/auth/register` | Register customer account |
| `GET` | `/api/notifications` | List notifications with unread counts |
| `POST` | `/api/notifications/read` | Mark notifications as read |
| `GET`/`PUT` | `/api/complaints` | Fetch or update tracked escalation complaints |
| `GET`/`PUT` | `/api/settings` | Fetch or update workspace settings |

## Persistent Database Storage

The backend persists all records into `data/db.json` with safe atomic writes (`.tmp` write + rename) to protect data integrity. If `data/db.json` is deleted or reset, seed data is automatically re-generated on startup.
# customer-feedback-analytics
