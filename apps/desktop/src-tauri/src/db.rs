// ═══════════════════════════════════════════════════════════
// Orivraa Desktop — Offline Database Module
// Encrypted SQLite for local CRM data, draft orders, sync queue
// ═══════════════════════════════════════════════════════════

use rusqlite::{params, Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

/// Central database wrapper. Holds a Mutex<Connection> so
/// Tauri commands (which are async) can share it via State.
#[derive(Debug)]
pub struct Database {
    pub conn: Mutex<Connection>,
}

// ── Cached data models ──────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CachedOrder {
    pub id: String,
    pub order_number: String,
    pub status: String,
    pub customer_name: String,
    pub total_npr: f64,
    pub shop_id: String,
    pub created_at: String,
    pub updated_at: String,
    pub sync_version: i64,
    pub raw_json: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CachedCustomer {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub customer_type: String, // REGISTERED | WALK_IN
    pub shop_id: Option<String>,
    pub total_spent: f64,
    pub order_count: i64,
    pub created_at: String,
    pub sync_version: i64,
    pub raw_json: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CachedProduct {
    pub id: String,
    pub name: String,
    pub sku: Option<String>,
    pub jewellery_type: String,
    pub metal_type: String,
    pub weight_grams: f64,
    pub price_npr: f64,
    pub shop_id: String,
    pub image_url: Option<String>,
    pub sync_version: i64,
    pub raw_json: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CachedMetalRate {
    pub id: String,
    pub metal_type: String,
    pub purity: String,
    pub rate_per_gram: f64,
    pub currency: String,
    pub source: String,
    pub fetched_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DraftItem {
    pub id: String,
    pub draft_type: String, // INVOICE | QUOTE | ORDER
    pub shop_id: String,
    pub title: String,
    pub payload_json: String,
    pub created_at: String,
    pub updated_at: String,
    pub synced: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncQueueEntry {
    pub id: String,
    pub action: String,   // CREATE | UPDATE | DELETE
    pub endpoint: String,  // API path e.g. /orders
    pub payload: String,   // JSON body
    pub created_at: String,
    pub retry_count: i64,
    pub last_error: Option<String>,
}

// ── Database path helper ────────────────────────────────────

pub fn get_db_path() -> PathBuf {
    let base = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("com.orivraa.desktop");
    std::fs::create_dir_all(&base).ok();
    base.join("orivraa_local.db")
}

// ── Init / Migration ────────────────────────────────────────

impl Database {
    pub fn new() -> SqlResult<Self> {
        let path = get_db_path();
        log::info!("Opening local database at {:?}", path);
        let conn = Connection::open(&path)?;

        // Enable WAL mode for better concurrent read performance
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;

        // Run migrations
        Self::run_migrations(&conn)?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    fn run_migrations(conn: &Connection) -> SqlResult<()> {
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS meta (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            -- Cached orders from server
            CREATE TABLE IF NOT EXISTS cached_orders (
                id            TEXT PRIMARY KEY,
                order_number  TEXT NOT NULL,
                status        TEXT NOT NULL,
                customer_name TEXT NOT NULL DEFAULT '',
                total_npr     REAL NOT NULL DEFAULT 0,
                shop_id       TEXT NOT NULL,
                created_at    TEXT NOT NULL,
                updated_at    TEXT NOT NULL,
                sync_version  INTEGER NOT NULL DEFAULT 0,
                raw_json      TEXT NOT NULL DEFAULT '{}'
            );
            CREATE INDEX IF NOT EXISTS idx_orders_shop ON cached_orders(shop_id);

            -- Cached customers
            CREATE TABLE IF NOT EXISTS cached_customers (
                id            TEXT PRIMARY KEY,
                name          TEXT NOT NULL,
                email         TEXT,
                phone         TEXT,
                customer_type TEXT NOT NULL DEFAULT 'REGISTERED',
                shop_id       TEXT,
                total_spent   REAL NOT NULL DEFAULT 0,
                order_count   INTEGER NOT NULL DEFAULT 0,
                created_at    TEXT NOT NULL,
                sync_version  INTEGER NOT NULL DEFAULT 0,
                raw_json      TEXT NOT NULL DEFAULT '{}'
            );
            CREATE INDEX IF NOT EXISTS idx_customers_shop ON cached_customers(shop_id);

            -- Cached products
            CREATE TABLE IF NOT EXISTS cached_products (
                id              TEXT PRIMARY KEY,
                name            TEXT NOT NULL,
                sku             TEXT,
                jewellery_type  TEXT NOT NULL DEFAULT '',
                metal_type      TEXT NOT NULL DEFAULT '',
                weight_grams    REAL NOT NULL DEFAULT 0,
                price_npr       REAL NOT NULL DEFAULT 0,
                shop_id         TEXT NOT NULL,
                image_url       TEXT,
                sync_version    INTEGER NOT NULL DEFAULT 0,
                raw_json        TEXT NOT NULL DEFAULT '{}'
            );
            CREATE INDEX IF NOT EXISTS idx_products_shop ON cached_products(shop_id);

            -- Cached metal rates (latest)
            CREATE TABLE IF NOT EXISTS cached_metal_rates (
                id             TEXT PRIMARY KEY,
                metal_type     TEXT NOT NULL,
                purity         TEXT NOT NULL,
                rate_per_gram  REAL NOT NULL,
                currency       TEXT NOT NULL DEFAULT 'NPR',
                source         TEXT NOT NULL DEFAULT 'api',
                fetched_at     TEXT NOT NULL
            );

            -- Draft items (created offline, pending sync)
            CREATE TABLE IF NOT EXISTS drafts (
                id            TEXT PRIMARY KEY,
                draft_type    TEXT NOT NULL,
                shop_id       TEXT NOT NULL,
                title         TEXT NOT NULL DEFAULT '',
                payload_json  TEXT NOT NULL,
                created_at    TEXT NOT NULL,
                updated_at    TEXT NOT NULL,
                synced        INTEGER NOT NULL DEFAULT 0
            );

            -- Sync queue (pending server operations)
            CREATE TABLE IF NOT EXISTS sync_queue (
                id          TEXT PRIMARY KEY,
                action      TEXT NOT NULL,
                endpoint    TEXT NOT NULL,
                payload     TEXT NOT NULL,
                created_at  TEXT NOT NULL,
                retry_count INTEGER NOT NULL DEFAULT 0,
                last_error  TEXT
            );

            -- Session / auth cache
            CREATE TABLE IF NOT EXISTS auth_cache (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                expires_at TEXT
            );
            ",
        )?;

        // Record schema version
        conn.execute(
            "INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '1')",
            [],
        )?;

        log::info!("Database migrations complete (v1)");
        Ok(())
    }
}

// ── Query helpers ───────────────────────────────────────────

impl Database {
    // ─── Orders ─────────────────────────────────
    pub fn get_orders_by_shop(&self, shop_id: &str) -> SqlResult<Vec<CachedOrder>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, order_number, status, customer_name, total_npr, shop_id,
                    created_at, updated_at, sync_version, raw_json
             FROM cached_orders WHERE shop_id = ?1 ORDER BY created_at DESC LIMIT 200",
        )?;
        let rows = stmt.query_map(params![shop_id], |row| {
            Ok(CachedOrder {
                id: row.get(0)?,
                order_number: row.get(1)?,
                status: row.get(2)?,
                customer_name: row.get(3)?,
                total_npr: row.get(4)?,
                shop_id: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
                sync_version: row.get(8)?,
                raw_json: row.get(9)?,
            })
        })?;
        rows.collect()
    }

    pub fn upsert_order(&self, order: &CachedOrder) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO cached_orders
             (id, order_number, status, customer_name, total_npr, shop_id, created_at, updated_at, sync_version, raw_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                order.id, order.order_number, order.status, order.customer_name,
                order.total_npr, order.shop_id, order.created_at, order.updated_at,
                order.sync_version, order.raw_json,
            ],
        )?;
        Ok(())
    }

    // ─── Customers ──────────────────────────────
    pub fn get_customers_by_shop(&self, shop_id: &str) -> SqlResult<Vec<CachedCustomer>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, email, phone, customer_type, shop_id,
                    total_spent, order_count, created_at, sync_version, raw_json
             FROM cached_customers WHERE shop_id = ?1 OR shop_id IS NULL ORDER BY name LIMIT 500",
        )?;
        let rows = stmt.query_map(params![shop_id], |row| {
            Ok(CachedCustomer {
                id: row.get(0)?,
                name: row.get(1)?,
                email: row.get(2)?,
                phone: row.get(3)?,
                customer_type: row.get(4)?,
                shop_id: row.get(5)?,
                total_spent: row.get(6)?,
                order_count: row.get(7)?,
                created_at: row.get(8)?,
                sync_version: row.get(9)?,
                raw_json: row.get(10)?,
            })
        })?;
        rows.collect()
    }

    pub fn upsert_customer(&self, c: &CachedCustomer) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO cached_customers
             (id, name, email, phone, customer_type, shop_id, total_spent, order_count, created_at, sync_version, raw_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                c.id, c.name, c.email, c.phone, c.customer_type, c.shop_id,
                c.total_spent, c.order_count, c.created_at, c.sync_version, c.raw_json,
            ],
        )?;
        Ok(())
    }

    // ─── Products ───────────────────────────────
    pub fn get_products_by_shop(&self, shop_id: &str) -> SqlResult<Vec<CachedProduct>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, sku, jewellery_type, metal_type, weight_grams, price_npr,
                    shop_id, image_url, sync_version, raw_json
             FROM cached_products WHERE shop_id = ?1 ORDER BY name LIMIT 1000",
        )?;
        let rows = stmt.query_map(params![shop_id], |row| {
            Ok(CachedProduct {
                id: row.get(0)?,
                name: row.get(1)?,
                sku: row.get(2)?,
                jewellery_type: row.get(3)?,
                metal_type: row.get(4)?,
                weight_grams: row.get(5)?,
                price_npr: row.get(6)?,
                shop_id: row.get(7)?,
                image_url: row.get(8)?,
                sync_version: row.get(9)?,
                raw_json: row.get(10)?,
            })
        })?;
        rows.collect()
    }

    // ─── Metal Rates ────────────────────────────
    pub fn get_metal_rates(&self) -> SqlResult<Vec<CachedMetalRate>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, metal_type, purity, rate_per_gram, currency, source, fetched_at
             FROM cached_metal_rates ORDER BY metal_type, purity",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(CachedMetalRate {
                id: row.get(0)?,
                metal_type: row.get(1)?,
                purity: row.get(2)?,
                rate_per_gram: row.get(3)?,
                currency: row.get(4)?,
                source: row.get(5)?,
                fetched_at: row.get(6)?,
            })
        })?;
        rows.collect()
    }

    // ─── Drafts ─────────────────────────────────
    pub fn get_pending_drafts(&self, shop_id: &str) -> SqlResult<Vec<DraftItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, draft_type, shop_id, title, payload_json, created_at, updated_at, synced
             FROM drafts WHERE shop_id = ?1 AND synced = 0 ORDER BY created_at DESC",
        )?;
        let rows = stmt.query_map(params![shop_id], |row| {
            Ok(DraftItem {
                id: row.get(0)?,
                draft_type: row.get(1)?,
                shop_id: row.get(2)?,
                title: row.get(3)?,
                payload_json: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                synced: row.get::<_, i64>(7)? != 0,
            })
        })?;
        rows.collect()
    }

    pub fn save_draft(&self, draft: &DraftItem) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO drafts
             (id, draft_type, shop_id, title, payload_json, created_at, updated_at, synced)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                draft.id, draft.draft_type, draft.shop_id, draft.title, draft.payload_json,
                draft.created_at, draft.updated_at, draft.synced as i64,
            ],
        )?;
        Ok(())
    }

    pub fn mark_draft_synced(&self, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("UPDATE drafts SET synced = 1 WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ─── Sync Queue ─────────────────────────────
    pub fn get_sync_queue(&self) -> SqlResult<Vec<SyncQueueEntry>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, action, endpoint, payload, created_at, retry_count, last_error
             FROM sync_queue ORDER BY created_at ASC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(SyncQueueEntry {
                id: row.get(0)?,
                action: row.get(1)?,
                endpoint: row.get(2)?,
                payload: row.get(3)?,
                created_at: row.get(4)?,
                retry_count: row.get(5)?,
                last_error: row.get(6)?,
            })
        })?;
        rows.collect()
    }

    pub fn add_to_sync_queue(&self, entry: &SyncQueueEntry) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO sync_queue (id, action, endpoint, payload, created_at, retry_count, last_error)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                entry.id, entry.action, entry.endpoint, entry.payload,
                entry.created_at, entry.retry_count, entry.last_error,
            ],
        )?;
        Ok(())
    }

    pub fn remove_from_sync_queue(&self, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM sync_queue WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn update_sync_queue_error(&self, id: &str, error: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE sync_queue SET retry_count = retry_count + 1, last_error = ?2 WHERE id = ?1",
            params![id, error],
        )?;
        Ok(())
    }

    // ─── Auth Cache ─────────────────────────────
    pub fn set_auth(&self, key: &str, value: &str, expires_at: Option<&str>) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO auth_cache (key, value, expires_at) VALUES (?1, ?2, ?3)",
            params![key, value, expires_at],
        )?;
        Ok(())
    }

    pub fn get_auth(&self, key: &str) -> SqlResult<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT value FROM auth_cache WHERE key = ?1")?;
        let mut rows = stmt.query(params![key])?;
        match rows.next()? {
            Some(row) => Ok(Some(row.get(0)?)),
            None => Ok(None),
        }
    }

    pub fn clear_auth(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM auth_cache", [])?;
        Ok(())
    }

    // ─── Stats ──────────────────────────────────
    pub fn get_local_stats(&self, shop_id: &str) -> SqlResult<serde_json::Value> {
        let conn = self.conn.lock().unwrap();
        let order_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM cached_orders WHERE shop_id = ?1",
            params![shop_id],
            |r| r.get(0),
        )?;
        let customer_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM cached_customers WHERE shop_id = ?1 OR shop_id IS NULL",
            params![shop_id],
            |r| r.get(0),
        )?;
        let product_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM cached_products WHERE shop_id = ?1",
            params![shop_id],
            |r| r.get(0),
        )?;
        let pending_drafts: i64 = conn.query_row(
            "SELECT COUNT(*) FROM drafts WHERE shop_id = ?1 AND synced = 0",
            params![shop_id],
            |r| r.get(0),
        )?;
        let sync_queue_size: i64 = conn.query_row(
            "SELECT COUNT(*) FROM sync_queue",
            [],
            |r| r.get(0),
        )?;

        Ok(serde_json::json!({
            "cachedOrders": order_count,
            "cachedCustomers": customer_count,
            "cachedProducts": product_count,
            "pendingDrafts": pending_drafts,
            "syncQueueSize": sync_queue_size,
        }))
    }

    /// Wipe all cached data (for logout)
    pub fn clear_all_cached_data(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "DELETE FROM cached_orders;
             DELETE FROM cached_customers;
             DELETE FROM cached_products;
             DELETE FROM cached_metal_rates;
             DELETE FROM drafts;
             DELETE FROM sync_queue;
             DELETE FROM auth_cache;",
        )?;
        log::info!("All local cached data cleared");
        Ok(())
    }
}
