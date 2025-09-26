use std::convert::Infallible;
use std::sync::Arc;

use axum::extract::State;
use axum::response::sse::{Event, Sse};
use tokio::time::{self, MissedTickBehavior};
use tokio_stream::wrappers::errors::BroadcastStreamRecvError;
use tokio_stream::wrappers::{BroadcastStream, IntervalStream};
use tokio_stream::{iter, Stream, StreamExt};
use tracing::{debug, error, info, warn};

use crate::sse::format_app_event;
use crate::{AppEvent, AppState};

/// Axum route for establishing a Server-Sent Events (SSE) connection.
pub async fn sse_events(
    State(state): State<Arc<AppState>>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let sender = state.event_bus_sender.clone();
    let keep_alive_interval = state.config.sse_keep_alive_interval();
    info!("New SSE client connected to /api/events.");

    let broadcast_receiver = sender.subscribe();
    let mut interval = time::interval(keep_alive_interval);
    interval.set_missed_tick_behavior(MissedTickBehavior::Skip);
    interval.tick().await;

    let event_stream = BroadcastStream::new(broadcast_receiver).filter_map(|event_result| {
        match event_result {
            Ok(event) => {
                debug!("SSE: Received AppEvent for broadcast: {:?}", event);
                match format_app_event(&event) {
                    Some(axum_event) => Some(axum_event),
                    None => {
                        error!(
                            "SSE: Failed to format AppEvent for SSE client (event was: {:?}).",
                            event
                        );
                        None
                    }
                }
            }
            Err(BroadcastStreamRecvError::Lagged(skipped)) => {
                warn!(
                    "SSE: Client lagged, skipped {} events. Consider increasing SSE_EVENT_BUFFER_SIZE or client processing speed.",
                    skipped
                );
                None
            }
        }
    });

    let event_stream = event_stream.map(|event| Ok::<Event, Infallible>(event));

    let initial_status = state.announcements.current_status().await;
    let initial_event = format_app_event(&AppEvent::AnnouncementStatus(initial_status));
    let initial_stream = iter(initial_event.into_iter().map(Ok::<Event, Infallible>));

    let keep_alive_stream = IntervalStream::new(interval).map(|_| {
        debug!("SSE: Sending keep-alive comment.");
        Ok::<Event, Infallible>(Event::default().comment("keep-alive"))
    });

    let combined_stream = initial_stream.chain(event_stream).merge(keep_alive_stream);

    Sse::new(combined_stream)
}
