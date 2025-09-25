function scheduleAutoRefresh({
  refreshIntervalMs = 30 * 60 * 1000,
  warningMs = 10_000,
  shouldDelay = () => false,
  onBeforeRefresh = () => {},
} = {}) {
  if (refreshIntervalMs <= warningMs) {
    console.warn('REFRESH', 'Refresh interval should be greater than warning window. Skipping auto refresh setup.');
    return () => {};
  }

  let warnTimerId = null;
  let refreshTimerId = null;
  let cancelled = false;

  const clearTimers = () => {
    if (warnTimerId) {
      clearTimeout(warnTimerId);
      warnTimerId = null;
    }
    if (refreshTimerId) {
      clearTimeout(refreshTimerId);
      refreshTimerId = null;
    }
  };

  const attemptRefresh = () => {
    if (cancelled) return;
    if (shouldDelay()) {
      console.info('REFRESH', 'Delaying automatic refresh due to active workload.');
      refreshTimerId = setTimeout(attemptRefresh, warningMs);
      return;
    }
    try {
      onBeforeRefresh();
    } catch (error) {
      console.error('REFRESH', 'Error in onBeforeRefresh callback', error);
    }
    window.location.reload();
  };

  warnTimerId = setTimeout(() => {
    console.warn('REFRESH', `Page will refresh in ${warningMs / 1000}s unless activity prevents it.`);
    refreshTimerId = setTimeout(attemptRefresh, warningMs);
  }, refreshIntervalMs - warningMs);

  return () => {
    cancelled = true;
    clearTimers();
  };
}

export { scheduleAutoRefresh };
