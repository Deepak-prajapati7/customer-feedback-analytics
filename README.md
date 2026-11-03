# FeedbackPro AI — Customer Feedback Analytics Demo

FeedbackPro AI is a static HTML/CSS/vanilla JavaScript dashboard. It runs without a build step and stores the demo workspace in the current browser's LocalStorage.

## Demo authentication

Use the demo admin account below:

- Email: admin@feedbackpro.io
- Password: admin123

This is demo-only client-side authentication, not secure production authentication. Sign-up creates a browser session only; passwords and user accounts are not sent to or persisted by a server. Do not use real credentials or sensitive customer information.

## Features

- Responsive dashboard with KPI cards, trends, ratings, sentiment, date and category filters
- Review form and searchable, sortable review management with CSV export
- Local rule-based sentiment, topic and urgency analysis with explanations and suggested follow-up
- Evidence-linked Insights Copilot answers based on the current browser dataset
- Complaint tracking with priority, assignment and resolution status
- CSV and Excel import with preview, validation, duplicate detection and dashboard refresh
- Business insights, PDF/print reports, notifications, and dark/light appearance
- Browser LocalStorage persistence and resettable sample data

Sentiment and Copilot are deterministic local fallbacks, not a hosted LLM. They require no AI credentials and do not send review text to a third party. Excel import, charts and PDF export load existing libraries from CDNs, so those particular features need an internet connection.

## Run locally

From the project directory, start the static web server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/login.html`.

## Import format

The first worksheet or CSV header row should contain `customerName` (also accepts `customer` or `name`), `email`, `product`, `category`, `rating` (1–5), `reviewTitle`, `reviewText` (also accepts `review`, `feedback`, `comment`, or `text`), and optionally `date`. Only review text and a valid rating are required. Imports are limited to 10 MB and 5,000 rows per file.

## Production requirements

This repository does not include a backend, database, authorization service, or AI provider integration. Browser LocalStorage is per-browser and is not suitable for multi-user or production data. A production deployment needs a server-side authentication/session layer, tenant-scoped database and APIs, secure secret management, and an explicitly configured AI provider. No credentials or external AI service are configured by this project.
# customer-feedback-analytics
