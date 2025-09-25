function createDebugLogger(namespace) {
  const label = namespace ? `[${namespace}]` : '';
  const prefixArgs = (...args) => (label ? [label, ...args] : args);

  return {
    debug: (...args) => {
      if (!window.__QUEUE_DEBUG__) return;
      console.log(...prefixArgs(...args));
    },
    info: (...args) => {
      if (!window.__QUEUE_DEBUG__) return;
      console.info(...prefixArgs(...args));
    },
    warn: (...args) => {
      console.warn(...prefixArgs(...args));
    },
    error: (...args) => {
      console.error(...prefixArgs(...args));
    },
  };
}

export { createDebugLogger };
