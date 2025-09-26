use axum::{http::StatusCode, Json};
use serde::Serialize;

/// Simple health response returned by the `/health` endpoint.
#[derive(Serialize)]
pub struct HealthResponse {
    status: &'static str,
}

/// Liveness probe that always returns HTTP 200 when the service is up.
pub async fn check() -> (StatusCode, Json<HealthResponse>) {
    (StatusCode::OK, Json(HealthResponse { status: "ok" }))
}
