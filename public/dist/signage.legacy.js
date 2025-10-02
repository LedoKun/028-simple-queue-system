(function () {
  'use strict';

  function asyncGeneratorStep(n, t, e, r, o, a, c) {
    try {
      var i = n[a](c),
        u = i.value;
    } catch (n) {
      return void e(n);
    }
    i.done ? t(u) : Promise.resolve(u).then(r, o);
  }
  function _asyncToGenerator(n) {
    return function () {
      var t = this,
        e = arguments;
      return new Promise(function (r, o) {
        var a = n.apply(t, e);
        function _next(n) {
          asyncGeneratorStep(a, r, o, _next, _throw, "next", n);
        }
        function _throw(n) {
          asyncGeneratorStep(a, r, o, _next, _throw, "throw", n);
        }
        _next(void 0);
      });
    };
  }
  function _extends() {
    return _extends = Object.assign ? Object.assign.bind() : function (n) {
      for (var e = 1; e < arguments.length; e++) {
        var t = arguments[e];
        for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
      }
      return n;
    }, _extends.apply(null, arguments);
  }
  function _objectWithoutPropertiesLoose(r, e) {
    if (null == r) return {};
    var t = {};
    for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
      if (-1 !== e.indexOf(n)) continue;
      t[n] = r[n];
    }
    return t;
  }
  function _regenerator() {
    /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */
    var e,
      t,
      r = "function" == typeof Symbol ? Symbol : {},
      n = r.iterator || "@@iterator",
      o = r.toStringTag || "@@toStringTag";
    function i(r, n, o, i) {
      var c = n && n.prototype instanceof Generator ? n : Generator,
        u = Object.create(c.prototype);
      return _regeneratorDefine(u, "_invoke", function (r, n, o) {
        var i,
          c,
          u,
          f = 0,
          p = o || [],
          y = false,
          G = {
            p: 0,
            n: 0,
            v: e,
            a: d,
            f: d.bind(e, 4),
            d: function (t, r) {
              return i = t, c = 0, u = e, G.n = r, a;
            }
          };
        function d(r, n) {
          for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) {
            var o,
              i = p[t],
              d = G.p,
              l = i[2];
            r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0));
          }
          if (o || r > 1) return a;
          throw y = true, n;
        }
        return function (o, p, l) {
          if (f > 1) throw TypeError("Generator is already running");
          for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) {
            i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u);
            try {
              if (f = 2, i) {
                if (c || (o = "next"), t = i[o]) {
                  if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object");
                  if (!t.done) return t;
                  u = t.value, c < 2 && (c = 0);
                } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1);
                i = e;
              } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break;
            } catch (t) {
              i = e, c = 1, u = t;
            } finally {
              f = 1;
            }
          }
          return {
            value: t,
            done: y
          };
        };
      }(r, o, i), true), u;
    }
    var a = {};
    function Generator() {}
    function GeneratorFunction() {}
    function GeneratorFunctionPrototype() {}
    t = Object.getPrototypeOf;
    var c = [][n] ? t(t([][n]())) : (_regeneratorDefine(t = {}, n, function () {
        return this;
      }), t),
      u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c);
    function f(e) {
      return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e;
    }
    return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine(u), _regeneratorDefine(u, o, "Generator"), _regeneratorDefine(u, n, function () {
      return this;
    }), _regeneratorDefine(u, "toString", function () {
      return "[object Generator]";
    }), (_regenerator = function () {
      return {
        w: i,
        m: f
      };
    })();
  }
  function _regeneratorDefine(e, r, n, t) {
    var i = Object.defineProperty;
    try {
      i({}, "", {});
    } catch (e) {
      i = 0;
    }
    _regeneratorDefine = function (e, r, n, t) {
      function o(r, n) {
        _regeneratorDefine(e, r, function (e) {
          return this._invoke(r, n, e);
        });
      }
      r ? i ? i(e, r, {
        value: n,
        enumerable: !t,
        configurable: !t,
        writable: !t
      }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2));
    }, _regeneratorDefine(e, r, n, t);
  }

  var API_BASE_URL = '/api';
  var SSE_URL = API_BASE_URL + "/events";
  var UI_TEXT = {
    en: {
      connecting: 'Connecting to server...',
      connected: 'Live Connection Active',
      disconnected: 'Connection lost. Retrying...',
      announcementPlaceholder: 'Announcements',
      historyPlaceholder: '----',
      skippedPlaceholder: '----',
      loading: 'Loading...',
      errorPrefix: 'Error: ',
      successPrefix: 'Success: '
    },
    th: {
      connecting: 'กำลังเชื่อมต่อเซิร์ฟเวอร์...',
      connected: 'เชื่อมต่อสดแล้ว',
      disconnected: 'ตัดการเชื่อมต่อ - กำลังลองใหม่...',
      announcementPlaceholder: 'ประกาศ',
      historyPlaceholder: 'รอการเรียก...',
      skippedPlaceholder: 'ไม่มีคิวที่ข้ามไป',
      loading: 'กำลังโหลด...',
      errorPrefix: 'ข้อผิดพลาด: ',
      successPrefix: 'สำเร็จ: '
    }
  };
  var currentLanguage = 'en';
  function getCurrentLanguage() {
    return currentLanguage;
  }
  function setCurrentLanguage(lang) {
    if (lang && UI_TEXT[lang]) {
      currentLanguage = lang;
    } else {
      currentLanguage = 'en';
    }
    if (typeof window !== 'undefined') {
      window.currentGlobalLanguage = currentLanguage;
    }
    return currentLanguage;
  }
  function getLabels(lang) {
    if (lang === void 0) {
      lang = getCurrentLanguage();
    }
    return UI_TEXT[lang] || UI_TEXT.en;
  }

  function renderCallList(container, items, options) {
    if (options === void 0) {
      options = {};
    }
    if (!container) return;
    var _options = options,
      _options$maxItems = _options.maxItems,
      maxItems = _options$maxItems === void 0 ? Array.isArray(items) ? items.length : 0 : _options$maxItems,
      _options$placeholderT = _options.placeholderText,
      placeholderText = _options$placeholderT === void 0 ? '' : _options$placeholderT,
      _options$itemClass = _options.itemClass,
      itemClass = _options$itemClass === void 0 ? 'history-item flex justify-between items-center' : _options$itemClass,
      _options$placeholderC = _options.placeholderClass,
      placeholderClass = _options$placeholderC === void 0 ? itemClass + " italic" : _options$placeholderC,
      _options$highlightCla = _options.highlightClass,
      highlightClass = _options$highlightCla === void 0 ? '' : _options$highlightCla,
      _options$timestampCla = _options.timestampClass,
      timestampClass = _options$timestampCla === void 0 ? 'text-xs text-gray-400' : _options$timestampCla,
      _options$reverse = _options.reverse,
      reverse = _options$reverse === void 0 ? false : _options$reverse,
      _options$showTimestam = _options.showTimestamp,
      showTimestamp = _options$showTimestam === void 0 ? true : _options$showTimestam,
      _options$timestampFor = _options.timestampFormatter,
      timestampFormatter = _options$timestampFor === void 0 ? function (value) {
        return value != null ? value : '';
      } : _options$timestampFor,
      _options$sanitizer = _options.sanitizer,
      sanitizer = _options$sanitizer === void 0 ? function (value) {
        return value == null ? '' : String(value);
      } : _options$sanitizer;
    container.innerHTML = '';
    var data = Array.isArray(items) ? items.slice(0, maxItems) : [];
    if (reverse) data.reverse();
    if (data.length === 0) {
      var placeholder = document.createElement('li');
      placeholder.className = placeholderClass.trim();
      placeholder.textContent = placeholderText;
      container.appendChild(placeholder);
      return;
    }
    data.forEach(function (entry) {
      var _entry$id, _entry$location;
      var li = document.createElement('li');
      li.className = itemClass;
      var labelSpan = document.createElement('span');
      var idStrong = document.createElement('strong');
      idStrong.className = ['font-semibold', highlightClass].filter(Boolean).join(' ');
      idStrong.textContent = sanitizer((_entry$id = entry == null ? void 0 : entry.id) != null ? _entry$id : '----');
      var arrowSpan = document.createElement('span');
      arrowSpan.textContent = ' → ';
      var locationStrong = document.createElement('strong');
      locationStrong.className = ['font-semibold', highlightClass].filter(Boolean).join(' ');
      locationStrong.textContent = sanitizer((_entry$location = entry == null ? void 0 : entry.location) != null ? _entry$location : '----');
      labelSpan.appendChild(idStrong);
      labelSpan.appendChild(arrowSpan);
      labelSpan.appendChild(locationStrong);
      li.appendChild(labelSpan);
      if (showTimestamp) {
        var _entry$timestamp;
        var tsSpan = document.createElement('span');
        tsSpan.className = timestampClass;
        tsSpan.textContent = timestampFormatter((_entry$timestamp = entry == null ? void 0 : entry.timestamp) != null ? _entry$timestamp : '');
        li.appendChild(tsSpan);
      }
      container.appendChild(li);
    });
  }
  function createSseIndicatorUpdater(element, options) {
    if (options === void 0) {
      options = {};
    }
    if (!element) return function () {};
    var _options2 = options,
      _options2$statusClass = _options2.statusClassMap,
      statusClassMap = _options2$statusClass === void 0 ? {} : _options2$statusClass,
      _options2$baseClass = _options2.baseClass,
      baseClass = _options2$baseClass === void 0 ? element.className : _options2$baseClass,
      _options2$setDataset = _options2.setDataset,
      setDataset = _options2$setDataset === void 0 ? false : _options2$setDataset,
      _options2$fallbackMes = _options2.fallbackMessage,
      fallbackMessage = _options2$fallbackMes === void 0 ? '' : _options2$fallbackMes,
      _options2$keepClasses = _options2.keepClasses,
      keepClasses = _options2$keepClasses === void 0 ? false : _options2$keepClasses;
    var classMap = _extends({
      default: ''
    }, statusClassMap);
    return function (_temp) {
      var _ref = _temp === void 0 ? {} : _temp,
        status = _ref.status,
        message = _ref.message;
      var normalizedStatus = status || '';
      var text = message || fallbackMessage || normalizedStatus;
      element.textContent = text;
      if (setDataset) {
        element.dataset.status = normalizedStatus;
      }
      if (!keepClasses) {
        var mappedClass = Object.prototype.hasOwnProperty.call(classMap, normalizedStatus) ? classMap[normalizedStatus] : classMap.default;
        element.className = [baseClass, mappedClass].filter(Boolean).join(' ');
      }
    };
  }

  function sanitizeText(value) {
    if (value === null || typeof value === 'undefined') {
      return '';
    }
    var temp = document.createElement('div');
    temp.textContent = String(value);
    return temp.innerHTML;
  }
  function formatDisplayTime(isoTimestamp) {
    if (!isoTimestamp) {
      return '';
    }
    try {
      var date = new Date(isoTimestamp);
      return date.toLocaleTimeString(navigator.language, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('FORMAT', 'Failed to format timestamp', isoTimestamp, error);
      return 'Invalid Time';
    }
  }

  function scheduleAutoRefresh(_temp) {
    var _ref = _temp === void 0 ? {} : _temp,
      _ref$refreshIntervalM = _ref.refreshIntervalMs,
      refreshIntervalMs = _ref$refreshIntervalM === void 0 ? 30 * 60 * 1000 : _ref$refreshIntervalM,
      _ref$warningMs = _ref.warningMs,
      warningMs = _ref$warningMs === void 0 ? 10000 : _ref$warningMs,
      _ref$shouldDelay = _ref.shouldDelay,
      shouldDelay = _ref$shouldDelay === void 0 ? function () {
        return false;
      } : _ref$shouldDelay,
      _ref$onBeforeRefresh = _ref.onBeforeRefresh,
      onBeforeRefresh = _ref$onBeforeRefresh === void 0 ? function () {} : _ref$onBeforeRefresh;
    if (refreshIntervalMs <= warningMs) {
      console.warn('REFRESH', 'Refresh interval should be greater than warning window. Skipping auto refresh setup.');
      return function () {};
    }
    var warnTimerId = null;
    var refreshTimerId = null;
    var cancelled = false;
    var clearTimers = function clearTimers() {
      if (warnTimerId) {
        clearTimeout(warnTimerId);
        warnTimerId = null;
      }
      if (refreshTimerId) {
        clearTimeout(refreshTimerId);
        refreshTimerId = null;
      }
    };
    var _attemptRefresh = function attemptRefresh() {
      if (cancelled) return;
      if (shouldDelay()) {
        console.info('REFRESH', 'Delaying automatic refresh due to active workload.');
        refreshTimerId = setTimeout(_attemptRefresh, warningMs);
        return;
      }
      try {
        onBeforeRefresh();
      } catch (error) {
        console.error('REFRESH', 'Error in onBeforeRefresh callback', error);
      }
      window.location.reload();
    };
    warnTimerId = setTimeout(function () {
      console.warn('REFRESH', "Page will refresh in " + warningMs / 1000 + "s unless activity prevents it.");
      refreshTimerId = setTimeout(_attemptRefresh, warningMs);
    }, refreshIntervalMs - warningMs);
    return function () {
      cancelled = true;
      clearTimers();
    };
  }

  var _excluded = ["type"];
  var MAX_QUICK_RECONNECTION_ATTEMPTS = 3;
  var SHORT_RETRY_DELAY_MS = 3000;
  var MEDIUM_RETRY_DELAY_MS = 10000;
  var LONG_RETRY_DELAY_MS = 30000;
  var HEARTBEAT_IDLE_THRESHOLD_MS = 30000; // assume backend keeps events fairly frequent
  var EventStream = /*#__PURE__*/function () {
    function EventStream(url, _temp) {
      var _ref = _temp === void 0 ? {} : _temp,
        _ref$labelProvider = _ref.labelProvider,
        labelProvider = _ref$labelProvider === void 0 ? getLabels : _ref$labelProvider,
        _ref$heartbeatMs = _ref.heartbeatMs,
        heartbeatMs = _ref$heartbeatMs === void 0 ? HEARTBEAT_IDLE_THRESHOLD_MS : _ref$heartbeatMs;
      this.url = url;
      this.labelProvider = labelProvider;
      this.heartbeatMs = heartbeatMs;
      this.eventSource = null;
      this.reconnectionAttempts = 0;
      this.currentRetryDelay = SHORT_RETRY_DELAY_MS;
      this.retryTimeoutId = null;
      this.heartbeatTimerId = null;
      this.lastActivityAt = Date.now();
      this.lastStatus = null;
      this.lastStatusMessage = null;
      this.listeners = new Map();
      this.handleNamedEvent = this.handleNamedEvent.bind(this);
      this.handleOnMessage = this.handleOnMessage.bind(this);
      this.handleError = this.handleError.bind(this);
      this.handleNetworkOnline = this.handleNetworkOnline.bind(this);
      this.handleNetworkOffline = this.handleNetworkOffline.bind(this);
      if (typeof window !== 'undefined') {
        window.addEventListener('online', this.handleNetworkOnline);
        window.addEventListener('offline', this.handleNetworkOffline);
      }
    }
    var _proto = EventStream.prototype;
    _proto.on = function on(eventName, handler) {
      var _this = this;
      var normalized = String(eventName);
      if (!this.listeners.has(normalized)) {
        this.listeners.set(normalized, new Set());
      }
      var handlers = this.listeners.get(normalized);
      handlers.add(handler);
      return function () {
        return _this.off(normalized, handler);
      };
    };
    _proto.off = function off(eventName, handler) {
      var handlers = this.listeners.get(eventName);
      if (!handlers) return;
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(eventName);
      }
    };
    _proto.emit = function emit(eventName, detail) {
      var handlers = this.listeners.get(eventName);
      if (!handlers) return;
      handlers.forEach(function (handler) {
        try {
          handler({
            detail: detail
          });
        } catch (error) {
          console.error('EventStream', "Listener for \"" + eventName + "\" failed", error);
        }
      });
    };
    _proto.connect = function connect() {
      var _this2 = this;
      if (typeof window !== 'undefined' && !('EventSource' in window)) {
        this.setStatus('unsupported', {
          message: 'Live updates not supported in this browser.'
        });
        return;
      }
      if (this.eventSource && (this.eventSource.readyState === EventSource.OPEN || this.eventSource.readyState === EventSource.CONNECTING)) {
        return;
      }
      this.clearRetryTimer();
      this.ensureHeartbeatTimer();
      this.setStatus('connecting');
      this.lastActivityAt = Date.now();
      try {
        this.eventSource = new EventSource(this.url);
      } catch (error) {
        console.error('EventStream', 'Failed to create EventSource instance', error);
        this.setStatus('disconnected', {
          detail: error
        });
        this.scheduleReconnect();
        return;
      }
      this.eventSource.onopen = function () {
        _this2.lastActivityAt = Date.now();
        _this2.reconnectionAttempts = 0;
        _this2.currentRetryDelay = SHORT_RETRY_DELAY_MS;
        _this2.markActivity();
      };
      this.eventSource.onmessage = this.handleOnMessage;
      this.eventSource.addEventListener('queue_update', this.handleNamedEvent);
      this.eventSource.addEventListener('announcement_status', this.handleNamedEvent);
      this.eventSource.addEventListener('tts_complete', this.handleNamedEvent);
      this.eventSource.onerror = this.handleError;
    };
    _proto.disconnect = function disconnect() {
      this.clearRetryTimer();
      this.clearHeartbeatTimer();
      this.closeSource();
    };
    _proto.destroy = function destroy() {
      this.disconnect();
      this.listeners.clear();
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', this.handleNetworkOnline);
        window.removeEventListener('offline', this.handleNetworkOffline);
      }
    };
    _proto.handleNamedEvent = function handleNamedEvent(event) {
      this.processFrame({
        data: event.data,
        type: event.type
      });
    };
    _proto.handleOnMessage = function handleOnMessage(event) {
      this.processFrame({
        data: event.data,
        type: event.type
      });
    };
    _proto.handleError = function handleError(event) {
      var _this$eventSource;
      var readyState = (_this$eventSource = this.eventSource) == null ? void 0 : _this$eventSource.readyState;
      var detail = event instanceof Event ? {
        type: event.type
      } : event;
      if (readyState === EventSource.CLOSED) {
        this.setStatus('disconnected', {
          detail: detail
        });
      } else {
        // Treat transient errors as connecting to avoid flashing red UI for automatic retries.
        this.setStatus('connecting', {
          detail: detail
        });
      }
      this.closeSource();
      this.scheduleReconnect();
    };
    _proto.handleNetworkOnline = function handleNetworkOnline() {
      if (!this.eventSource) {
        this.connect();
      }
    };
    _proto.handleNetworkOffline = function handleNetworkOffline() {
      this.setStatus('disconnected', {
        message: 'Offline — waiting for connection…'
      });
      this.closeSource();
    };
    _proto.processFrame = function processFrame(event) {
      if (!event || !event.data) {
        return;
      }
      if (typeof event.data === 'string' && event.data.startsWith(':')) {
        return;
      }
      var parsedPayload;
      var eventKey;
      try {
        var payload = JSON.parse(event.data);
        var rawType = payload.type || event.type || '';
        eventKey = this.normalizeType(rawType);
        if (!eventKey) {
          console.warn('EventStream', 'Received payload without a recognizable type', payload);
          return;
        }
        if (payload.data !== undefined) {
          parsedPayload = payload.data;
        } else {
          var _unused = payload.type,
            rest = _objectWithoutPropertiesLoose(payload, _excluded);
          parsedPayload = rest;
        }
      } catch (error) {
        console.error('EventStream', 'Unable to parse SSE payload', error, event.data);
        return;
      }
      this.markActivity();
      this.emit(eventKey, parsedPayload);
    };
    _proto.scheduleReconnect = function scheduleReconnect() {
      var _this3 = this;
      this.reconnectionAttempts += 1;
      var labels = this.labelProvider();
      var seconds = this.currentRetryDelay / 1000;
      var shouldSignalDisconnected = this.reconnectionAttempts > MAX_QUICK_RECONNECTION_ATTEMPTS;
      var statusKey = shouldSignalDisconnected ? 'disconnected' : 'connecting';
      var defaultMessage = shouldSignalDisconnected ? labels.disconnected : labels.connecting;
      var message = (defaultMessage || statusKey) + " (" + seconds + "s)";
      this.setStatus(statusKey, {
        message: message
      });
      this.clearRetryTimer();
      this.retryTimeoutId = setTimeout(function () {
        _this3.connect();
      }, this.currentRetryDelay);
      if (this.reconnectionAttempts <= MAX_QUICK_RECONNECTION_ATTEMPTS) {
        this.currentRetryDelay = SHORT_RETRY_DELAY_MS;
      } else if (this.reconnectionAttempts <= MAX_QUICK_RECONNECTION_ATTEMPTS * 2) {
        this.currentRetryDelay = MEDIUM_RETRY_DELAY_MS;
      } else {
        this.currentRetryDelay = LONG_RETRY_DELAY_MS;
      }
    };
    _proto.setStatus = function setStatus(statusKey, _temp2) {
      var _ref2 = _temp2 === void 0 ? {} : _temp2,
        message = _ref2.message,
        detail = _ref2.detail;
      if (!statusKey) return;
      if (statusKey === this.lastStatus && !message && !detail) {
        return;
      }
      var labels = this.labelProvider();
      var resolvedMessage = message || labels[statusKey] || statusKey;
      if (statusKey === this.lastStatus && resolvedMessage === this.lastStatusMessage) {
        return;
      }
      this.lastStatus = statusKey;
      this.lastStatusMessage = resolvedMessage;
      this.emit('status', {
        status: statusKey,
        message: resolvedMessage,
        detail: detail
      });
    };
    _proto.ensureHeartbeatTimer = function ensureHeartbeatTimer() {
      var _this4 = this;
      if (this.heartbeatMs <= 0 || this.heartbeatTimerId) {
        return;
      }
      this.heartbeatTimerId = setInterval(function () {
        _this4.syncStatusWithReadyState();
      }, Math.max(2000, Math.floor(this.heartbeatMs / 2)));
    };
    _proto.clearRetryTimer = function clearRetryTimer() {
      if (this.retryTimeoutId) {
        clearTimeout(this.retryTimeoutId);
        this.retryTimeoutId = null;
      }
    };
    _proto.clearHeartbeatTimer = function clearHeartbeatTimer() {
      if (this.heartbeatTimerId) {
        clearInterval(this.heartbeatTimerId);
        this.heartbeatTimerId = null;
      }
    };
    _proto.closeSource = function closeSource() {
      if (!this.eventSource) return;
      try {
        this.eventSource.close();
      } catch (error) {
        console.warn('EventStream', 'Error while closing EventSource', error);
      }
      this.eventSource = null;
    };
    _proto.normalizeType = function normalizeType(type) {
      if (!type) return '';
      return String(type).toLowerCase().replace(/[^a-z0-9]+/g, '');
    };
    _proto.markActivity = function markActivity() {
      var _this$eventSource2;
      this.lastActivityAt = Date.now();
      if (((_this$eventSource2 = this.eventSource) == null ? void 0 : _this$eventSource2.readyState) === EventSource.OPEN) {
        this.setStatus('connected');
      }
    };
    _proto.syncStatusWithReadyState = function syncStatusWithReadyState() {
      if (!this.eventSource) {
        return;
      }
      var readyState = this.eventSource.readyState;
      if (readyState === EventSource.OPEN) {
        this.setStatus('connected');
        return;
      }
      if (readyState === EventSource.CONNECTING) {
        this.setStatus('connecting');
        return;
      }
      if (readyState === EventSource.CLOSED) {
        this.setStatus('disconnected');
        if (!this.retryTimeoutId) {
          this.scheduleReconnect();
        }
      }
    };
    return EventStream;
  }();

  var MAX_HISTORY_ITEMS_DISPLAY = 7;
  var MAX_SKIPPED_ITEMS_TO_DISPLAY = 4;
  var TTS_TIMEOUT_DURATION = 10000;
  var SignagePage = /*#__PURE__*/function () {
    function SignagePage() {
      var _this = this;
      this.handleAudioFileEnded = function (event) {
        var player = event.target;
        _this.removeAudioListeners(player);
        _this.isAudioFilePlaying = false;
        if (_this.currentProcessingEvent && player === _this.dom.chimeAudio && _this.currentProcessingEvent.type === 'call') {
          _this.currentProcessingEvent.chimeFinished = true;
        }
        _this.playNextAudioFileInSequence();
      };
      this.handleAudioFileError = function (event) {
        var player = event.target;
        console.error('SignageUI', 'Audio playback error', player == null ? void 0 : player.currentSrc, player == null ? void 0 : player.error);
        _this.removeAudioListeners(player);
        _this.isAudioFilePlaying = false;
        if (_this.currentProcessingEvent && player === _this.dom.chimeAudio && _this.currentProcessingEvent.type === 'call') {
          _this.currentProcessingEvent.chimeFinished = true;
        }
        _this.playNextAudioFileInSequence();
      };
      this.dom = this.queryDom();
      this.eventStream = new EventStream(SSE_URL, {
        labelProvider: getLabels
      });
      this.updateSseIndicator = createSseIndicatorUpdater(this.dom.sseStatusIndicator, {
        setDataset: true,
        keepClasses: true
      });
      this.orderedTtsLangCodes = [];
      this.eventQueue = [];
      this.currentProcessingEvent = null;
      this.audioPlaybackQueue = [];
      this.isAudioFilePlaying = false;
      this.bannerIntervalId = null;
      this.lastShownCallData = null;
      this.autoRefreshCancel = function () {};
      this.clock = this.createClock();
      window.SignageEventQueue = this.eventQueue;
      Object.defineProperty(window, 'SignageCurrentEvent', {
        configurable: true,
        enumerable: false,
        get: function get() {
          return _this.currentProcessingEvent;
        }
      });
    }
    var _proto = SignagePage.prototype;
    _proto.queryDom = function queryDom() {
      var byId = function byId(id) {
        return document.getElementById(id);
      };
      return {
        callIdElement: byId('current-call-id'),
        locationElement: byId('current-location'),
        listHistoryCalls: byId('list-history-calls'),
        listSkippedCalls: byId('list-skipped-calls'),
        announcementBannerContainer: byId('announcement-banner-container'),
        announcementPlaceholder: byId('announcement-placeholder'),
        chimeAudio: byId('chimeAudio'),
        announcementAudioPlayer: byId('announcement-audio-player'),
        ttsAudioPlayer: byId('tts-audio-player'),
        sseStatusIndicator: byId('sse-status-indicator'),
        dateElement: byId('date'),
        timeElement: byId('time')
      };
    };
    _proto.ensureRequiredElements = function ensureRequiredElements() {
      var required = {
        callIdElement: this.dom.callIdElement,
        locationElement: this.dom.locationElement,
        listHistoryCalls: this.dom.listHistoryCalls,
        listSkippedCalls: this.dom.listSkippedCalls,
        announcementBannerContainer: this.dom.announcementBannerContainer,
        chimeAudio: this.dom.chimeAudio,
        announcementAudioPlayer: this.dom.announcementAudioPlayer,
        ttsAudioPlayer: this.dom.ttsAudioPlayer
      };
      var missing = Object.entries(required).filter(function (_ref) {
        var value = _ref[1];
        return !value;
      }).map(function (_ref2) {
        var key = _ref2[0];
        return key;
      });
      if (missing.length > 0) {
        console.error('SignageUI', 'Missing required DOM elements:', missing.join(', '));
        return false;
      }
      return true;
    };
    _proto.init = /*#__PURE__*/function () {
      var _init = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
        var pageLanguage;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.n) {
            case 0:
              if (this.ensureRequiredElements()) {
                _context.n = 1;
                break;
              }
              return _context.a(2);
            case 1:
              pageLanguage = document.documentElement.lang || 'en';
              setCurrentLanguage(pageLanguage);
              this.updateStaticPlaceholders();
              this.setupAutoRefresh();
              this.attachEventStreamHandlers();
              _context.n = 2;
              return this.fetchOrderedLanguages();
            case 2:
              _context.n = 3;
              return this.fetchInitialState();
            case 3:
              this.clock.start();
            case 4:
              return _context.a(2);
          }
        }, _callee, this);
      }));
      function init() {
        return _init.apply(this, arguments);
      }
      return init;
    }();
    _proto.setupAutoRefresh = function setupAutoRefresh() {
      var _this2 = this;
      this.autoRefreshCancel = scheduleAutoRefresh({
        shouldDelay: function shouldDelay() {
          return _this2.shouldDelayRefresh();
        }
      });
      window.addEventListener('beforeunload', function () {
        _this2.autoRefreshCancel();
        _this2.clock.stop();
      });
    };
    _proto.attachEventStreamHandlers = function attachEventStreamHandlers() {
      var _this3 = this;
      this.eventStream.on('queueupdate', function (_ref3) {
        var detail = _ref3.detail;
        return _this3.handleQueueUpdate(detail);
      });
      this.eventStream.on('announcementstatus', function (_ref4) {
        var detail = _ref4.detail;
        return _this3.handleAnnouncementStatus(detail);
      });
      this.eventStream.on('ttscomplete', function (_ref5) {
        var detail = _ref5.detail;
        return _this3.handleTtsComplete(detail);
      });
      this.eventStream.on('status', function (_ref6) {
        var detail = _ref6.detail;
        return _this3.updateSseIndicator(detail);
      });
      this.eventStream.connect();
    };
    _proto.fetchOrderedLanguages = /*#__PURE__*/function () {
      var _fetchOrderedLanguages = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
        var response, _t;
        return _regenerator().w(function (_context2) {
          while (1) switch (_context2.p = _context2.n) {
            case 0:
              _context2.p = 0;
              _context2.n = 1;
              return fetch(API_BASE_URL + "/tts/ordered-languages");
            case 1:
              response = _context2.v;
              if (!response.ok) {
                _context2.n = 3;
                break;
              }
              _context2.n = 2;
              return response.json();
            case 2:
              this.orderedTtsLangCodes = _context2.v;
              _context2.n = 4;
              break;
            case 3:
              console.error('SignageUI', 'Failed to fetch ordered TTS languages', response.status, response.statusText);
              this.orderedTtsLangCodes = [];
            case 4:
              _context2.n = 6;
              break;
            case 5:
              _context2.p = 5;
              _t = _context2.v;
              console.error('SignageUI', 'Network error while fetching ordered TTS languages', _t);
              this.orderedTtsLangCodes = [];
            case 6:
              return _context2.a(2);
          }
        }, _callee2, this, [[0, 5]]);
      }));
      function fetchOrderedLanguages() {
        return _fetchOrderedLanguages.apply(this, arguments);
      }
      return fetchOrderedLanguages;
    }();
    _proto.fetchInitialState = /*#__PURE__*/function () {
      var _fetchInitialState = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3() {
        var _yield$Promise$allSet, queueRes, annRes, queueState, announcementStatus, _t2;
        return _regenerator().w(function (_context3) {
          while (1) switch (_context3.p = _context3.n) {
            case 0:
              _context3.p = 0;
              _context3.n = 1;
              return Promise.allSettled([fetch(API_BASE_URL + "/queue/state"), fetch(API_BASE_URL + "/announcements/status")]);
            case 1:
              _yield$Promise$allSet = _context3.v;
              queueRes = _yield$Promise$allSet[0];
              annRes = _yield$Promise$allSet[1];
              if (!(queueRes.status === 'fulfilled' && queueRes.value.ok)) {
                _context3.n = 3;
                break;
              }
              _context3.n = 2;
              return queueRes.value.json();
            case 2:
              queueState = _context3.v;
              this.updateQueueDisplay(queueState);
              if (queueState.current_call) {
                this.updateCurrentCallDisplay(queueState.current_call);
                this.lastShownCallData = _extends({}, queueState.current_call);
              } else {
                this.updateCurrentCallDisplay(null);
                this.lastShownCallData = null;
              }
              _context3.n = 4;
              break;
            case 3:
              console.error('SignageUI', 'Failed to fetch initial queue state');
              this.updateQueueDisplay(null);
              this.updateCurrentCallDisplay(null);
              this.lastShownCallData = null;
            case 4:
              if (!(annRes.status === 'fulfilled' && annRes.value.ok)) {
                _context3.n = 6;
                break;
              }
              _context3.n = 5;
              return annRes.value.json();
            case 5:
              announcementStatus = _context3.v;
              this.updateAnnouncementDisplay(announcementStatus);
              _context3.n = 7;
              break;
            case 6:
              console.error('SignageUI', 'Failed to fetch initial announcement status');
              this.updateAnnouncementDisplay(null);
            case 7:
              _context3.n = 9;
              break;
            case 8:
              _context3.p = 8;
              _t2 = _context3.v;
              console.error('SignageUI', 'Network error during initial state fetch', _t2);
              this.updateQueueDisplay(null);
              this.updateCurrentCallDisplay(null);
              this.updateAnnouncementDisplay(null);
              this.lastShownCallData = null;
            case 9:
              _context3.p = 9;
              this.processNextEventFromQueue();
              return _context3.f(9);
            case 10:
              return _context3.a(2);
          }
        }, _callee3, this, [[0, 8, 9, 10]]);
      }));
      function fetchInitialState() {
        return _fetchInitialState.apply(this, arguments);
      }
      return fetchInitialState;
    }();
    _proto.updateCurrentCallDisplay = function updateCurrentCallDisplay(callData) {
      var id = callData != null && callData.id ? sanitizeText(callData.id) : '----';
      var location = callData != null && callData.location ? sanitizeText(callData.location) : '----';
      if (this.dom.callIdElement) this.dom.callIdElement.textContent = id;
      if (this.dom.locationElement) this.dom.locationElement.textContent = location;
    };
    _proto.updateQueueDisplay = function updateQueueDisplay(queueState) {
      var labels = getLabels();
      renderCallList(this.dom.listHistoryCalls, queueState == null ? void 0 : queueState.completed_history, {
        maxItems: MAX_HISTORY_ITEMS_DISPLAY,
        placeholderText: labels.historyPlaceholder || '----',
        itemClass: 'history-item flex justify-between items-center',
        placeholderClass: 'history-item italic text-gray-500',
        timestampFormatter: formatDisplayTime,
        sanitizer: sanitizeText
      });
      renderCallList(this.dom.listSkippedCalls, queueState == null ? void 0 : queueState.skipped_history, {
        maxItems: MAX_SKIPPED_ITEMS_TO_DISPLAY,
        placeholderText: labels.skippedPlaceholder || '----',
        itemClass: 'history-item flex justify-between items-center',
        placeholderClass: 'history-item italic text-gray-500',
        highlightClass: 'text-yellow-400',
        timestampFormatter: formatDisplayTime,
        sanitizer: sanitizeText
      });
    };
    _proto.updateAnnouncementDisplay = function updateAnnouncementDisplay(announcementStatus) {
      var _this4 = this;
      var container = this.dom.announcementBannerContainer;
      if (!container) return;
      if (this.bannerIntervalId) {
        clearInterval(this.bannerIntervalId);
        this.bannerIntervalId = null;
      }
      var _this$ensureBannerPla = this.ensureBannerPlaceholder(),
        wrapper = _this$ensureBannerPla.wrapper,
        span = _this$ensureBannerPla.span;
      this.clearBannerContainer(wrapper);
      if (!announcementStatus || !Array.isArray(announcementStatus.current_banner_playlist) || announcementStatus.current_banner_playlist.length === 0) {
        if (wrapper && !container.contains(wrapper)) {
          container.appendChild(wrapper);
        }
        if (span) {
          span.textContent = getLabels().announcementPlaceholder || 'Announcements';
        }
        return;
      }
      if (wrapper) {
        wrapper.classList.add('hidden');
      }
      var banners = announcementStatus.current_banner_playlist.slice();
      var currentIndex = 0;
      var _displayBanner = function displayBanner() {
        if (banners.length === 0) return;
        var mediaUrl = banners[currentIndex];
        var extension = mediaUrl.split('.').pop().toLowerCase();
        _this4.clearBannerContainer(wrapper);
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
          var img = document.createElement('img');
          img.src = mediaUrl;
          img.alt = 'Announcement Banner';
          img.className = 'banner-media';
          container.appendChild(img);
        } else if (['mp4', 'webm', 'ogg', 'mov'].includes(extension)) {
          var video = document.createElement('video');
          video.src = mediaUrl;
          video.className = 'banner-media';
          video.autoplay = true;
          video.muted = true;
          video.playsInline = true;
          video.loop = banners.length === 1;
          if (banners.length > 1) {
            video.onended = function () {
              currentIndex = (currentIndex + 1) % banners.length;
              _displayBanner();
            };
          }
          container.appendChild(video);
          video.play().catch(function (error) {
            return console.error('SignageUI', 'Error playing banner video', mediaUrl, error);
          });
        } else {
          console.warn('SignageUI', 'Unsupported banner media type', mediaUrl);
          if (wrapper && !container.contains(wrapper)) {
            container.appendChild(wrapper);
          }
        }
      };
      _displayBanner();
      if (banners.length > 1) {
        var isImagePlaylist = banners.every(function (url) {
          var ext = url.split('.').pop().toLowerCase();
          return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
        });
        if (isImagePlaylist) {
          var cycleMs = (announcementStatus.banner_cycle_interval_seconds || 10) * 1000;
          this.bannerIntervalId = setInterval(function () {
            currentIndex = (currentIndex + 1) % banners.length;
            _displayBanner();
          }, cycleMs);
        }
      }
    };
    _proto.ensureBannerPlaceholder = function ensureBannerPlaceholder() {
      var container = this.dom.announcementBannerContainer;
      var placeholder = this.dom.announcementPlaceholder;
      if (!placeholder || !placeholder.parentElement) {
        var wrapper = document.createElement('div');
        wrapper.className = 'w-full h-full flex justify-center items-center bg-gray-750 rounded';
        placeholder = document.createElement('span');
        placeholder.id = 'announcement-placeholder';
        placeholder.className = 'text-gray-500 text-sm md:text-base';
        placeholder.textContent = getLabels().announcementPlaceholder || 'Announcements';
        wrapper.appendChild(placeholder);
        if (container) {
          container.appendChild(wrapper);
        }
        this.dom.announcementPlaceholder = placeholder;
        return {
          wrapper: wrapper,
          span: placeholder
        };
      }
      return {
        wrapper: placeholder.parentElement,
        span: placeholder
      };
    };
    _proto.clearBannerContainer = function clearBannerContainer(placeholderWrapper) {
      if (placeholderWrapper === void 0) {
        placeholderWrapper = null;
      }
      var container = this.dom.announcementBannerContainer;
      if (!container) return;
      Array.from(container.children).forEach(function (child) {
        if (!placeholderWrapper || child !== placeholderWrapper) {
          container.removeChild(child);
        }
      });
    };
    _proto.handleQueueUpdate = function handleQueueUpdate(queueState) {
      this.updateQueueDisplay(queueState);
      var newCall = queueState == null ? void 0 : queueState.current_call;
      if (newCall) {
        var _this$currentProcessi;
        var shouldQueue = true;
        if (((_this$currentProcessi = this.currentProcessingEvent) == null ? void 0 : _this$currentProcessi.type) === 'call' && this.currentProcessingEvent.id === newCall.id && this.currentProcessingEvent.location === newCall.location) {
          shouldQueue = false;
        }
        if (shouldQueue && this.eventQueue.some(function (evt) {
          return evt.type === 'call' && evt.id === newCall.id && evt.location === newCall.location;
        })) {
          shouldQueue = false;
        }
        if (shouldQueue) {
          var callEvent = {
            type: 'call',
            id: newCall.id,
            location: newCall.location,
            callData: _extends({}, newCall),
            requiredTts: Array.isArray(this.orderedTtsLangCodes) && this.orderedTtsLangCodes.length > 0 ? [].concat(this.orderedTtsLangCodes) : [],
            receivedTtsUrls: [],
            chimeFinished: false,
            ttsReady: false,
            timestamp: new Date().toISOString()
          };
          this.eventQueue.push(callEvent);
          this.processNextEventFromQueue();
        }
      } else if (!this.currentProcessingEvent && this.eventQueue.length === 0) {
        this.processNextEventFromQueue();
      }
    };
    _proto.handleAnnouncementStatus = function handleAnnouncementStatus(announcementStatus) {
      var _this$currentProcessi2;
      this.updateAnnouncementDisplay(announcementStatus);
      var playlist = (announcementStatus == null ? void 0 : announcementStatus.current_audio_playlist) || [];
      if (playlist.length === 0) {
        return;
      }
      var primarySrc = playlist[0];
      var shouldQueue = true;
      if (((_this$currentProcessi2 = this.currentProcessingEvent) == null ? void 0 : _this$currentProcessi2.type) === 'announcement' && this.currentProcessingEvent.audioSequence.some(function (item) {
        return item.src === primarySrc;
      })) {
        shouldQueue = false;
      }
      if (shouldQueue && this.eventQueue.some(function (evt) {
        return evt.type === 'announcement' && evt.audioSequence.some(function (item) {
          return item.src === primarySrc;
        });
      })) {
        shouldQueue = false;
      }
      if (!shouldQueue) {
        return;
      }
      var announcementEvent = {
        type: 'announcement',
        audioSequence: playlist.map(function (src) {
          return {
            src: src,
            playerType: 'announcement'
          };
        })
      };
      this.eventQueue.push(announcementEvent);
      this.processNextEventFromQueue();
    };
    _proto.handleTtsComplete = function handleTtsComplete(ttsData) {
      var _this$currentProcessi3,
        _this5 = this;
      if (!ttsData || !ttsData.id || !ttsData.location || !Array.isArray(ttsData.audio_urls)) {
        console.warn('SignageUI', 'Invalid TTS payload received', ttsData);
        return;
      }
      var targetEvent = null;
      if (((_this$currentProcessi3 = this.currentProcessingEvent) == null ? void 0 : _this$currentProcessi3.type) === 'call' && this.currentProcessingEvent.id === ttsData.id && this.currentProcessingEvent.location === ttsData.location) {
        targetEvent = this.currentProcessingEvent;
      } else {
        targetEvent = this.eventQueue.find(function (evt) {
          return evt.type === 'call' && evt.id === ttsData.id && evt.location === ttsData.location;
        });
      }
      if (!targetEvent) {
        console.warn('SignageUI', 'TTS payload does not match any queued call', ttsData);
        return;
      }
      if (!Array.isArray(targetEvent.requiredTts) || targetEvent.requiredTts.length === 0) {
        targetEvent.requiredTts = [];
      }
      if (!Array.isArray(targetEvent.receivedTtsUrls)) {
        targetEvent.receivedTtsUrls = [];
      }
      var langIndex = targetEvent.requiredTts.indexOf(ttsData.lang);
      if (langIndex !== -1) {
        targetEvent.requiredTts.splice(langIndex, 1);
      }
      if (targetEvent.receivedTtsUrls.length === 0) {
        targetEvent.receivedTtsUrls = [].concat(ttsData.audio_urls);
      }
      var allTtsAvailable = targetEvent.requiredTts.length === 0 || targetEvent.receivedTtsUrls.length > 0;
      if (allTtsAvailable && !targetEvent.ttsReady) {
        targetEvent.ttsReady = true;
        if (targetEvent.ttsWaitTimeoutId) {
          clearTimeout(targetEvent.ttsWaitTimeoutId);
          targetEvent.ttsWaitTimeoutId = null;
        }
        if (this.currentProcessingEvent === targetEvent) {
          var newItems = targetEvent.receivedTtsUrls.filter(function (url) {
            return url && !_this5.audioPlaybackQueue.some(function (item) {
              return item.src === url && item.playerType === 'tts';
            });
          }).map(function (url) {
            return {
              src: url,
              playerType: 'tts'
            };
          });
          if (newItems.length > 0) {
            var chimeIdx = this.audioPlaybackQueue.findIndex(function (item) {
              return item.playerType === 'chime';
            });
            if (chimeIdx !== -1 && !targetEvent.chimeFinished) {
              var _this$audioPlaybackQu;
              (_this$audioPlaybackQu = this.audioPlaybackQueue).splice.apply(_this$audioPlaybackQu, [chimeIdx + 1, 0].concat(newItems));
            } else {
              var _this$audioPlaybackQu2;
              (_this$audioPlaybackQu2 = this.audioPlaybackQueue).push.apply(_this$audioPlaybackQu2, newItems);
            }
          }
          if (targetEvent.chimeFinished && !this.isAudioFilePlaying) {
            this.playNextAudioFileInSequence();
          }
        }
      }
    };
    _proto.processNextEventFromQueue = function processNextEventFromQueue() {
      var _this6 = this;
      if (this.currentProcessingEvent || this.isAudioFilePlaying) {
        return;
      }
      if (this.eventQueue.length === 0) {
        if (!this.lastShownCallData) {
          this.updateCurrentCallDisplay(null);
        } else {
          this.updateCurrentCallDisplay(this.lastShownCallData);
        }
        return;
      }
      this.currentProcessingEvent = this.eventQueue.shift();
      this.audioPlaybackQueue = [];
      this.isAudioFilePlaying = false;
      if (this.currentProcessingEvent.type === 'call') {
        var _this$dom$chimeAudio;
        this.updateCurrentCallDisplay(this.currentProcessingEvent.callData);
        this.lastShownCallData = _extends({}, this.currentProcessingEvent.callData);
        if ((_this$dom$chimeAudio = this.dom.chimeAudio) != null && _this$dom$chimeAudio.src) {
          this.audioPlaybackQueue.push({
            src: this.dom.chimeAudio.src,
            playerType: 'chime'
          });
        }
        this.currentProcessingEvent.chimeFinished = false;
        if (this.currentProcessingEvent.ttsReady && Array.isArray(this.currentProcessingEvent.receivedTtsUrls)) {
          this.currentProcessingEvent.receivedTtsUrls.forEach(function (url) {
            if (url) _this6.audioPlaybackQueue.push({
              src: url,
              playerType: 'tts'
            });
          });
        }
      } else if (this.currentProcessingEvent.type === 'announcement') {
        var _this$dom$chimeAudio2;
        if (this.lastShownCallData) {
          this.updateCurrentCallDisplay(this.lastShownCallData);
        }
        if ((_this$dom$chimeAudio2 = this.dom.chimeAudio) != null && _this$dom$chimeAudio2.src) {
          var _this$currentProcessi4;
          var alreadyHasChime = (_this$currentProcessi4 = this.currentProcessingEvent.audioSequence) == null ? void 0 : _this$currentProcessi4.some(function (item) {
            return item.playerType === 'chime' || item.src === _this6.dom.chimeAudio.src;
          });
          if (!alreadyHasChime) {
            this.audioPlaybackQueue.push({
              src: this.dom.chimeAudio.src,
              playerType: 'chime'
            });
          }
        }
        this.currentProcessingEvent.audioSequence.forEach(function (item) {
          return _this6.audioPlaybackQueue.push(_extends({}, item));
        });
      }
      if (this.audioPlaybackQueue.length > 0) {
        this.playNextAudioFileInSequence();
      } else {
        this.finishCurrentEvent();
      }
    };
    _proto.playNextAudioFileInSequence = function playNextAudioFileInSequence() {
      var _this7 = this;
      if (this.audioPlaybackQueue.length === 0) {
        var _this$currentProcessi5;
        this.isAudioFilePlaying = false;
        if (((_this$currentProcessi5 = this.currentProcessingEvent) == null ? void 0 : _this$currentProcessi5.type) === 'call') {
          var current = this.currentProcessingEvent;
          if (!current.chimeFinished) {
            return;
          }
          if (Array.isArray(current.requiredTts) && current.requiredTts.length > 0 && !current.ttsReady) {
            if (!current.ttsWaitTimeoutId) {
              current.ttsWaitTimeoutId = setTimeout(function () {
                if (_this7.currentProcessingEvent === current && !current.ttsReady) {
                  console.warn('SignageUI', 'TTS timed out for call', current.id, current.location);
                  current.requiredTts = [];
                  current.ttsReady = true;
                  current.ttsWaitTimeoutId = null;
                  _this7.playNextAudioFileInSequence();
                }
              }, TTS_TIMEOUT_DURATION);
            }
            return;
          }
        }
        this.finishCurrentEvent();
        return;
      }
      var nextItem = this.audioPlaybackQueue.shift();
      var player = this.getAudioPlayerForType(nextItem.playerType);
      if (!player || !nextItem.src) {
        console.warn('SignageUI', 'Missing audio player or source for item', nextItem);
        this.playNextAudioFileInSequence();
        return;
      }
      this.isAudioFilePlaying = true;
      player.pause();
      player.currentTime = 0;
      player.src = nextItem.src;
      if (typeof player.load === 'function') {
        player.load();
      }
      if ('playbackRate' in player) {
        player.playbackRate = nextItem.playerType === 'chime' ? 1 : 1.1;
      }
      this.attachAudioListeners(player);
      var markChimeAsPlaying = function markChimeAsPlaying() {
        if (nextItem.playerType === 'chime' && _this7.currentProcessingEvent) {
          _this7.currentProcessingEvent.chimeFinished = false;
        }
      };
      var playResult;
      try {
        playResult = player.play();
      } catch (error) {
        console.error('SignageUI', 'Error during audio playback', nextItem, error);
        this.handleAudioFileError({
          target: player
        });
        return;
      }
      if (playResult && typeof playResult.then === 'function') {
        playResult.then(function () {
          markChimeAsPlaying();
        }).catch(function (error) {
          console.error('SignageUI', 'Error during audio playback', nextItem, error);
          _this7.handleAudioFileError({
            target: player
          });
        });
      } else {
        markChimeAsPlaying();
      }
    };
    _proto.attachAudioListeners = function attachAudioListeners(player) {
      if (!player) return;
      player.addEventListener('ended', this.handleAudioFileEnded);
      player.addEventListener('error', this.handleAudioFileError);
    };
    _proto.removeAudioListeners = function removeAudioListeners(player) {
      if (!player) return;
      player.removeEventListener('ended', this.handleAudioFileEnded);
      player.removeEventListener('error', this.handleAudioFileError);
    };
    _proto.finishCurrentEvent = function finishCurrentEvent() {
      var _this$currentProcessi6;
      if ((_this$currentProcessi6 = this.currentProcessingEvent) != null && _this$currentProcessi6.ttsWaitTimeoutId) {
        clearTimeout(this.currentProcessingEvent.ttsWaitTimeoutId);
        this.currentProcessingEvent.ttsWaitTimeoutId = null;
      }
      this.currentProcessingEvent = null;
      this.audioPlaybackQueue = [];
      this.isAudioFilePlaying = false;
      this.processNextEventFromQueue();
    };
    _proto.getAudioPlayerForType = function getAudioPlayerForType(type) {
      if (type === 'chime') return this.dom.chimeAudio;
      if (type === 'tts') return this.dom.ttsAudioPlayer;
      return this.dom.announcementAudioPlayer;
    };
    _proto.updateStaticPlaceholders = function updateStaticPlaceholders() {
      var _this$dom$listHistory, _this$dom$listSkipped;
      var labels = getLabels();
      var historyLi = (_this$dom$listHistory = this.dom.listHistoryCalls) == null ? void 0 : _this$dom$listHistory.querySelector('.italic');
      if (historyLi && this.dom.listHistoryCalls.children.length <= 1) {
        historyLi.textContent = labels.historyPlaceholder || 'Waiting for calls...';
      }
      var skippedLi = (_this$dom$listSkipped = this.dom.listSkippedCalls) == null ? void 0 : _this$dom$listSkipped.querySelector('.italic');
      if (skippedLi && this.dom.listSkippedCalls.children.length <= 1) {
        skippedLi.textContent = labels.skippedPlaceholder || 'No skipped calls.';
      }
      if (this.dom.announcementPlaceholder) {
        this.dom.announcementPlaceholder.textContent = labels.announcementPlaceholder || 'Announcements';
      }
    };
    _proto.shouldDelayRefresh = function shouldDelayRefresh() {
      var audioPlayers = [this.dom.chimeAudio, this.dom.announcementAudioPlayer, this.dom.ttsAudioPlayer];
      var audioPlaying = audioPlayers.some(function (player) {
        return player && !player.paused && !player.ended && player.currentTime > 0;
      });
      return audioPlaying || Boolean(this.currentProcessingEvent) || this.eventQueue.length > 0;
    };
    _proto.createClock = function createClock() {
      var _this8 = this;
      var clockIntervalId = null;
      var toggleIntervalId = null;
      var useBuddhistYear = false;
      var renderClock = function renderClock() {
        var now = new Date();
        var day = String(now.getDate()).padStart(2, '0');
        var month = String(now.getMonth() + 1).padStart(2, '0');
        var hours = String(now.getHours()).padStart(2, '0');
        var minutes = String(now.getMinutes()).padStart(2, '0');
        var seconds = String(now.getSeconds()).padStart(2, '0');
        var year = now.getFullYear();
        if (useBuddhistYear) {
          year += 543;
        }
        if (_this8.dom.timeElement) {
          _this8.dom.timeElement.textContent = hours + ":" + minutes + ":" + seconds;
        }
        if (_this8.dom.dateElement) {
          _this8.dom.dateElement.textContent = day + "-" + month + "-" + year;
        }
      };
      return {
        start: function start() {
          if (clockIntervalId || toggleIntervalId) return;
          renderClock();
          clockIntervalId = setInterval(renderClock, 1000);
          toggleIntervalId = setInterval(function () {
            useBuddhistYear = !useBuddhistYear;
            renderClock();
          }, 30000);
        },
        stop: function stop() {
          if (clockIntervalId) {
            clearInterval(clockIntervalId);
            clockIntervalId = null;
          }
          if (toggleIntervalId) {
            clearInterval(toggleIntervalId);
            toggleIntervalId = null;
          }
        }
      };
    };
    return SignagePage;
  }();
  document.addEventListener('DOMContentLoaded', function () {
    var page = new SignagePage();
    page.init();
  });

})();
//# sourceMappingURL=signage.legacy.js.map
