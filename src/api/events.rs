use rocket::{get, response::stream::EventStream, State};
use tokio::sync::broadcast;
use tokio::time as TokioTime;
use tracing::{debug, error, info, warn};

use crate::sse::format_app_event;
use crate::AppState;

/// Rocket route for establishing a Server-Sent Events (SSE) connection.
#[get("/events")]
pub fn sse_events(state: &State<AppState>) -> EventStream![] {
    let sender = state.event_bus_sender.clone();
    let keep_alive_interval = state.config.sse_keep_alive_interval();
    info!("New SSE client connected to /api/events.");

    EventStream! {
        let mut receiver = sender.subscribe();
        let mut interval = TokioTime::interval(keep_alive_interval);
        interval.tick().await;
        interval.set_missed_tick_behavior(TokioTime::MissedTickBehavior::Skip);

        loop {
            tokio::select! {
                event_result = receiver.recv() => {
                    match event_result {
                        Ok(event) => {
                            debug!("SSE: Received AppEvent for broadcast: {:?}", event);
                            if let Some(rocket_event) = format_app_event(&event) {
                                yield rocket_event;
                            } else {
                                error!("SSE: Failed to format AppEvent for SSE client (event was: {:?}).", event);
                            }
                        },
                        Err(broadcast::error::RecvError::Closed) => {
                            info!("SSE: Broadcast channel closed for a client connection, disconnecting.");
                            break;
                        },
                        Err(broadcast::error::RecvError::Lagged(skipped)) => {
                            warn!("SSE: Client lagged, skipped {} events. Consider increasing SSE_EVENT_BUFFER_SIZE or client processing speed.", skipped);
                        }
                    }
                },
                _ = interval.tick() => {
                    debug!("SSE: Sending keep-alive comment.");
                    yield rocket::response::stream::Event::comment("keep-alive");
                }
            }
        }
    }
}
