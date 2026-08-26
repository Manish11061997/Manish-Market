"""
SQLite User Database and Data Isolation Manager.
Provides thread-safe storage for Users, Watchlists, Portfolios, Orders, and Alerts.
"""

import sqlite3
import hashlib
import hmac
import os
import json
import uuid
import time
from typing import Optional, Dict, List, Any
import logging

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "database", "market_users.db")

def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=15.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    if not salt:
        salt = os.urandom(16).hex()
    hashed = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        iterations=100_000
    ).hex()
    return hashed, salt

def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    new_hash, _ = hash_password(password, salt)
    return hmac.compare_digest(new_hash, stored_hash)

class UserDatabaseManager:
    def __init__(self):
        self._init_tables()

    def _init_tables(self):
        conn = get_db_connection()
        try:
            with conn:
                # 1. Users Table
                conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
                    name TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    market_preference TEXT DEFAULT 'IN',
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                );
                """)

                # 2. User Watchlists Table
                conn.execute("""
                CREATE TABLE IF NOT EXISTS user_watchlists (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    market TEXT NOT NULL DEFAULT 'IN',
                    name TEXT NOT NULL,
                    is_default INTEGER NOT NULL DEFAULT 0,
                    symbols TEXT NOT NULL DEFAULT '[]',
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                """)

                # 3. User Portfolios Table
                conn.execute("""
                CREATE TABLE IF NOT EXISTS user_portfolios (
                    user_id TEXT PRIMARY KEY,
                    cash_balance_in REAL NOT NULL DEFAULT 1000000.0,
                    cash_balance_us REAL NOT NULL DEFAULT 100000.0,
                    positions_json TEXT NOT NULL DEFAULT '{}',
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                """)

                # 4. User Orders Table
                conn.execute("""
                CREATE TABLE IF NOT EXISTS user_orders (
                    order_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    side TEXT NOT NULL,
                    quantity INTEGER NOT NULL,
                    requested_price REAL NOT NULL,
                    filled_price REAL NOT NULL,
                    order_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    market TEXT NOT NULL DEFAULT 'IN',
                    created_time TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                """)

                # 5. User Price Alerts Table
                conn.execute("""
                CREATE TABLE IF NOT EXISTS user_alerts (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    target_price REAL NOT NULL,
                    direction TEXT NOT NULL,
                    note TEXT DEFAULT '',
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at REAL NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                """)

                # Create indices for quick lookups
                conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_user_watchlists_uid ON user_watchlists(user_id);")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_user_orders_uid ON user_orders(user_id);")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_user_alerts_uid ON user_alerts(user_id);")

            logger.info("User database tables initialized successfully.")
        finally:
            conn.close()

    # --- User Management ---
    def create_user(self, email: str, name: str, password: str, market_preference: str = 'IN') -> Dict[str, Any]:
        email_clean = email.strip().lower()
        if not email_clean or '@' not in email_clean:
            raise ValueError("Invalid email address format.")
        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters long.")
        if not name.strip():
            name = email_clean.split('@')[0].capitalize()

        pwd_hash, salt = hash_password(password)
        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        now = time.time()

        conn = get_db_connection()
        try:
            with conn:
                conn.execute("""
                INSERT INTO users (id, email, name, password_hash, salt, market_preference, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """, (user_id, email_clean, name.strip(), pwd_hash, salt, market_preference, now, now))

                # Initialize default portfolio
                conn.execute("""
                INSERT INTO user_portfolios (user_id, cash_balance_in, cash_balance_us, positions_json, created_at, updated_at)
                VALUES (?, 1000000.0, 100000.0, '{}', ?, ?);
                """, (user_id, now, now))

                # Initialize default Indian Watchlist
                default_in_syms = json.dumps([])
                conn.execute("""
                INSERT INTO user_watchlists (id, user_id, market, name, is_default, symbols, created_at, updated_at)
                VALUES (?, ?, 'IN', '⭐ My Watchlist', 1, ?, ?, ?);
                """, (f"wl_in_{uuid.uuid4().hex[:8]}", user_id, default_in_syms, now, now))

                # Initialize default US Watchlist
                default_us_syms = json.dumps([])
                conn.execute("""
                INSERT INTO user_watchlists (id, user_id, market, name, is_default, symbols, created_at, updated_at)
                VALUES (?, ?, 'US', '⭐ My Watchlist', 1, ?, ?, ?);
                """, (f"wl_us_{uuid.uuid4().hex[:8]}", user_id, default_us_syms, now, now))

            return self.get_user_by_id(user_id)
        except sqlite3.IntegrityError:
            raise ValueError(f"An account with email '{email_clean}' already exists. Please sign in.")
        finally:
            conn.close()

    def get_or_create_google_user(self, email: str, name: str, market_preference: str = 'IN') -> Dict[str, Any]:
        email_clean = email.strip().lower()
        if not email_clean or '@' not in email_clean:
            raise ValueError("Invalid Google email address format.")
        
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT id FROM users WHERE email = ?;", (email_clean,)).fetchone()
            if row:
                return self.get_user_by_id(row['id'])
        finally:
            conn.close()

        # User doesn't exist yet, create with randomized secure password
        random_pwd = uuid.uuid4().hex + uuid.uuid4().hex
        return self.create_user(
            email=email_clean,
            name=name if name and name.strip() else email_clean.split('@')[0].capitalize(),
            password=random_pwd,
            market_preference=market_preference
        )

    def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        email_clean = email.strip().lower()
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT * FROM users WHERE email = ?;", (email_clean,)).fetchone()
            if not row:
                return None
            if verify_password(password, row['password_hash'], row['salt']):
                return {
                    "id": row['id'],
                    "email": row['email'],
                    "name": row['name'],
                    "marketPreference": row['market_preference'],
                    "createdAt": row['created_at']
                }
            return None
        finally:
            conn.close()

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT id, email, name, market_preference, created_at FROM users WHERE id = ?;", (user_id,)).fetchone()
            if not row:
                return None
            return {
                "id": row['id'],
                "email": row['email'],
                "name": row['name'],
                "marketPreference": row['market_preference'],
                "createdAt": row['created_at']
            }
        finally:
            conn.close()

    def update_user_preferences(self, user_id: str, name: Optional[str] = None, market_preference: Optional[str] = None) -> Dict[str, Any]:
        conn = get_db_connection()
        try:
            with conn:
                updates = []
                params = []
                if name:
                    updates.append("name = ?")
                    params.append(name.strip())
                if market_preference:
                    updates.append("market_preference = ?")
                    params.append(market_preference.upper())
                
                if updates:
                    updates.append("updated_at = ?")
                    params.append(time.time())
                    params.append(user_id)
                    conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?;", tuple(params))
            return self.get_user_by_id(user_id)
        finally:
            conn.close()

    # --- User Watchlists ---
    def get_user_watchlists(self, user_id: str, market: Optional[str] = None) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            query = "SELECT * FROM user_watchlists WHERE user_id = ?"
            params = [user_id]
            if market:
                query += " AND market = ?"
                params.append(market.upper())
            query += " ORDER BY is_default DESC, created_at ASC;"

            rows = conn.execute(query, tuple(params)).fetchall()
            results = []
            for r in rows:
                try:
                    symbols = json.loads(r['symbols'])
                except Exception:
                    symbols = []
                results.append({
                    "id": r['id'],
                    "market": r['market'],
                    "name": r['name'],
                    "isDefault": bool(r['is_default']),
                    "symbols": symbols,
                    "createdAt": r['created_at']
                })
            return results
        finally:
            conn.close()

    def save_user_watchlists(self, user_id: str, market: str, watchlists: List[Dict[str, Any]]):
        conn = get_db_connection()
        now = time.time()
        market_clean = market.upper()
        try:
            with conn:
                # Delete existing for this market
                conn.execute("DELETE FROM user_watchlists WHERE user_id = ? AND market = ?;", (user_id, market_clean))
                for idx, wl in enumerate(watchlists):
                    wl_id = wl.get("id") or f"wl_{market_clean.lower()}_{uuid.uuid4().hex[:8]}"
                    is_def = 1 if wl.get("isDefault", False) or idx == 0 else 0
                    symbols_json = json.dumps(wl.get("symbols", []))
                    conn.execute("""
                    INSERT INTO user_watchlists (id, user_id, market, name, is_default, symbols, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                    """, (wl_id, user_id, market_clean, wl.get("name", "Watchlist"), is_def, symbols_json, now, now))
        finally:
            conn.close()

    # --- User Paper Portfolio ---
    def get_user_portfolio(self, user_id: str, market: str = 'IN') -> Dict[str, Any]:
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT * FROM user_portfolios WHERE user_id = ?;", (user_id,)).fetchone()
            if not row:
                now = time.time()
                with conn:
                    conn.execute("""
                    INSERT INTO user_portfolios (user_id, cash_balance_in, cash_balance_us, positions_json, created_at, updated_at)
                    VALUES (?, 1000000.0, 100000.0, '{}', ?, ?);
                    """, (user_id, now, now))
                row = conn.execute("SELECT * FROM user_portfolios WHERE user_id = ?;", (user_id,)).fetchone()

            cash = row['cash_balance_in'] if market == 'IN' else row['cash_balance_us']
            try:
                positions = json.loads(row['positions_json'])
            except Exception:
                positions = {}

            # Fetch user orders
            order_rows = conn.execute(
                "SELECT * FROM user_orders WHERE user_id = ? AND market = ? ORDER BY timestamp DESC LIMIT 50;",
                (user_id, market)
            ).fetchall()

            orders = []
            for o in order_rows:
                orders.append({
                    "orderId": o['order_id'],
                    "symbol": o['symbol'],
                    "side": o['side'],
                    "quantity": o['quantity'],
                    "requestedPrice": o['requested_price'],
                    "filledPrice": o['filled_price'],
                    "orderType": o['order_type'],
                    "status": o['status'],
                    "market": o['market'],
                    "createdTime": o['created_time'],
                    "timestamp": o['timestamp']
                })

            return {
                "userId": user_id,
                "market": market,
                "cashBalance": cash,
                "positions": positions,
                "orders": orders
            }
        finally:
            conn.close()

    def record_user_order(self, user_id: str, order_data: Dict[str, Any], market: str = 'IN') -> Dict[str, Any]:
        conn = get_db_connection()
        now = time.time()
        order_id = order_data.get("orderId") or f"ord_{uuid.uuid4().hex[:10]}"
        symbol = order_data["symbol"]
        side = order_data["side"].upper()
        qty = int(order_data["quantity"])
        req_price = float(order_data["price"])
        filled_price = float(order_data.get("filledPrice", req_price))
        order_type = order_data.get("orderType", "MARKET")
        status = order_data.get("status", "FILLED")
        created_time = order_data.get("createdTime") or time.strftime("%Y-%m-%d %H:%M:%S")

        try:
            with conn:
                # 1. Insert order
                conn.execute("""
                INSERT INTO user_orders (order_id, user_id, symbol, side, quantity, requested_price, filled_price, order_type, status, market, created_time, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (order_id, user_id, symbol, side, qty, req_price, filled_price, order_type, status, market, created_time, now))

                # 2. Update portfolio cash and positions
                p_row = conn.execute("SELECT * FROM user_portfolios WHERE user_id = ?;", (user_id,)).fetchone()
                cash_in = p_row['cash_balance_in'] if p_row else 1000000.0
                cash_us = p_row['cash_balance_us'] if p_row else 100000.0
                try:
                    positions = json.loads(p_row['positions_json']) if p_row else {}
                except Exception:
                    positions = {}

                trade_value = filled_price * qty
                if side == "BUY":
                    if market == 'IN':
                        cash_in = max(0.0, cash_in - trade_value)
                    else:
                        cash_us = max(0.0, cash_us - trade_value)

                    curr_pos = positions.get(symbol, {"quantity": 0, "avgPrice": 0.0, "totalCost": 0.0})
                    new_qty = curr_pos["quantity"] + qty
                    new_cost = curr_pos["totalCost"] + trade_value
                    new_avg = new_cost / new_qty if new_qty > 0 else filled_price
                    positions[symbol] = {
                        "symbol": symbol,
                        "quantity": new_qty,
                        "avgPrice": round(new_avg, 2),
                        "totalCost": round(new_cost, 2),
                        "market": market
                    }
                elif side == "SELL":
                    if market == 'IN':
                        cash_in += trade_value
                    else:
                        cash_us += trade_value

                    curr_pos = positions.get(symbol, {"quantity": 0, "avgPrice": 0.0, "totalCost": 0.0})
                    new_qty = max(0, curr_pos["quantity"] - qty)
                    if new_qty == 0:
                        positions.pop(symbol, None)
                    else:
                        new_cost = curr_pos["avgPrice"] * new_qty
                        positions[symbol] = {
                            "symbol": symbol,
                            "quantity": new_qty,
                            "avgPrice": curr_pos["avgPrice"],
                            "totalCost": round(new_cost, 2),
                            "market": market
                        }

                conn.execute("""
                UPDATE user_portfolios
                SET cash_balance_in = ?, cash_balance_us = ?, positions_json = ?, updated_at = ?
                WHERE user_id = ?;
                """, (cash_in, cash_us, json.dumps(positions), now, user_id))

            return self.get_user_portfolio(user_id, market)
        finally:
            conn.close()

    def reset_user_portfolio(self, user_id: str, market: str = 'IN'):
        conn = get_db_connection()
        now = time.time()
        try:
            with conn:
                conn.execute("DELETE FROM user_orders WHERE user_id = ? AND market = ?;", (user_id, market))
                if market == 'IN':
                    conn.execute("UPDATE user_portfolios SET cash_balance_in = 1000000.0, positions_json = '{}', updated_at = ? WHERE user_id = ?;", (now, user_id))
                else:
                    conn.execute("UPDATE user_portfolios SET cash_balance_us = 100000.0, positions_json = '{}', updated_at = ? WHERE user_id = ?;", (now, user_id))
        finally:
            conn.close()

# Global Singleton
user_db = UserDatabaseManager()
