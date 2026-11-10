#!/usr/bin/env python3
"""FeedbackPro Python Backend & Static Portal Server.

Serves the static Admin Portal and Customer Portal files alongside SQLite-backed
REST APIs for customer authentication, customer feedback submission, and live
synchronization with the Admin Portal. Uses Python standard library only.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import sqlite3
import threading
from urllib.parse import unquote, urlparse
import uuid

ROOT_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = ROOT_DIR / "data" / "feedbackpro.db"
SESSION_COOKIE_NAME = "fp_customer_session"
SESSION_TTL_DAYS = 7
MAX_BODY_BYTES = 2 * 1024 * 1024

POSITIVE_TERMS = {
    "amazing", "awesome", "beautiful", "best", "delighted", "easy", "excellent",
    "fast", "friendly", "good", "great", "happy", "helpful", "impressive",
    "intuitive", "love", "perfect", "reliable", "satisfied", "smooth", "wonderful",
}
NEGATIVE_TERMS = {
    "awful", "bad", "broken", "confusing", "damaged", "disappointed", "expensive",
    "frustrating", "horrible", "late", "poor", "problem", "refund", "rude",
    "slow", "terrible", "unhappy", "unhelpful", "unreliable", "useless", "worst",
}
NEGATIONS = {"not", "no", "never", "hardly", "isnt", "wasnt", "dont", "didnt", "cannot", "cant"}
INTENSIFIERS = {"very", "really", "extremely", "incredibly", "so"}
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

BLOCKED_STATIC_PREFIXES = (".git", "data", "node_modules", "__pycache__")
BLOCKED_STATIC_SUFFIXES = (".py", ".db", ".db-wal", ".db-shm", ".sqlite", ".pyc")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_now(offset_days: int = 0, offset_hours: int = 0) -> str:
    dt = utc_now() - timedelta(days=offset_days) + timedelta(hours=offset_hours)
    return dt.isoformat().replace("+00:00", "Z")


def analyze_sentiment_py(text: str, rating: int | float) -> tuple[str, float]:
    normalized = str(text or "").lower()
    tokens = re.findall(r"[a-z']+", normalized)
    score = 0.0
    previous_tokens: list[str] = []

    for token in tokens:
        polarity = 1.0 if token in POSITIVE_TERMS else (-1.0 if token in NEGATIVE_TERMS else 0.0)
        if polarity:
            if any(word in NEGATIONS for word in previous_tokens):
                polarity *= -1.0
            if any(word in INTENSIFIERS for word in previous_tokens):
                polarity *= 1.5
            score += polarity
        previous_tokens = [*previous_tokens[-2:], token]

    try:
        numeric_rating = float(rating)
    except (TypeError, ValueError):
        numeric_rating = 0.0
    if 1.0 <= numeric_rating <= 5.0:
        score += (numeric_rating - 3.0) * 0.6

    label = "Positive" if score > 0.35 else ("Negative" if score < -0.35 else "Neutral")
    return label, round(score, 1)


def hash_password(password: str, salt_hex: str | None = None) -> str:
    salt = salt_hex or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 200_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, expected_digest = stored_hash.split("$", 1)
    except ValueError:
        return False
    candidate = hash_password(password, salt)
    return hmac.compare_digest(candidate, f"{salt}${expected_digest}")


def build_sample_reviews() -> list[dict]:
    seeds = [
        {"customerName": "Ava Thompson", "email": "ava@example.com", "product": "SmartHub Pro", "rating": 5, "category": "Product Quality", "reviewTitle": "Excellent experience", "reviewText": "The SmartHub Pro works amazing and has transformed our workflow. Setup was fast and the product quality feels premium. We are very satisfied with the performance and support.", "recommendation": "Yes", "daysAgo": 3, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Leo Martin", "email": "leo@example.com", "product": "Nexa CRM", "rating": 4, "category": "Customer Service", "reviewTitle": "Helpful support", "reviewText": "The support team was helpful and responded quickly. The product is good overall and easy to use, although a few features still need polishing.", "recommendation": "Yes", "daysAgo": 5, "responseStatus": "responded", "reply": "Thank you for the feedback. We appreciate your patience while we improve the workflow.", "replyDate": iso_now(offset_days=4)},
        {"customerName": "Noah Patel", "email": "noah@example.com", "product": "InsightFlow", "rating": 2, "category": "Delivery", "reviewTitle": "Delivery delays", "reviewText": "Shipping was late and the onboarding experience was disappointing. The app is okay but delivery delays made the purchase frustrating and expensive.", "recommendation": "No", "daysAgo": 8, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Emma Clark", "email": "emma@example.com", "product": "DeliverLoop", "rating": 3, "category": "Pricing", "reviewTitle": "Average value", "reviewText": "The features are okay and the interface is moderately easy to use. Pricing feels a bit expensive for smaller teams, but it is acceptable overall.", "recommendation": "Maybe", "daysAgo": 9, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Mia Rodriguez", "email": "mia@example.com", "product": "PulseDesk", "rating": 5, "category": "Website Experience", "reviewTitle": "Wonderful website and service", "reviewText": "Wonderful experience from sign-up to support. The dashboard is intuitive, and the product makes our customer service operations faster and more efficient.", "recommendation": "Yes", "daysAgo": 11, "responseStatus": "responded", "reply": "We are delighted to hear that! We are always evolving based on customer feedback.", "replyDate": iso_now(offset_days=10)},
        {"customerName": "Daniel Kim", "email": "daniel@example.com", "product": "Luna Support", "rating": 1, "category": "Customer Service", "reviewTitle": "Unhappy with service", "reviewText": "The customer service was terrible and the issue remained unresolved for days. I was unhappy with the slow communication and found the product nearly useless.", "recommendation": "No", "daysAgo": 14, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Sophia Nguyen", "email": "sophia@example.com", "product": "SmartHub Pro", "rating": 5, "category": "Product Quality", "reviewTitle": "Great product quality", "reviewText": "The product is excellent, great quality, and very helpful for our operations. It is fast and easy to manage, and the reporting features are perfect.", "recommendation": "Yes", "daysAgo": 17, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Jackson Lee", "email": "jackson@example.com", "product": "InsightFlow", "rating": 4, "category": "Website Experience", "reviewTitle": "Smooth and intuitive", "reviewText": "The website experience is good and the product is well designed. Everything works smoothly and the dashboard feels modern and easy to navigate.", "recommendation": "Yes", "daysAgo": 18, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Lily Evans", "email": "lily@example.com", "product": "Nexa CRM", "rating": 3, "category": "Pricing", "reviewTitle": "Okay but pricey", "reviewText": "The tool is okay and easy enough to understand, but the pricing seems a bit on the expensive side for a startup. It is acceptable if the value keeps improving.", "recommendation": "Maybe", "daysAgo": 21, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Oliver Brown", "email": "oliver@example.com", "product": "DeliverLoop", "rating": 2, "category": "Delivery", "reviewTitle": "Late delivery and average service", "reviewText": "Delivery was slow and I was disappointed by the timing. The service felt average and the experience was not as good as expected.", "recommendation": "No", "daysAgo": 24, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Grace Wilson", "email": "grace@example.com", "product": "Luna Support", "rating": 5, "category": "Customer Service", "reviewTitle": "Amazing service team", "reviewText": "Amazing support team and excellent product experience. The team was helpful, knowledgeable, and made everything feel simple and fast.", "recommendation": "Yes", "daysAgo": 26, "responseStatus": "responded", "reply": "We are happy to help and appreciate the kind words!", "replyDate": iso_now(offset_days=25)},
        {"customerName": "Henry Scott", "email": "henry@example.com", "product": "SmartHub Pro", "rating": 4, "category": "Product Quality", "reviewTitle": "Solid overall experience", "reviewText": "Overall the product is great and the quality is solid. Some areas could be improved, but it is fast and works reliably for our teams.", "recommendation": "Yes", "daysAgo": 28, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Chloe Adams", "email": "chloe@example.com", "product": "PulseDesk", "rating": 1, "category": "Customer Service", "reviewTitle": "Worst support", "reviewText": "The support experience was the worst I have seen. It was slow, unhelpful, and I felt completely disappointed with the service.", "recommendation": "No", "daysAgo": 30, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Benjamin Hall", "email": "ben@example.com", "product": "InsightFlow", "rating": 5, "category": "Product Quality", "reviewTitle": "Perfect for reporting", "reviewText": "Perfect analytics and perfect reporting flow. The dashboard is wonderful and everything feels polished and quick to learn.", "recommendation": "Yes", "daysAgo": 32, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Sofia Walker", "email": "sofia@example.com", "product": "Nexa CRM", "rating": 3, "category": "Website Experience", "reviewTitle": "Acceptable but needs work", "reviewText": "The interface is average and acceptable for our team, but some pages feel slightly slow. We hope the product continues improving.", "recommendation": "Maybe", "daysAgo": 35, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Lucas Green", "email": "lucas@example.com", "product": "DeliverLoop", "rating": 5, "category": "Delivery", "reviewTitle": "Fast and on time", "reviewText": "Delivery service was fast and excellent. I was happy with the shipping timeline and the overall service was great.", "recommendation": "Yes", "daysAgo": 39, "responseStatus": "responded", "reply": "We are glad your delivery experience was smooth.", "replyDate": iso_now(offset_days=38)},
        {"customerName": "Ella White", "email": "ella@example.com", "product": "Luna Support", "rating": 2, "category": "Customer Service", "reviewTitle": "Support was uneven", "reviewText": "Support was mixed and the response time was slower than expected. We still like the product, but the patience and follow-up were not ideal.", "recommendation": "No", "daysAgo": 42, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Mason Perez", "email": "mason@example.com", "product": "SmartHub Pro", "rating": 4, "category": "Website Experience", "reviewTitle": "Easy to use", "reviewText": "The interface is easy to use and the onboarding flow feels smooth. I would recommend it, although there are still a few improvements to make.", "recommendation": "Yes", "daysAgo": 45, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Harper Young", "email": "harper@example.com", "product": "PulseDesk", "rating": 5, "category": "Product Quality", "reviewTitle": "Fast and reliable", "reviewText": "The product feels reliable, fast, and easy to understand. We are highly satisfied and it has improved our team workflow significantly.", "recommendation": "Yes", "daysAgo": 48, "responseStatus": "responded", "reply": "Thank you for sharing such a detailed review.", "replyDate": iso_now(offset_days=47)},
        {"customerName": "Ethan Baker", "email": "ethan@example.com", "product": "DeliverLoop", "rating": 1, "category": "Pricing", "reviewTitle": "Very disappointed", "reviewText": "The service was poor and the pricing is hard to justify. I was disappointed by the value and I would not recommend it in its current state.", "recommendation": "No", "daysAgo": 51, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Amelia Harris", "email": "amelia@example.com", "product": "InsightFlow", "rating": 4, "category": "Product Quality", "reviewTitle": "Strong analytics", "reviewText": "The analytics are strong and the workflow is efficient. There are some UI rough edges, but the product provides tremendous value overall.", "recommendation": "Yes", "daysAgo": 54, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Logan King", "email": "logan@example.com", "product": "Luna Support", "rating": 3, "category": "Delivery", "reviewTitle": "Average delivery", "reviewText": "Delivery was okay, but the process was not memorable. The service is acceptable, though a bit inconsistent across orders.", "recommendation": "Maybe", "daysAgo": 57, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Avery Wright", "email": "avery@example.com", "product": "Nexa CRM", "rating": 2, "category": "Customer Service", "reviewTitle": "Frustrating experience", "reviewText": "The service team was not responsive, and the issue did not get resolved quickly. I was frustrated with the follow-through and clarity.", "recommendation": "No", "daysAgo": 60, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Isabella Moore", "email": "isabella@example.com", "product": "PulseDesk", "rating": 5, "category": "Website Experience", "reviewTitle": "Fantastic workflow", "reviewText": "The website experience is fantastic. It is polished, clear, and makes managing customer support a lot easier than before.", "recommendation": "Yes", "daysAgo": 64, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "James Turner", "email": "james@example.com", "product": "SmartHub Pro", "rating": 3, "category": "Pricing", "reviewTitle": "Fair value", "reviewText": "The product is fair value and the features are solid. Pricing is okay, but a few advanced integrations would make it even better.", "recommendation": "Maybe", "daysAgo": 68, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Charlotte Perez", "email": "charlotte@example.com", "product": "DeliverLoop", "rating": 4, "category": "Customer Service", "reviewTitle": "Helpful agents", "reviewText": "Customer service was helpful and courteous. The support process was smooth and the team handled issues professionally.", "recommendation": "Yes", "daysAgo": 72, "responseStatus": "responded", "reply": "Glad to hear the team could help.", "replyDate": iso_now(offset_days=71)},
        {"customerName": "Scarlett Mitchell", "email": "scarlett@example.com", "product": "Nexa CRM", "rating": 5, "category": "Pricing", "reviewTitle": "Fantastic value", "reviewText": "Fantastic value for money. The platform is excellent, and even though pricing is not minimal, the features are worth every penny.", "recommendation": "Yes", "daysAgo": 76, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Julian Ward", "email": "julian@example.com", "product": "DeliverLoop", "rating": 3, "category": "Product Quality", "reviewTitle": "Generally okay", "reviewText": "The product is acceptable and generally okay. Some aspects are good, but we still feel there are opportunities to improve stability and speed.", "recommendation": "Maybe", "daysAgo": 81, "responseStatus": "pending", "reply": "", "replyDate": ""},
        {"customerName": "Victoria Flores", "email": "victoria@example.com", "product": "Luna Support", "rating": 5, "category": "Customer Service", "reviewTitle": "Perfect support experience", "reviewText": "Perfect support experience. The team was fast, patient, and really helpful throughout the process. We are very satisfied and would recommend it.", "recommendation": "Yes", "daysAgo": 87, "responseStatus": "responded", "reply": "We appreciate your trust and support.", "replyDate": iso_now(offset_days=86)},
        {"customerName": "Gabriel Brooks", "email": "gabriel@example.com", "product": "PulseDesk", "rating": 4, "category": "Website Experience", "reviewTitle": "Fast and intuitive", "reviewText": "The site is fast, intuitive, and very easy to navigate. It is a strong overall experience and feels modern and well-built.", "recommendation": "Yes", "daysAgo": 93, "responseStatus": "pending", "reply": "", "replyDate": ""},
    ]

    reviews = []
    for index, seed in enumerate(seeds):
        sentiment, score = analyze_sentiment_py(seed["reviewText"], seed["rating"])
        reviews.append({
            "id": f"r{index + 1}",
            "customerId": None,
            "customerName": seed["customerName"],
            "email": seed["email"],
            "product": seed["product"],
            "category": seed["category"],
            "rating": seed["rating"],
            "reviewTitle": seed["reviewTitle"],
            "reviewText": seed["reviewText"],
            "recommendation": seed["recommendation"],
            "sentiment": sentiment,
            "sentimentScore": score,
            "createdAt": iso_now(offset_days=seed["daysAgo"], offset_hours=index),
            "responseStatus": seed["responseStatus"],
            "reply": seed["reply"],
            "replyDate": seed["replyDate"],
            "source": "sample",
        })
    return reviews


class FeedbackStore:
    """Thread-safe SQLite repository for customer accounts, sessions, and feedback."""

    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=15.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        return conn

    def _init_db(self) -> None:
        with self._lock, self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS app_meta (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS customers (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS customer_sessions (
                    token TEXT PRIMARY KEY,
                    customer_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
                );
                CREATE TABLE IF NOT EXISTS reviews (
                    id TEXT PRIMARY KEY,
                    customer_id TEXT,
                    customer_name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    product TEXT NOT NULL,
                    category TEXT NOT NULL,
                    rating INTEGER NOT NULL,
                    review_title TEXT NOT NULL,
                    review_text TEXT NOT NULL,
                    recommendation TEXT NOT NULL,
                    sentiment TEXT NOT NULL,
                    sentiment_score REAL NOT NULL,
                    created_at TEXT NOT NULL,
                    response_status TEXT NOT NULL DEFAULT 'pending',
                    reply TEXT NOT NULL DEFAULT '',
                    reply_date TEXT NOT NULL DEFAULT '',
                    source TEXT NOT NULL DEFAULT 'admin'
                );
                CREATE TABLE IF NOT EXISTS notifications (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    unread INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS complaints (
                    id TEXT PRIMARY KEY,
                    review_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    customer_name TEXT NOT NULL,
                    product TEXT NOT NULL,
                    priority TEXT NOT NULL,
                    assignee TEXT NOT NULL DEFAULT '',
                    status TEXT NOT NULL DEFAULT 'Open',
                    created_at TEXT NOT NULL
                );
                """
            )
            self._ensure_seed_data(conn)

    def _bump_version(self, conn: sqlite3.Connection) -> str:
        version = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO app_meta (key, value) VALUES ('version', ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (version,),
        )
        return version

    def _ensure_seed_data(self, conn: sqlite3.Connection) -> None:
        demo_row = conn.execute(
            "SELECT id FROM customers WHERE lower(email) = ?",
            ("customer@feedbackpro.io",),
        ).fetchone()
        if not demo_row:
            conn.execute(
                "INSERT INTO customers (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
                (
                    "cust_demo",
                    "Demo Customer",
                    "customer@feedbackpro.io",
                    hash_password("customer123"),
                    iso_now(),
                ),
            )

        seeded = conn.execute("SELECT value FROM app_meta WHERE key = 'seeded'").fetchone()
        if not seeded:
            self._insert_sample_reviews(conn)
            conn.execute(
                "INSERT INTO notifications (id, title, message, unread, created_at) VALUES (?, ?, ?, ?, ?)",
                (
                    str(uuid.uuid4()),
                    "Welcome to FeedbackPro",
                    "30 sample reviews are ready to explore.",
                    1,
                    iso_now(),
                ),
            )
            conn.execute("INSERT INTO app_meta (key, value) VALUES ('seeded', '1')")
            self._bump_version(conn)

    def _insert_sample_reviews(self, conn: sqlite3.Connection) -> None:
        for review in build_sample_reviews():
            conn.execute(
                """
                INSERT INTO reviews (
                    id, customer_id, customer_name, email, product, category, rating,
                    review_title, review_text, recommendation, sentiment, sentiment_score,
                    created_at, response_status, reply, reply_date, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    review["id"],
                    review["customerId"],
                    review["customerName"],
                    review["email"],
                    review["product"],
                    review["category"],
                    review["rating"],
                    review["reviewTitle"],
                    review["reviewText"],
                    review["recommendation"],
                    review["sentiment"],
                    review["sentimentScore"],
                    review["createdAt"],
                    review["responseStatus"],
                    review["reply"],
                    review["replyDate"],
                    review["source"],
                ),
            )

    @staticmethod
    def _row_to_review(row: sqlite3.Row) -> dict:
        return {
            "id": row["id"],
            "customerId": row["customer_id"],
            "customerName": row["customer_name"],
            "email": row["email"],
            "product": row["product"],
            "category": row["category"],
            "rating": row["rating"],
            "reviewTitle": row["review_title"],
            "reviewText": row["review_text"],
            "recommendation": row["recommendation"],
            "sentiment": row["sentiment"],
            "sentimentScore": row["sentiment_score"],
            "createdAt": row["created_at"],
            "responseStatus": row["response_status"],
            "reply": row["reply"],
            "replyDate": row["reply_date"],
            "source": row["source"],
        }

    @staticmethod
    def _row_to_notification(row: sqlite3.Row) -> dict:
        return {
            "id": row["id"],
            "title": row["title"],
            "message": row["message"],
            "unread": bool(row["unread"]),
            "createdAt": row["created_at"],
        }

    @staticmethod
    def _row_to_complaint(row: sqlite3.Row) -> dict:
        return {
            "id": row["id"],
            "reviewId": row["review_id"],
            "title": row["title"],
            "description": row["description"],
            "customerName": row["customer_name"],
            "product": row["product"],
            "priority": row["priority"],
            "assignee": row["assignee"],
            "status": row["status"],
            "createdAt": row["created_at"],
        }

    def get_version(self) -> str:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT value FROM app_meta WHERE key = 'version'").fetchone()
            return row["value"] if row else "0"

    def get_bootstrap(self) -> dict:
        with self._lock, self._connect() as conn:
            reviews = [
                self._row_to_review(r)
                for r in conn.execute("SELECT * FROM reviews ORDER BY created_at DESC").fetchall()
            ]
            notifications = [
                self._row_to_notification(n)
                for n in conn.execute("SELECT * FROM notifications ORDER BY created_at DESC").fetchall()
            ]
            complaints = [
                self._row_to_complaint(c)
                for c in conn.execute("SELECT * FROM complaints ORDER BY created_at DESC").fetchall()
            ]
            version_row = conn.execute("SELECT value FROM app_meta WHERE key = 'version'").fetchone()
            return {
                "reviews": reviews,
                "notifications": notifications,
                "complaints": complaints,
                "version": version_row["value"] if version_row else "0",
            }

    def register_customer(self, name: str, email: str, password: str) -> tuple[dict | None, str | None, str | None]:
        clean_email = email.strip().lower()
        clean_name = name.strip()
        with self._lock, self._connect() as conn:
            existing = conn.execute(
                "SELECT id FROM customers WHERE lower(email) = ?",
                (clean_email,),
            ).fetchone()
            if existing:
                return None, None, "An account with this email already exists. Please sign in instead."

            customer_id = f"cust_{uuid.uuid4().hex[:12]}"
            created_at = iso_now()
            conn.execute(
                "INSERT INTO customers (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
                (customer_id, clean_name, clean_email, hash_password(password), created_at),
            )
            token = self._create_session_row(conn, customer_id)
            return {"id": customer_id, "name": clean_name, "email": clean_email}, token, None

    def login_customer(self, email: str, password: str) -> tuple[dict | None, str | None, str | None]:
        clean_email = email.strip().lower()
        with self._lock, self._connect() as conn:
            row = conn.execute(
                "SELECT id, name, email, password_hash FROM customers WHERE lower(email) = ?",
                (clean_email,),
            ).fetchone()
            if not row or not verify_password(password, row["password_hash"]):
                return None, None, "Invalid customer credentials. Use customer@feedbackpro.io / customer123 or create an account."

            token = self._create_session_row(conn, row["id"])
            return {"id": row["id"], "name": row["name"], "email": row["email"]}, token, None

    def _create_session_row(self, conn: sqlite3.Connection, customer_id: str) -> str:
        token = secrets.token_urlsafe(32)
        now = utc_now()
        expires = now + timedelta(days=SESSION_TTL_DAYS)
        conn.execute(
            "INSERT INTO customer_sessions (token, customer_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, customer_id, now.isoformat().replace("+00:00", "Z"), expires.isoformat().replace("+00:00", "Z")),
        )
        return token

    def get_customer_by_session(self, token: str | None) -> dict | None:
        if not token:
            return None
        with self._lock, self._connect() as conn:
            row = conn.execute(
                """
                SELECT c.id, c.name, c.email, s.expires_at
                FROM customer_sessions s
                JOIN customers c ON c.id = s.customer_id
                WHERE s.token = ?
                """,
                (token,),
            ).fetchone()
            if not row:
                return None
            expires_at = datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00"))
            if expires_at < utc_now():
                conn.execute("DELETE FROM customer_sessions WHERE token = ?", (token,))
                return None
            return {"id": row["id"], "name": row["name"], "email": row["email"]}

    def logout_customer(self, token: str | None) -> None:
        if not token:
            return
        with self._lock, self._connect() as conn:
            conn.execute("DELETE FROM customer_sessions WHERE token = ?", (token,))

    def list_customer_reviews(self, customer: dict) -> list[dict]:
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                """
                SELECT * FROM reviews
                WHERE customer_id = ? OR lower(email) = lower(?)
                ORDER BY created_at DESC
                """,
                (customer["id"], customer["email"]),
            ).fetchall()
            return [self._row_to_review(r) for r in rows]

    def create_review(self, payload: dict, customer: dict | None = None, source: str = "admin") -> dict:
        customer_name = str(payload.get("customerName") or "").strip()[:80]
        email = str(payload.get("email") or "").strip().lower()[:120]
        product = str(payload.get("product") or "").strip()[:80]
        category = str(payload.get("category") or "").strip()[:80]
        review_title = str(payload.get("reviewTitle") or "").strip()[:80]
        review_text = str(payload.get("reviewText") or "").strip()[:500]
        recommendation = str(payload.get("recommendation") or "Yes").strip()
        if recommendation not in {"Yes", "Maybe", "No"}:
            recommendation = "Yes"
        rating = int(payload.get("rating"))

        sentiment, score = analyze_sentiment_py(review_text, rating)
        review_id = str(payload.get("id") or uuid.uuid4())
        created_at = str(payload.get("createdAt") or iso_now())
        customer_id = customer["id"] if customer else None

        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO reviews (
                    id, customer_id, customer_name, email, product, category, rating,
                    review_title, review_text, recommendation, sentiment, sentiment_score,
                    created_at, response_status, reply, reply_date, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', '', '', ?)
                """,
                (
                    review_id,
                    customer_id,
                    customer_name,
                    email,
                    product,
                    category,
                    rating,
                    review_title,
                    review_text,
                    recommendation,
                    sentiment,
                    score,
                    created_at,
                    source,
                ),
            )
            conn.execute(
                "INSERT INTO notifications (id, title, message, unread, created_at) VALUES (?, ?, ?, 1, ?)",
                (
                    str(uuid.uuid4()),
                    "New customer review",
                    f"{customer_name} added a {sentiment.lower()} review for {product}.",
                    iso_now(),
                ),
            )
            self._bump_version(conn)
            row = conn.execute("SELECT * FROM reviews WHERE id = ?", (review_id,)).fetchone()
            return self._row_to_review(row)

    def import_reviews(self, rows: list[dict]) -> int:
        with self._lock, self._connect() as conn:
            inserted = 0
            for item in rows:
                review_text = str(item.get("reviewText") or "").strip()
                try:
                    rating = int(item.get("rating"))
                except (TypeError, ValueError):
                    continue
                if not review_text or not (1 <= rating <= 5):
                    continue
                sentiment, score = analyze_sentiment_py(review_text, rating)
                recommendation = item.get("recommendation")
                if recommendation not in {"Yes", "Maybe", "No"}:
                    recommendation = "Yes" if rating >= 4 else ("No" if rating <= 2 else "Maybe")
                conn.execute(
                    """
                    INSERT OR IGNORE INTO reviews (
                        id, customer_id, customer_name, email, product, category, rating,
                        review_title, review_text, recommendation, sentiment, sentiment_score,
                        created_at, response_status, reply, reply_date, source
                    ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'import')
                    """,
                    (
                        str(item.get("id") or uuid.uuid4()),
                        str(item.get("customerName") or "Anonymous").strip()[:80],
                        str(item.get("email") or "").strip()[:120],
                        str(item.get("product") or "Unspecified").strip()[:80],
                        str(item.get("category") or "Other").strip()[:80],
                        rating,
                        str(item.get("reviewTitle") or review_text[:60]).strip()[:80],
                        review_text[:500],
                        recommendation,
                        sentiment,
                        score,
                        str(item.get("createdAt") or iso_now()),
                        "responded" if item.get("responseStatus") == "responded" else "pending",
                        str(item.get("reply") or ""),
                        str(item.get("replyDate") or ""),
                    ),
                )
                inserted += 1
            self._bump_version(conn)
            return inserted

    def reply_to_review(self, review_id: str, reply_text: str, customer_name: str = "") -> dict | None:
        reply_date = iso_now()
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM reviews WHERE id = ?", (review_id,)).fetchone()
            if not row:
                return None
            conn.execute(
                "UPDATE reviews SET reply = ?, response_status = 'responded', reply_date = ? WHERE id = ?",
                (reply_text, reply_date, review_id),
            )
            display_customer = customer_name or row["customer_name"] or "customer"
            conn.execute(
                "INSERT INTO notifications (id, title, message, unread, created_at) VALUES (?, ?, ?, 0, ?)",
                (
                    str(uuid.uuid4()),
                    "Response sent to customer",
                    f"Admin replied to review by {display_customer}.",
                    reply_date,
                ),
            )
            self._bump_version(conn)
            updated = conn.execute("SELECT * FROM reviews WHERE id = ?", (review_id,)).fetchone()
            return self._row_to_review(updated)

    def toggle_review_status(self, review_id: str, status: str) -> dict | None:
        next_status = "responded" if status == "responded" else "pending"
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT id FROM reviews WHERE id = ?", (review_id,)).fetchone()
            if not row:
                return None
            conn.execute("UPDATE reviews SET response_status = ? WHERE id = ?", (next_status, review_id))
            self._bump_version(conn)
            updated = conn.execute("SELECT * FROM reviews WHERE id = ?", (review_id,)).fetchone()
            return self._row_to_review(updated)

    def delete_review(self, review_id: str) -> bool:
        with self._lock, self._connect() as conn:
            cur = conn.execute("DELETE FROM reviews WHERE id = ?", (review_id,))
            if cur.rowcount:
                self._bump_version(conn)
                return True
            return False

    def clear_reviews(self) -> None:
        with self._lock, self._connect() as conn:
            conn.execute("DELETE FROM reviews")
            conn.execute("DELETE FROM complaints")
            self._bump_version(conn)

    def reset_sample_data(self) -> dict:
        with self._lock, self._connect() as conn:
            conn.execute("DELETE FROM reviews")
            conn.execute("DELETE FROM complaints")
            conn.execute("DELETE FROM notifications")
            self._insert_sample_reviews(conn)
            conn.execute(
                "INSERT INTO notifications (id, title, message, unread, created_at) VALUES (?, ?, ?, 1, ?)",
                (
                    str(uuid.uuid4()),
                    "Data reset complete",
                    "Your application has been restored to the initial sample dataset.",
                    iso_now(),
                ),
            )
            self._bump_version(conn)
        return self.get_bootstrap()

    def mark_notifications_read(self, notification_id: str | None = None) -> None:
        with self._lock, self._connect() as conn:
            if notification_id:
                conn.execute("UPDATE notifications SET unread = 0 WHERE id = ?", (notification_id,))
            else:
                conn.execute("UPDATE notifications SET unread = 0")
            self._bump_version(conn)

    def replace_complaints(self, complaints: list[dict]) -> None:
        with self._lock, self._connect() as conn:
            conn.execute("DELETE FROM complaints")
            for issue in complaints:
                conn.execute(
                    """
                    INSERT INTO complaints (
                        id, review_id, title, description, customer_name, product,
                        priority, assignee, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(issue.get("id") or uuid.uuid4()),
                        str(issue.get("reviewId") or ""),
                        str(issue.get("title") or ""),
                        str(issue.get("description") or ""),
                        str(issue.get("customerName") or "Anonymous"),
                        str(issue.get("product") or "Unspecified"),
                        str(issue.get("priority") or "Medium"),
                        str(issue.get("assignee") or ""),
                        str(issue.get("status") or "Open"),
                        str(issue.get("createdAt") or iso_now()),
                    ),
                )
            self._bump_version(conn)


class FeedbackRequestHandler(BaseHTTPRequestHandler):
    store: FeedbackStore

    def log_message(self, format: str, *args) -> None:
        pass

    def _send_json(self, status: int, payload: dict, extra_headers: list[tuple[str, str]] | None = None) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if extra_headers:
            for key, value in extra_headers:
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc:
            raise ValueError("Invalid Content-Length") from exc
        if length <= 0 or length > MAX_BODY_BYTES:
            raise ValueError("Invalid request body size")
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError("Invalid JSON body") from exc
        if not isinstance(data, dict):
            raise ValueError("Expected JSON object")
        return data

    def _get_cookie(self, name: str) -> str | None:
        cookie_header = self.headers.get("Cookie")
        if not cookie_header:
            return None
        cookie = SimpleCookie()
        cookie.load(cookie_header)
        morsel = cookie.get(name)
        return morsel.value if morsel else None

    @staticmethod
    def _build_session_cookie(name: str, value: str, max_age: int) -> tuple[str, str]:
        return (
            "Set-Cookie",
            f"{name}={value}; Path=/; HttpOnly; SameSite=Lax; Max-Age={max_age}",
        )

    def _current_customer(self) -> dict | None:
        token = self._get_cookie(SESSION_COOKIE_NAME)
        return self.store.get_customer_by_session(token)

    def do_GET(self) -> None:
        path = urlparse(self.path).path

        if path == "/api/health":
            self._send_json(HTTPStatus.OK, {"ok": True, "backend": "python", "version": self.store.get_version()})
            return

        if path == "/api/sync-state":
            self._send_json(HTTPStatus.OK, {"version": self.store.get_version()})
            return

        if path == "/api/bootstrap":
            self._send_json(HTTPStatus.OK, self.store.get_bootstrap())
            return

        if path == "/api/customer/me":
            customer = self._current_customer()
            self._send_json(
                HTTPStatus.OK,
                {"authenticated": bool(customer), "customer": customer},
            )
            return

        if path == "/api/customer/feedback":
            customer = self._current_customer()
            if not customer:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "Customer sign-in required."})
                return
            reviews = self.store.list_customer_reviews(customer)
            self._send_json(HTTPStatus.OK, {"reviews": reviews})
            return

        self._serve_static(path)

    def do_POST(self) -> None:
        path = urlparse(self.path).path

        if path == "/api/customer/register":
            try:
                data = self._read_json()
            except ValueError as err:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(err)})
                return

            name = str(data.get("name") or "").strip()
            email = str(data.get("email") or "").strip().lower()
            password = str(data.get("password") or "")
            if not name or len(name) > 80:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Please enter your full name (max 80 characters)."})
                return
            if not EMAIL_RE.match(email) or len(email) > 120:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Please enter a valid email address."})
                return
            if len(password) < 6:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Choose a password with at least 6 characters."})
                return

            customer, token, err_msg = self.store.register_customer(name, email, password)
            if err_msg:
                self._send_json(HTTPStatus.CONFLICT, {"error": err_msg})
                return

            self._send_json(
                HTTPStatus.CREATED,
                {"customer": customer},
                [self._build_session_cookie(SESSION_COOKIE_NAME, token, SESSION_TTL_DAYS * 86400)],
            )
            return

        if path == "/api/customer/login":
            try:
                data = self._read_json()
            except ValueError as err:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(err)})
                return

            email = str(data.get("email") or "").strip().lower()
            password = str(data.get("password") or "")
            if not EMAIL_RE.match(email) or not password:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Please enter your email address and password."})
                return

            customer, token, err_msg = self.store.login_customer(email, password)
            if err_msg:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": err_msg})
                return

            self._send_json(
                HTTPStatus.OK,
                {"customer": customer},
                [self._build_session_cookie(SESSION_COOKIE_NAME, token, SESSION_TTL_DAYS * 86400)],
            )
            return

        if path == "/api/customer/logout":
            token = self._get_cookie(SESSION_COOKIE_NAME)
            self.store.logout_customer(token)
            self._send_json(
                HTTPStatus.OK,
                {"ok": True},
                [self._build_session_cookie(SESSION_COOKIE_NAME, "", 0)],
            )
            return

        if path == "/api/customer/feedback":
            customer = self._current_customer()
            if not customer:
                self._send_json(HTTPStatus.UNAUTHORIZED, {"error": "Please sign in first to send feedback."})
                return
            try:
                data = self._read_json()
                validation_err = self._validate_feedback_payload(data)
                if validation_err:
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": validation_err})
                    return
                review = self.store.create_review(data, customer=customer, source="customer-portal")
                self._send_json(HTTPStatus.CREATED, {"review": review})
            except ValueError as err:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(err)})
            return

        if path == "/api/reviews":
            try:
                data = self._read_json()
                validation_err = self._validate_feedback_payload(data)
                if validation_err:
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": validation_err})
                    return
                review = self.store.create_review(data, customer=None, source="admin")
                self._send_json(HTTPStatus.CREATED, {"review": review})
            except ValueError as err:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(err)})
            return

        if path == "/api/reviews/import":
            try:
                data = self._read_json()
                rows = data.get("reviews")
                if not isinstance(rows, list):
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Expected reviews list."})
                    return
                count = self.store.import_reviews(rows)
                self._send_json(HTTPStatus.OK, {"imported": count})
            except ValueError as err:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(err)})
            return

        reply_match = re.fullmatch(r"/api/reviews/([^/]+)/reply", path)
        if reply_match:
            review_id = reply_match.group(1)
            try:
                data = self._read_json()
            except ValueError as err:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(err)})
                return
            reply_text = str(data.get("reply") or "").strip()
            if not reply_text:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Reply text cannot be empty."})
                return
            updated = self.store.reply_to_review(review_id, reply_text, str(data.get("customerName") or ""))
            if not updated:
                self._send_json(HTTPStatus.NOT_FOUND, {"error": "Review not found."})
                return
            self._send_json(HTTPStatus.OK, {"review": updated})
            return

        if path == "/api/notifications/read":
            try:
                data = self._read_json()
            except ValueError:
                data = {}
            self.store.mark_notifications_read(data.get("id"))
            self._send_json(HTTPStatus.OK, {"ok": True})
            return

        if path == "/api/admin/reset-sample":
            snapshot = self.store.reset_sample_data()
            self._send_json(HTTPStatus.OK, snapshot)
            return

        self._send_json(HTTPStatus.NOT_FOUND, {"error": "Endpoint not found."})

    def do_PATCH(self) -> None:
        path = urlparse(self.path).path
        status_match = re.fullmatch(r"/api/reviews/([^/]+)/status", path)
        if status_match:
            review_id = status_match.group(1)
            try:
                data = self._read_json()
            except ValueError as err:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(err)})
                return
            updated = self.store.toggle_review_status(review_id, str(data.get("responseStatus") or "pending"))
            if not updated:
                self._send_json(HTTPStatus.NOT_FOUND, {"error": "Review not found."})
                return
            self._send_json(HTTPStatus.OK, {"review": updated})
            return

        self._send_json(HTTPStatus.NOT_FOUND, {"error": "Endpoint not found."})

    def do_PUT(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/complaints":
            try:
                data = self._read_json()
            except ValueError as err:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(err)})
                return
            complaints = data.get("complaints")
            if not isinstance(complaints, list):
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Expected complaints array."})
                return
            self.store.replace_complaints(complaints)
            self._send_json(HTTPStatus.OK, {"ok": True})
            return

        self._send_json(HTTPStatus.NOT_FOUND, {"error": "Endpoint not found."})

    def do_DELETE(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/reviews":
            self.store.clear_reviews()
            self._send_json(HTTPStatus.OK, {"ok": True})
            return

        delete_match = re.fullmatch(r"/api/reviews/([^/]+)", path)
        if delete_match:
            review_id = delete_match.group(1)
            deleted = self.store.delete_review(review_id)
            if not deleted:
                self._send_json(HTTPStatus.NOT_FOUND, {"error": "Review not found."})
                return
            self._send_json(HTTPStatus.OK, {"ok": True})
            return

        self._send_json(HTTPStatus.NOT_FOUND, {"error": "Endpoint not found."})

    @staticmethod
    def _validate_feedback_payload(data: dict) -> str | None:
        if not str(data.get("customerName") or "").strip():
            return "Please enter your name."
        email = str(data.get("email") or "").strip()
        if not EMAIL_RE.match(email):
            return "Please enter a valid email address."
        if not str(data.get("product") or "").strip():
            return "Please select a product or service."
        if not str(data.get("category") or "").strip():
            return "Please select a feedback category."
        try:
            rating = int(data.get("rating"))
        except (TypeError, ValueError):
            rating = 0
        if rating < 1 or rating > 5:
            return "Please choose a star rating between 1 and 5."
        if not str(data.get("reviewTitle") or "").strip():
            return "Please provide a brief feedback title."
        if not str(data.get("reviewText") or "").strip():
            return "Please write your detailed feedback before sending."
        return None

    def _serve_static(self, req_path: str) -> None:
        rel = unquote(req_path).lstrip("/") or "index.html"
        target = (ROOT_DIR / rel).resolve()
        try:
            rel_parts = target.relative_to(ROOT_DIR).parts
        except ValueError:
            self.send_error(HTTPStatus.FORBIDDEN, "Forbidden")
            return

        if not rel_parts or rel_parts[0] in BLOCKED_STATIC_PREFIXES:
            self.send_error(HTTPStatus.FORBIDDEN, "Forbidden")
            return

        if target.name.startswith(".") or target.suffix.lower() in BLOCKED_STATIC_SUFFIXES:
            self.send_error(HTTPStatus.FORBIDDEN, "Forbidden")
            return

        if target.is_dir():
            target = target / "index.html"

        if not target.is_file():
            self.send_error(HTTPStatus.NOT_FOUND, "File not found")
            return

        content_type, _ = mimetypes.guess_type(str(target))
        data = target.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type or "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True


def main() -> None:
    parser = argparse.ArgumentParser(description="FeedbackPro Python Backend Server")
    parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8000")))
    parser.add_argument("--db", default=os.environ.get("FEEDBACKPRO_DB", str(DEFAULT_DB_PATH)))
    args = parser.parse_args()

    store = FeedbackStore(Path(args.db))

    class BoundHandler(FeedbackRequestHandler):
        pass

    BoundHandler.store = store
    server = ReusableThreadingHTTPServer((args.host, args.port), BoundHandler)
    print(f"FeedbackPro Python server running on http://{args.host}:{args.port}")
    print(f"  Admin Portal:    http://{args.host}:{args.port}/login.html")
    print(f"  Customer Portal: http://{args.host}:{args.port}/customer-portal.html")
    print(f"  SQLite DB:       {args.db}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
