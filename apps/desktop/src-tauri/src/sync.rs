// ═══════════════════════════════════════════════════════════
// Orivraa Desktop — Sync Engine
// Background worker that syncs local data with api.orivraa.com
// ═══════════════════════════════════════════════════════════

use crate::db::Database;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tokio::time;

const API_BASE: &str = "https://api.orivraa.com";
const SYNC_INTERVAL_SECS: u64 = 300; // 5 minutes
const MAX_RETRY: i64 = 10;

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncStatus {
    pub is_online: bool,
    pub last_sync_at: Option<String>,
    pub pending_uploads: i64,
    pub pending_downloads: i64,
    pub sync_in_progress: bool,
}

#[derive(Debug, Clone)]
pub struct SyncEngine {
    client: Client,
    db: Arc<Database>,
}

impl SyncEngine {
    pub fn new(db: Arc<Database>) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("Orivraa-Desktop/0.1.0")
            .build()
            .expect("Failed to build HTTP client");

        Self { client, db }
    }

    /// Check internet connectivity by pinging the API health endpoint
    pub async fn check_connectivity(&self) -> bool {
        match self
            .client
            .get(format!("{}/health", API_BASE))
            .timeout(Duration::from_secs(5))
            .send()
            .await
        {
            Ok(resp) => resp.status().is_success(),
            Err(_) => false,
        }
    }

    /// Get current sync status
    pub fn get_status(&self) -> SyncStatus {
        let queue = self.db.get_sync_queue().unwrap_or_default();
        let last_sync = self
            .db
            .get_auth("last_sync_at")
            .unwrap_or(None);

        SyncStatus {
            is_online: false, // Updated by caller
            last_sync_at: last_sync,
            pending_uploads: queue.len() as i64,
            pending_downloads: 0,
            sync_in_progress: false,
        }
    }

    /// Process the sync queue — push pending local changes to server
    pub async fn process_upload_queue(&self, token: &str) -> Result<i64, String> {
        let entries = self
            .db
            .get_sync_queue()
            .map_err(|e| format!("DB error: {}", e))?;

        if entries.is_empty() {
            return Ok(0);
        }

        let mut synced = 0i64;

        for entry in &entries {
            if entry.retry_count >= MAX_RETRY {
                log::warn!("Skipping sync entry {} — max retries exceeded", entry.id);
                continue;
            }

            let url = format!("{}{}", API_BASE, entry.endpoint);
            let result = match entry.action.as_str() {
                "CREATE" => {
                    self.client
                        .post(&url)
                        .bearer_auth(token)
                        .header("Content-Type", "application/json")
                        .body(entry.payload.clone())
                        .send()
                        .await
                }
                "UPDATE" => {
                    self.client
                        .patch(&url)
                        .bearer_auth(token)
                        .header("Content-Type", "application/json")
                        .body(entry.payload.clone())
                        .send()
                        .await
                }
                "DELETE" => {
                    self.client
                        .delete(&url)
                        .bearer_auth(token)
                        .send()
                        .await
                }
                _ => {
                    log::warn!("Unknown sync action: {}", entry.action);
                    continue;
                }
            };

            match result {
                Ok(resp) if resp.status().is_success() => {
                    self.db
                        .remove_from_sync_queue(&entry.id)
                        .map_err(|e| format!("DB error: {}", e))?;
                    synced += 1;
                    log::info!("Synced {} {}", entry.action, entry.endpoint);
                }
                Ok(resp) => {
                    let status = resp.status();
                    let body = resp.text().await.unwrap_or_default();
                    let err_msg = format!("HTTP {} — {}", status, body);
                    log::warn!("Sync failed for {}: {}", entry.id, err_msg);
                    self.db
                        .update_sync_queue_error(&entry.id, &err_msg)
                        .ok();
                }
                Err(e) => {
                    let err_msg = format!("Network error: {}", e);
                    log::warn!("Sync network error for {}: {}", entry.id, err_msg);
                    self.db
                        .update_sync_queue_error(&entry.id, &err_msg)
                        .ok();
                    // Stop trying if we're offline
                    break;
                }
            }
        }

        Ok(synced)
    }

    /// Pull latest data from server into local cache
    pub async fn pull_data(
        &self,
        token: &str,
        shop_id: &str,
    ) -> Result<serde_json::Value, String> {
        let is_online = self.check_connectivity().await;
        if !is_online {
            return Err("Offline — cannot pull data".into());
        }

        let mut pulled = serde_json::json!({
            "orders": 0,
            "customers": 0,
            "products": 0,
            "metalRates": 0,
        });

        // Pull orders
        match self.pull_orders(token, shop_id).await {
            Ok(count) => pulled["orders"] = serde_json::json!(count),
            Err(e) => log::warn!("Failed to pull orders: {}", e),
        }

        // Pull customers
        match self.pull_customers(token, shop_id).await {
            Ok(count) => pulled["customers"] = serde_json::json!(count),
            Err(e) => log::warn!("Failed to pull customers: {}", e),
        }

        // Pull metal rates
        match self.pull_metal_rates(token).await {
            Ok(count) => pulled["metalRates"] = serde_json::json!(count),
            Err(e) => log::warn!("Failed to pull metal rates: {}", e),
        }

        // Record last sync time
        let now = chrono::Utc::now().to_rfc3339();
        self.db.set_auth("last_sync_at", &now, None).ok();

        log::info!("Pull complete: {:?}", pulled);
        Ok(pulled)
    }

    async fn pull_orders(&self, token: &str, shop_id: &str) -> Result<usize, String> {
        let url = format!("{}/shops/{}/orders?limit=200", API_BASE, shop_id);
        let resp = self
            .client
            .get(&url)
            .bearer_auth(token)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            return Err(format!("HTTP {}", resp.status()));
        }

        let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        let orders = body["orders"]
            .as_array()
            .cloned()
            .unwrap_or_default();

        let count = orders.len();
        for order in &orders {
            let cached = crate::db::CachedOrder {
                id: order["id"].as_str().unwrap_or_default().to_string(),
                order_number: order["orderNumber"].as_str().unwrap_or_default().to_string(),
                status: order["status"].as_str().unwrap_or("UNKNOWN").to_string(),
                customer_name: order["customer"]["name"]
                    .as_str()
                    .or_else(|| order["customerName"].as_str())
                    .unwrap_or("Unknown")
                    .to_string(),
                total_npr: order["totalNpr"].as_f64().unwrap_or(0.0),
                shop_id: shop_id.to_string(),
                created_at: order["createdAt"].as_str().unwrap_or_default().to_string(),
                updated_at: order["updatedAt"].as_str().unwrap_or_default().to_string(),
                sync_version: chrono::Utc::now().timestamp(),
                raw_json: serde_json::to_string(order).unwrap_or_default(),
            };
            self.db.upsert_order(&cached).ok();
        }

        Ok(count)
    }

    async fn pull_customers(&self, token: &str, shop_id: &str) -> Result<usize, String> {
        let url = format!("{}/shops/{}/customers?limit=500", API_BASE, shop_id);
        let resp = self
            .client
            .get(&url)
            .bearer_auth(token)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            return Err(format!("HTTP {}", resp.status()));
        }

        let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        let customers = body["customers"]
            .as_array()
            .cloned()
            .unwrap_or_default();

        let count = customers.len();
        for c in &customers {
            let cached = crate::db::CachedCustomer {
                id: c["id"].as_str().unwrap_or_default().to_string(),
                name: c["name"].as_str().unwrap_or("Unknown").to_string(),
                email: c["email"].as_str().map(|s| s.to_string()),
                phone: c["phone"].as_str().map(|s| s.to_string()),
                customer_type: c["type"].as_str().unwrap_or("REGISTERED").to_string(),
                shop_id: Some(shop_id.to_string()),
                total_spent: c["totalSpent"].as_f64().unwrap_or(0.0),
                order_count: c["orderCount"].as_i64().unwrap_or(0),
                created_at: c["createdAt"].as_str().unwrap_or_default().to_string(),
                sync_version: chrono::Utc::now().timestamp(),
                raw_json: serde_json::to_string(c).unwrap_or_default(),
            };
            self.db.upsert_customer(&cached).ok();
        }

        Ok(count)
    }

    async fn pull_metal_rates(&self, token: &str) -> Result<usize, String> {
        let url = format!("{}/market/rates", API_BASE);
        let resp = self
            .client
            .get(&url)
            .bearer_auth(token)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !resp.status().is_success() {
            return Err(format!("HTTP {}", resp.status()));
        }

        let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        let rates = body["rates"]
            .as_array()
            .cloned()
            .unwrap_or_default();

        let count = rates.len();
        let now = chrono::Utc::now().to_rfc3339();
        for rate in &rates {
            let cached = crate::db::CachedMetalRate {
                id: format!(
                    "{}-{}",
                    rate["metalType"].as_str().unwrap_or(""),
                    rate["purity"].as_str().unwrap_or("")
                ),
                metal_type: rate["metalType"].as_str().unwrap_or("").to_string(),
                purity: rate["purity"].as_str().unwrap_or("").to_string(),
                rate_per_gram: rate["ratePerGram"].as_f64().unwrap_or(0.0),
                currency: rate["currency"].as_str().unwrap_or("NPR").to_string(),
                source: "api".to_string(),
                fetched_at: now.clone(),
            };
            let conn = self.db.conn.lock().unwrap();
            conn.execute(
                "INSERT OR REPLACE INTO cached_metal_rates
                 (id, metal_type, purity, rate_per_gram, currency, source, fetched_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![
                    cached.id, cached.metal_type, cached.purity, cached.rate_per_gram,
                    cached.currency, cached.source, cached.fetched_at,
                ],
            )
            .ok();
        }

        Ok(count)
    }

    /// Start the background sync loop
    pub fn start_background_sync(self: Arc<Self>, token: String, shop_id: String) {
        tokio::spawn(async move {
            let mut interval = time::interval(Duration::from_secs(SYNC_INTERVAL_SECS));
            loop {
                interval.tick().await;

                let is_online = self.check_connectivity().await;
                if !is_online {
                    log::debug!("Offline — skipping sync cycle");
                    continue;
                }

                // Upload pending changes
                match self.process_upload_queue(&token).await {
                    Ok(n) if n > 0 => log::info!("Uploaded {} pending items", n),
                    Err(e) => log::warn!("Upload queue error: {}", e),
                    _ => {}
                }

                // Pull latest from server
                match self.pull_data(&token, &shop_id).await {
                    Ok(stats) => log::info!("Sync pull: {:?}", stats),
                    Err(e) => log::warn!("Sync pull error: {}", e),
                }
            }
        });
    }
}
