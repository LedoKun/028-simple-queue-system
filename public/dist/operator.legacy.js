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
    if (UI_TEXT[lang]) {
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

  function createFeedbackController(_temp) {
    var _ref = _temp === void 0 ? {} : _temp,
      _ref$elementId = _ref.elementId,
      elementId = _ref$elementId === void 0 ? 'feedback-area' : _ref$elementId,
      _ref$root = _ref.root,
      root = _ref$root === void 0 ? document : _ref$root;
    var dismissTimeoutId = null;
    var fadeTimeoutId = null;
    var lastMessage = '';
    var resolveElement = function resolveElement() {
      if (elementId instanceof HTMLElement) {
        return elementId;
      }
      return root.getElementById(elementId);
    };
    var resetTimers = function resetTimers() {
      if (dismissTimeoutId) {
        clearTimeout(dismissTimeoutId);
        dismissTimeoutId = null;
      }
      if (fadeTimeoutId) {
        clearTimeout(fadeTimeoutId);
        fadeTimeoutId = null;
      }
    };
    var applyTypeClasses = function applyTypeClasses(element, type) {
      var baseClasses = 'mb-4 p-3 rounded-md text-sm transition-opacity duration-300 ease-in-out';
      var typeMap = {
        success: 'bg-green-600 text-white',
        warning: 'bg-yellow-500 text-black',
        error: 'bg-red-600 text-white',
        info: 'bg-blue-600 text-white'
      };
      element.className = baseClasses + " " + (typeMap[type] || typeMap.info);
    };
    var show = function show(message, _temp2) {
      var _ref2 = _temp2 === void 0 ? {} : _temp2,
        _ref2$type = _ref2.type,
        type = _ref2$type === void 0 ? 'info' : _ref2$type,
        _ref2$duration = _ref2.duration,
        duration = _ref2$duration === void 0 ? 4000 : _ref2$duration;
      var element = resolveElement();
      if (!element) {
        console.warn('FEEDBACK', 'Attempted to show feedback but element not found.');
        return;
      }
      resetTimers();
      lastMessage = message;
      element.textContent = message;
      applyTypeClasses(element, String(type).toLowerCase());
      element.classList.remove('hidden', 'opacity-0');
      void element.offsetWidth; // enforce reflow for transitions
      element.classList.add('opacity-100');
      if (duration > 0) {
        dismissTimeoutId = setTimeout(function () {
          element.classList.remove('opacity-100');
          element.classList.add('opacity-0');
          fadeTimeoutId = setTimeout(function () {
            if (element.textContent === lastMessage) {
              element.classList.add('hidden');
              element.textContent = '';
            }
          }, 300);
        }, duration);
      }
    };
    var clear = function clear() {
      var element = resolveElement();
      if (!element) return;
      resetTimers();
      element.classList.remove('opacity-100');
      element.classList.add('opacity-0');
      fadeTimeoutId = setTimeout(function () {
        element.classList.add('hidden');
        element.textContent = '';
      }, 300);
    };
    return {
      show: show,
      clear: clear
    };
  }

  var JSON_CONTENT_TYPE = 'application/json';
  var QueueApiClient = /*#__PURE__*/function () {
    function QueueApiClient(_temp) {
      var _ref = _temp === void 0 ? {} : _temp,
        _ref$baseUrl = _ref.baseUrl,
        baseUrl = _ref$baseUrl === void 0 ? '/api' : _ref$baseUrl,
        _ref$feedback = _ref.feedback,
        feedback = _ref$feedback === void 0 ? null : _ref$feedback;
      this.baseUrl = baseUrl.replace(/\/$/, '');
      this.feedback = feedback;
    }
    var _proto = QueueApiClient.prototype;
    _proto.request = /*#__PURE__*/function () {
      var _request = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(endpoint, options) {
        var _options$showProgress, _this$feedback;
        var method, shouldShowProgress, headers, hasBody, config, _this$feedback2, response, payload, _this$feedback3, _this$feedback4, _t;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.p = _context.n) {
            case 0:
              if (options === void 0) {
                options = {};
              }
              method = (options.method || 'GET').toUpperCase();
              shouldShowProgress = (_options$showProgress = options.showProgress) != null ? _options$showProgress : method !== 'GET';
              headers = _extends({}, options.headers || {});
              hasBody = options.body !== undefined && options.body !== null;
              if (hasBody && !headers['Content-Type']) {
                headers['Content-Type'] = JSON_CONTENT_TYPE;
              }
              config = {
                method: method,
                headers: headers
              };
              if (hasBody) {
                config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
              }
              if (shouldShowProgress && (_this$feedback = this.feedback) != null && _this$feedback.show) {
                this.feedback.show('Processing...', {
                  type: 'info',
                  duration: 0
                });
              }
              _context.p = 1;
              _context.n = 2;
              return fetch("" + this.baseUrl + endpoint, config);
            case 2:
              response = _context.v;
              _context.n = 3;
              return this.parseResponse(response);
            case 3:
              payload = _context.v;
              if (shouldShowProgress && (_this$feedback2 = this.feedback) != null && _this$feedback2.clear) {
                this.feedback.clear();
              }
              if (response.ok) {
                _context.n = 4;
                break;
              }
              this.handleError(response, payload);
              return _context.a(2, null);
            case 4:
              return _context.a(2, payload);
            case 5:
              _context.p = 5;
              _t = _context.v;
              if (shouldShowProgress && (_this$feedback3 = this.feedback) != null && _this$feedback3.clear) {
                this.feedback.clear();
              }
              console.error('API_CLIENT', "Request to " + endpoint + " failed", _t);
              (_this$feedback4 = this.feedback) == null || _this$feedback4.show == null || _this$feedback4.show("Network error: " + (_t.message || 'Unable to reach server.'), {
                type: 'error'
              });
              return _context.a(2, null);
          }
        }, _callee, this, [[1, 5]]);
      }));
      function request(_x, _x2) {
        return _request.apply(this, arguments);
      }
      return request;
    }();
    _proto.parseResponse = /*#__PURE__*/function () {
      var _parseResponse = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(response) {
        var text, contentType, _t2;
        return _regenerator().w(function (_context2) {
          while (1) switch (_context2.p = _context2.n) {
            case 0:
              if (!(response.status === 204)) {
                _context2.n = 1;
                break;
              }
              return _context2.a(2, {
                success: true,
                status: 204
              });
            case 1:
              _context2.n = 2;
              return response.text();
            case 2:
              text = _context2.v;
              if (text) {
                _context2.n = 3;
                break;
              }
              return _context2.a(2, {
                success: response.ok,
                status: response.status
              });
            case 3:
              contentType = response.headers.get('content-type') || '';
              if (!contentType.includes(JSON_CONTENT_TYPE)) {
                _context2.n = 6;
                break;
              }
              _context2.p = 4;
              return _context2.a(2, JSON.parse(text));
            case 5:
              _context2.p = 5;
              _t2 = _context2.v;
              console.warn('API_CLIENT', 'Failed to parse JSON response', _t2, text);
              return _context2.a(2, text);
            case 6:
              if (!(response.status === 202)) {
                _context2.n = 7;
                break;
              }
              return _context2.a(2, {
                success: response.ok,
                status: response.status,
                message: text
              });
            case 7:
              return _context2.a(2, text);
          }
        }, _callee2, null, [[4, 5]]);
      }));
      function parseResponse(_x3) {
        return _parseResponse.apply(this, arguments);
      }
      return parseResponse;
    }();
    _proto.handleError = function handleError(response, payload) {
      var _this$feedback5;
      var message = this.extractErrorMessage(payload, response);
      console.error('API_CLIENT', "Error " + response.status + " \u2192 " + message);
      (_this$feedback5 = this.feedback) == null || _this$feedback5.show == null || _this$feedback5.show("Error " + response.status + ": " + message, {
        type: 'error'
      });
    };
    _proto.extractErrorMessage = function extractErrorMessage(payload, response) {
      if (payload == null) {
        return response.statusText || "Request failed with status " + response.status;
      }
      if (typeof payload === 'string') {
        return payload;
      }
      if (typeof payload === 'object') {
        return payload.error || payload.message || JSON.stringify(payload);
      }
      return response.statusText || "Request failed with status " + response.status;
    };
    _proto.get = function get(endpoint, options) {
      var _options$showProgress2;
      if (options === void 0) {
        options = {};
      }
      return this.request(endpoint, _extends({}, options, {
        method: 'GET',
        showProgress: (_options$showProgress2 = options.showProgress) != null ? _options$showProgress2 : false
      }));
    };
    _proto.post = function post(endpoint, body, options) {
      var _options$showProgress3;
      if (options === void 0) {
        options = {};
      }
      return this.request(endpoint, _extends({}, options, {
        method: 'POST',
        body: body,
        showProgress: (_options$showProgress3 = options.showProgress) != null ? _options$showProgress3 : true
      }));
    };
    _proto.addCall = function addCall(callData) {
      return this.post('/queue/add', callData);
    };
    _proto.skipCall = function skipCall() {
      return this.post('/queue/skip');
    };
    _proto.getQueueState = function getQueueState() {
      return this.get('/queue/state');
    };
    _proto.completeCurrentCall = function completeCurrentCall() {
      return this.post('/queue/complete');
    };
    _proto.forceSkipNewCall = function forceSkipNewCall(callData) {
      return this.post('/queue/force_skip', callData);
    };
    _proto.nextAnnouncement = function nextAnnouncement() {
      return this.post('/announcements/next');
    };
    _proto.triggerAnnouncement = function triggerAnnouncement(slotId) {
      var encoded = encodeURIComponent(slotId);
      return this.post("/announcements/trigger/" + encoded);
    };
    _proto.getAnnouncementStatus = function getAnnouncementStatus() {
      return this.get('/announcements/status');
    };
    return QueueApiClient;
  }();

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

  var CALL_IDENTIFIER_REGEX = /^[A-Z][0-9]+$/;
  var CALL_LOCATION_REGEX = /^[0-9]+$/;
  function isValidCallIdentifier(value) {
    return CALL_IDENTIFIER_REGEX.test(String(value || '').trim());
  }
  function isValidCallLocation(value) {
    return CALL_LOCATION_REGEX.test(String(value || '').trim());
  }
  var Validation = Object.freeze({
    CALL_IDENTIFIER_REGEX: CALL_IDENTIFIER_REGEX,
    CALL_LOCATION_REGEX: CALL_LOCATION_REGEX,
    isValidCallIdentifier: isValidCallIdentifier,
    isValidCallLocation: isValidCallLocation
  });
  if (typeof window !== 'undefined') {
    window.Validation = Validation;
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

  var MAX_LIST_ITEMS_OPERATOR = 7;
  var OPERATOR_STATION_STORAGE_KEY = 'operator_station_number';
  var OperatorPage = /*#__PURE__*/function () {
    function OperatorPage() {
      var _this$dom$sseStatusIn;
      this.dom = this.queryDom();
      this.feedback = createFeedbackController({
        elementId: this.dom.feedbackArea
      });
      this.apiClient = new QueueApiClient({
        baseUrl: API_BASE_URL,
        feedback: this.feedback
      });
      this.eventStream = new EventStream(SSE_URL, {
        labelProvider: getLabels
      });
      this.cooldownIntervalId = null;
      this.lastAnnouncementStatus = null;
      this.autoRefreshCleanup = function () {};
      this.renderHistoryList = function (container, items, options) {
        if (options === void 0) {
          options = {};
        }
        renderCallList(container, items, _extends({
          sanitizer: sanitizeText,
          timestampFormatter: formatDisplayTime
        }, options));
      };
      this.updateSseIndicator = createSseIndicatorUpdater(this.dom.sseStatusIndicator, {
        statusClassMap: {
          connecting: 'bg-yellow-500',
          connected: 'bg-green-500',
          disconnected: 'bg-red-500',
          unsupported: 'bg-gray-600',
          default: 'bg-gray-600'
        },
        baseClass: ((_this$dom$sseStatusIn = this.dom.sseStatusIndicator) == null ? void 0 : _this$dom$sseStatusIn.className) || ''
      });
    }
    var _proto = OperatorPage.prototype;
    _proto.queryDom = function queryDom() {
      var byId = function byId(id) {
        return document.getElementById(id);
      };
      return {
        callForm: byId('call-form'),
        originalIdInput: byId('call-original-id'),
        locationInput: byId('call-location'),
        btnCall: byId('btn-call'),
        btnSkip: byId('btn-skip'),
        statusCurrentCallId: byId('status-current-call-id'),
        statusCurrentCallLocation: byId('status-current-call-location'),
        listHistoryCalls: byId('list-history-calls'),
        listSkippedCalls: byId('list-skipped-calls'),
        statusAnnouncementSlot: byId('status-announcement-slot'),
        statusAnnouncementCooldown: byId('status-announcement-cooldown'),
        statusAnnouncementCooldownTimer: byId('status-announcement-cooldown-timer'),
        btnNextAnnouncement: byId('btn-next-announcement'),
        announcementSlotList: byId('announcement-slot-list'),
        sseStatusIndicator: byId('sse-status-indicator'),
        feedbackArea: byId('feedback-area')
      };
    };
    _proto.ensureRequiredElements = function ensureRequiredElements() {
      var required = {
        callForm: this.dom.callForm,
        originalIdInput: this.dom.originalIdInput,
        locationInput: this.dom.locationInput,
        btnCall: this.dom.btnCall,
        btnSkip: this.dom.btnSkip,
        listHistoryCalls: this.dom.listHistoryCalls,
        listSkippedCalls: this.dom.listSkippedCalls,
        statusCurrentCallId: this.dom.statusCurrentCallId,
        statusCurrentCallLocation: this.dom.statusCurrentCallLocation
      };
      var missing = Object.entries(required).filter(function (_ref) {
        var value = _ref[1];
        return !value;
      }).map(function (_ref2) {
        var key = _ref2[0];
        return key;
      });
      if (missing.length > 0) {
        console.error('OperatorUI', 'Missing required DOM elements:', missing.join(', '));
        if (this.dom.btnCall) this.dom.btnCall.disabled = true;
        if (this.dom.btnSkip) this.dom.btnSkip.disabled = true;
        if (this.dom.btnNextAnnouncement) this.dom.btnNextAnnouncement.disabled = true;
        return false;
      }
      return true;
    };
    _proto.init = function init() {
      if (!this.ensureRequiredElements()) {
        return;
      }
      setCurrentLanguage('en');
      this.setupAutoRefresh();
      this.restoreOperatorStationValue();
      this.setupInputGuards();
      this.attachEventHandlers();
      this.attachEventStreamHandlers();
      this.fetchInitialState();
      this.validateInputs();
      if (this.dom.originalIdInput) {
        this.dom.originalIdInput.focus();
      }
    };
    _proto.setupAutoRefresh = function setupAutoRefresh() {
      var _this = this;
      this.autoRefreshCleanup = scheduleAutoRefresh({
        shouldDelay: function shouldDelay() {
          return false;
        },
        onBeforeRefresh: function onBeforeRefresh() {
          return _this.persistOperatorStationValue();
        }
      });
      window.addEventListener('beforeunload', function () {
        _this.persistOperatorStationValue();
        _this.autoRefreshCleanup();
      });
    };
    _proto.setupInputGuards = function setupInputGuards() {
      var _this2 = this;
      var _this$dom = this.dom,
        originalIdInput = _this$dom.originalIdInput,
        locationInput = _this$dom.locationInput;
      if (originalIdInput) {
        originalIdInput.addEventListener('input', function (event) {
          var target = event.target;
          var selectionStart = target.selectionStart;
          var selectionEnd = target.selectionEnd;
          var rawValue = String(target.value || '');
          var cleaned = '';
          if (rawValue.length > 0) {
            var firstChar = rawValue.charAt(0).toUpperCase();
            if (/^[A-Z]$/.test(firstChar)) {
              cleaned += firstChar;
            }
            if (rawValue.length > 1) {
              cleaned += rawValue.substring(1).replace(/[^0-9]/g, '');
            }
          }
          target.value = cleaned;
          target.setSelectionRange(selectionStart, selectionEnd);
          _this2.validateInputs();
        });
      }
      if (locationInput) {
        locationInput.addEventListener('input', function (event) {
          var target = event.target;
          var selectionStart = target.selectionStart;
          var selectionEnd = target.selectionEnd;
          target.value = String(target.value || '').replace(/[^0-9]/g, '');
          target.setSelectionRange(selectionStart, selectionEnd);
          _this2.validateInputs();
          _this2.persistOperatorStationValue();
        });
      }
    };
    _proto.attachEventHandlers = function attachEventHandlers() {
      var _this3 = this;
      var _this$dom2 = this.dom,
        callForm = _this$dom2.callForm,
        btnSkip = _this$dom2.btnSkip,
        btnNextAnnouncement = _this$dom2.btnNextAnnouncement,
        originalIdInput = _this$dom2.originalIdInput,
        locationInput = _this$dom2.locationInput;
      if (callForm) {
        callForm.addEventListener('submit', function (event) {
          return _this3.handleCallFormSubmit(event);
        });
      }
      if (btnSkip) {
        btnSkip.addEventListener('click', function (event) {
          return _this3.handleForceSkipCall(event);
        });
      }
      if (btnNextAnnouncement) {
        btnNextAnnouncement.addEventListener('click', function () {
          return _this3.handleNextAnnouncement();
        });
      }
      if (originalIdInput) {
        originalIdInput.addEventListener('blur', function () {
          return _this3.validateInputs();
        });
      }
      if (locationInput) {
        locationInput.addEventListener('blur', function () {
          return _this3.validateInputs();
        });
      }
    };
    _proto.attachEventStreamHandlers = function attachEventStreamHandlers() {
      var _this4 = this;
      this.eventStream.on('queueupdate', function (_ref3) {
        var detail = _ref3.detail;
        _this4.updateQueueStatusDisplay(detail);
      });
      this.eventStream.on('announcementstatus', function (_ref4) {
        var detail = _ref4.detail;
        _this4.updateAnnouncementStatusDisplay(detail);
      });
      this.eventStream.on('ttscomplete', function (_ref5) {
        var detail = _ref5.detail;
        console.debug('OperatorUI', 'TTS complete event received', detail);
      });
      this.eventStream.on('status', function (_ref6) {
        var detail = _ref6.detail;
        _this4.updateSseIndicator(detail);
      });
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && !_this4.eventStream.eventSource) {
          _this4.eventStream.connect();
        }
      });
      this.eventStream.connect();
    };
    _proto.fetchInitialState = /*#__PURE__*/function () {
      var _fetchInitialState = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
        var labels, _yield$Promise$allSet, queueResult, announcementResult;
        return _regenerator().w(function (_context) {
          while (1) switch (_context.n) {
            case 0:
              labels = getLabels();
              this.feedback.show(labels.loading, {
                type: 'info',
                duration: 0
              });
              _context.n = 1;
              return Promise.allSettled([this.apiClient.getQueueState(), this.apiClient.getAnnouncementStatus()]);
            case 1:
              _yield$Promise$allSet = _context.v;
              queueResult = _yield$Promise$allSet[0];
              announcementResult = _yield$Promise$allSet[1];
              this.feedback.clear();
              if (queueResult.status === 'fulfilled' && queueResult.value) {
                this.updateQueueStatusDisplay(queueResult.value);
              } else {
                this.feedback.show('Failed to load initial queue state. Waiting for live updates.', {
                  type: 'warning',
                  duration: 5000
                });
                this.updateQueueStatusDisplay(null);
              }
              if (announcementResult.status === 'fulfilled' && announcementResult.value) {
                this.updateAnnouncementStatusDisplay(announcementResult.value);
              } else {
                this.feedback.show('Failed to load announcement status. Waiting for live updates.', {
                  type: 'warning',
                  duration: 5000
                });
                this.updateAnnouncementStatusDisplay(null);
              }
            case 2:
              return _context.a(2);
          }
        }, _callee, this);
      }));
      function fetchInitialState() {
        return _fetchInitialState.apply(this, arguments);
      }
      return fetchInitialState;
    }();
    _proto.validateInputs = function validateInputs() {
      var _this$dom$originalIdI, _this$dom$locationInp;
      var idValue = ((_this$dom$originalIdI = this.dom.originalIdInput) == null || (_this$dom$originalIdI = _this$dom$originalIdI.value) == null ? void 0 : _this$dom$originalIdI.trim()) || '';
      var locationValue = ((_this$dom$locationInp = this.dom.locationInput) == null || (_this$dom$locationInp = _this$dom$locationInp.value) == null ? void 0 : _this$dom$locationInp.trim()) || '';
      var isIdValid = Validation.isValidCallIdentifier(idValue);
      var isLocationValid = Validation.isValidCallLocation(locationValue);
      if (this.dom.btnCall) {
        this.dom.btnCall.disabled = !(isIdValid && isLocationValid);
      }
      if (this.dom.btnSkip) {
        this.dom.btnSkip.disabled = !(isIdValid && isLocationValid);
      }
    };
    _proto.updateQueueStatusDisplay = function updateQueueStatusDisplay(queueState) {
      var labels = getLabels();
      var currentCall = (queueState == null ? void 0 : queueState.current_call) || null;
      if (this.dom.statusCurrentCallId) {
        var _currentCall$id;
        this.dom.statusCurrentCallId.textContent = sanitizeText((_currentCall$id = currentCall == null ? void 0 : currentCall.id) != null ? _currentCall$id : '----');
      }
      if (this.dom.statusCurrentCallLocation) {
        var _currentCall$location;
        this.dom.statusCurrentCallLocation.textContent = sanitizeText((_currentCall$location = currentCall == null ? void 0 : currentCall.location) != null ? _currentCall$location : '----');
      }
      this.renderHistoryList(this.dom.listHistoryCalls, queueState == null ? void 0 : queueState.completed_history, {
        maxItems: MAX_LIST_ITEMS_OPERATOR,
        placeholderText: labels.historyPlaceholder || '----',
        itemClass: 'history-list-item flex justify-between items-center',
        placeholderClass: 'history-list-item italic',
        highlightClass: 'text-yellow-400',
        reverse: true
      });
      this.renderHistoryList(this.dom.listSkippedCalls, queueState == null ? void 0 : queueState.skipped_history, {
        maxItems: MAX_LIST_ITEMS_OPERATOR,
        placeholderText: labels.skippedPlaceholder || '----',
        itemClass: 'history-list-item flex justify-between items-center',
        placeholderClass: 'history-list-item italic',
        highlightClass: 'text-yellow-400',
        reverse: true
      });
    };
    _proto.cloneAnnouncementStatus = function cloneAnnouncementStatus(status) {
      if (!status) return null;
      return _extends({}, status, {
        available_slots: Array.isArray(status.available_slots) ? status.available_slots.map(function (slot) {
          return _extends({}, slot, {
            audio_playlist: Array.isArray(slot.audio_playlist) ? [].concat(slot.audio_playlist) : []
          });
        }) : []
      });
    };
    _proto.renderAnnouncementSlotButtons = function renderAnnouncementSlotButtons(announcementStatus) {
      var _this5 = this;
      var container = this.dom.announcementSlotList;
      if (!container) return;
      container.innerHTML = '';
      if (!announcementStatus || !Array.isArray(announcementStatus.available_slots) || announcementStatus.available_slots.length === 0) {
        var placeholder = document.createElement('p');
        placeholder.className = 'text-sm text-gray-400 italic';
        placeholder.textContent = 'No announcements available.';
        container.appendChild(placeholder);
        return;
      }
      var cooldownActive = Boolean(announcementStatus.cooldown_active);
      var activeSlotId = announcementStatus.current_slot_id || null;
      announcementStatus.available_slots.forEach(function (slot) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'flex items-center justify-between gap-2 w-full bg-purple-700 hover:bg-purple-800 text-white font-semibold py-2 px-3 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition duration-150 text-left';
        if (slot.id === activeSlotId) {
          button.classList.add('border', 'border-purple-300');
        }
        var audioCount = Array.isArray(slot.audio_playlist) ? slot.audio_playlist.length : 0;
        var labelSpan = document.createElement('span');
        labelSpan.className = 'slot-trigger-label';
        labelSpan.textContent = "Trigger " + slot.id;
        button.appendChild(labelSpan);
        var metaSpan = document.createElement('span');
        metaSpan.className = 'slot-trigger-meta text-xs text-purple-200 uppercase tracking-wide';
        var metaParts = [audioCount + " file" + (audioCount === 1 ? '' : 's')];
        if (slot.id === activeSlotId) metaParts.push('current');
        metaSpan.textContent = metaParts.join(' • ');
        button.appendChild(metaSpan);
        if (cooldownActive) {
          button.disabled = true;
          button.classList.add('opacity-50', 'cursor-not-allowed');
        }
        button.addEventListener('click', function () {
          return _this5.handleManualAnnouncementTrigger(slot.id, button);
        });
        container.appendChild(button);
      });
    };
    _proto.updateAnnouncementStatusDisplay = function updateAnnouncementStatusDisplay(announcementStatus) {
      var _this6 = this;
      this.lastAnnouncementStatus = this.cloneAnnouncementStatus(announcementStatus);
      if (!announcementStatus) {
        if (this.dom.statusAnnouncementSlot) this.dom.statusAnnouncementSlot.textContent = 'N/A';
        if (this.dom.statusAnnouncementCooldown) this.dom.statusAnnouncementCooldown.textContent = 'Unknown';
        if (this.dom.statusAnnouncementCooldownTimer) this.dom.statusAnnouncementCooldownTimer.textContent = '';
        this.renderAnnouncementSlotButtons(null);
        return;
      }
      if (this.dom.statusAnnouncementSlot) {
        this.dom.statusAnnouncementSlot.textContent = announcementStatus.current_slot_id || 'N/A';
      }
      if (this.cooldownIntervalId) {
        clearInterval(this.cooldownIntervalId);
        this.cooldownIntervalId = null;
      }
      if (announcementStatus.cooldown_active) {
        if (this.dom.statusAnnouncementCooldown) {
          this.dom.statusAnnouncementCooldown.textContent = 'On Cooldown';
        }
        var total = Number(announcementStatus.cooldown_seconds) || 0;
        var remaining = Number(announcementStatus.cooldown_remaining_seconds) || total;
        if (this.dom.statusAnnouncementCooldownTimer) {
          this.dom.statusAnnouncementCooldownTimer.textContent = "(" + remaining + "s)";
        }
        if (this.dom.btnNextAnnouncement) {
          this.dom.btnNextAnnouncement.disabled = true;
          this.dom.btnNextAnnouncement.classList.add('opacity-50', 'cursor-not-allowed');
          this.dom.btnNextAnnouncement.textContent = 'Trigger Next Announcement';
        }
        this.cooldownIntervalId = setInterval(function () {
          remaining -= 1;
          if (remaining > 0) {
            if (_this6.dom.statusAnnouncementCooldownTimer) {
              _this6.dom.statusAnnouncementCooldownTimer.textContent = "(" + remaining + "s)";
            }
          } else {
            clearInterval(_this6.cooldownIntervalId);
            _this6.cooldownIntervalId = null;
            if (_this6.dom.statusAnnouncementCooldown) {
              _this6.dom.statusAnnouncementCooldown.textContent = 'Ready';
            }
            if (_this6.dom.statusAnnouncementCooldownTimer) {
              _this6.dom.statusAnnouncementCooldownTimer.textContent = '';
            }
            if (_this6.dom.btnNextAnnouncement) {
              _this6.dom.btnNextAnnouncement.disabled = false;
              _this6.dom.btnNextAnnouncement.classList.remove('opacity-50', 'cursor-not-allowed');
              _this6.dom.btnNextAnnouncement.textContent = 'Trigger Next Announcement';
            }
            _this6.renderAnnouncementSlotButtons(_extends({}, announcementStatus, {
              cooldown_active: false,
              cooldown_remaining_seconds: 0
            }));
          }
        }, 1000);
      } else {
        if (this.dom.statusAnnouncementCooldown) {
          this.dom.statusAnnouncementCooldown.textContent = 'Ready';
        }
        if (this.dom.statusAnnouncementCooldownTimer) {
          this.dom.statusAnnouncementCooldownTimer.textContent = '';
        }
        if (this.dom.btnNextAnnouncement) {
          this.dom.btnNextAnnouncement.disabled = false;
          this.dom.btnNextAnnouncement.classList.remove('opacity-50', 'cursor-not-allowed');
          this.dom.btnNextAnnouncement.textContent = 'Trigger Next Announcement';
        }
      }
      this.renderAnnouncementSlotButtons(announcementStatus);
    };
    _proto.handleCallFormSubmit = /*#__PURE__*/function () {
      var _handleCallFormSubmit = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(event) {
        var originalId, location, payload, response, message;
        return _regenerator().w(function (_context2) {
          while (1) switch (_context2.n) {
            case 0:
              event.preventDefault();
              this.feedback.clear();
              originalId = this.dom.originalIdInput.value.trim();
              location = this.dom.locationInput.value.trim();
              if (Validation.isValidCallIdentifier(originalId)) {
                _context2.n = 1;
                break;
              }
              this.feedback.show('Identifier must start with an uppercase letter, followed by digits (e.g., A1, Z99).', {
                type: 'error'
              });
              this.dom.originalIdInput.focus();
              return _context2.a(2);
            case 1:
              if (Validation.isValidCallLocation(location)) {
                _context2.n = 2;
                break;
              }
              this.feedback.show('Location must be digits only (e.g., 5, 10).', {
                type: 'error'
              });
              this.dom.locationInput.focus();
              return _context2.a(2);
            case 2:
              if (this.dom.btnCall) {
                this.dom.btnCall.disabled = true;
                this.dom.btnCall.textContent = 'Calling...';
              }
              payload = {
                original_id: originalId,
                location: location,
                id: originalId,
                timestamp: new Date().toISOString()
              };
              _context2.n = 3;
              return this.apiClient.addCall(payload);
            case 3:
              response = _context2.v;
              if (response) {
                message = typeof response.message === 'string' ? response.message : "Call request for " + sanitizeText(originalId) + " processed.";
                this.feedback.show(message, {
                  type: 'success'
                });
                this.dom.originalIdInput.value = '';
                this.dom.originalIdInput.focus();
              } else {
                this.feedback.show("Failed to process call for " + sanitizeText(originalId) + ". Please check the console.", {
                  type: 'error'
                });
              }
              if (this.dom.btnCall) {
                this.dom.btnCall.disabled = false;
                this.dom.btnCall.textContent = 'Call Number';
              }
              this.validateInputs();
            case 4:
              return _context2.a(2);
          }
        }, _callee2, this);
      }));
      function handleCallFormSubmit(_x) {
        return _handleCallFormSubmit.apply(this, arguments);
      }
      return handleCallFormSubmit;
    }();
    _proto.handleForceSkipCall = /*#__PURE__*/function () {
      var _handleForceSkipCall = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(event) {
        var originalId, location, payload, response, message;
        return _regenerator().w(function (_context3) {
          while (1) switch (_context3.n) {
            case 0:
              event.preventDefault();
              this.feedback.clear();
              originalId = this.dom.originalIdInput.value.trim();
              location = this.dom.locationInput.value.trim();
              if (Validation.isValidCallIdentifier(originalId)) {
                _context3.n = 1;
                break;
              }
              this.feedback.show('Identifier must start with an uppercase letter, followed by digits (e.g., A1, Z99).', {
                type: 'error'
              });
              this.dom.originalIdInput.focus();
              return _context3.a(2);
            case 1:
              if (Validation.isValidCallLocation(location)) {
                _context3.n = 2;
                break;
              }
              this.feedback.show('Location must be digits only (e.g., 5, 10).', {
                type: 'error'
              });
              this.dom.locationInput.focus();
              return _context3.a(2);
            case 2:
              if (this.dom.btnSkip) {
                this.dom.btnSkip.disabled = true;
                this.dom.btnSkip.textContent = 'Skipping...';
              }
              payload = {
                original_id: originalId,
                location: location,
                id: originalId,
                timestamp: new Date().toISOString()
              };
              _context3.n = 3;
              return this.apiClient.forceSkipNewCall(payload);
            case 3:
              response = _context3.v;
              if (response) {
                message = typeof response.message === 'string' ? response.message : "Force skip request for " + sanitizeText(originalId) + " processed.";
                this.feedback.show(message, {
                  type: 'success'
                });
                this.dom.originalIdInput.value = '';
                this.dom.originalIdInput.focus();
              } else {
                this.feedback.show("Failed to skip call " + sanitizeText(originalId) + ". Please check the console.", {
                  type: 'error'
                });
              }
              if (this.dom.btnSkip) {
                this.dom.btnSkip.disabled = false;
                this.dom.btnSkip.textContent = 'Skip Queue';
              }
              this.validateInputs();
            case 4:
              return _context3.a(2);
          }
        }, _callee3, this);
      }));
      function handleForceSkipCall(_x2) {
        return _handleForceSkipCall.apply(this, arguments);
      }
      return handleForceSkipCall;
    }();
    _proto.handleManualAnnouncementTrigger = /*#__PURE__*/function () {
      var _handleManualAnnouncementTrigger = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(slotId, button) {
        var labelSpan, metaSpan, originalLabel, originalMeta, response, message;
        return _regenerator().w(function (_context4) {
          while (1) switch (_context4.n) {
            case 0:
              this.feedback.clear();
              labelSpan = button == null ? void 0 : button.querySelector('.slot-trigger-label');
              metaSpan = button == null ? void 0 : button.querySelector('.slot-trigger-meta');
              originalLabel = labelSpan ? labelSpan.textContent : null;
              originalMeta = metaSpan ? metaSpan.textContent : null;
              if (button) {
                button.disabled = true;
                button.classList.add('opacity-50', 'cursor-not-allowed');
                if (labelSpan) labelSpan.textContent = "Triggering " + slotId + "...";
                if (metaSpan) metaSpan.textContent = 'Please wait';
              }
              _context4.n = 1;
              return this.apiClient.triggerAnnouncement(slotId);
            case 1:
              response = _context4.v;
              if (response) {
                message = typeof response.message === 'string' ? response.message : "Announcement '" + sanitizeText(slotId) + "' trigger requested.";
                this.feedback.show(message, {
                  type: 'info'
                });
              }
              setTimeout(function () {
                if (!button || !document.body.contains(button) || !button.disabled) return;
                if (labelSpan && originalLabel) labelSpan.textContent = originalLabel;
                if (metaSpan && originalMeta) metaSpan.textContent = originalMeta;
                button.disabled = false;
                button.classList.remove('opacity-50', 'cursor-not-allowed');
              }, 7000);
            case 2:
              return _context4.a(2);
          }
        }, _callee4, this);
      }));
      function handleManualAnnouncementTrigger(_x3, _x4) {
        return _handleManualAnnouncementTrigger.apply(this, arguments);
      }
      return handleManualAnnouncementTrigger;
    }();
    _proto.handleNextAnnouncement = /*#__PURE__*/function () {
      var _handleNextAnnouncement = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
        var _this7 = this;
        var response, message;
        return _regenerator().w(function (_context5) {
          while (1) switch (_context5.n) {
            case 0:
              this.feedback.clear();
              if (this.dom.btnNextAnnouncement) {
                this.dom.btnNextAnnouncement.disabled = true;
                this.dom.btnNextAnnouncement.textContent = 'Triggering...';
              }
              _context5.n = 1;
              return this.apiClient.nextAnnouncement();
            case 1:
              response = _context5.v;
              if (response) {
                message = typeof response.message === 'string' ? response.message : 'Next announcement triggered.';
                this.feedback.show(message, {
                  type: 'info'
                });
              }
              setTimeout(function () {
                var _this7$dom$statusAnno;
                if (!_this7.dom.btnNextAnnouncement) return;
                if (_this7.dom.btnNextAnnouncement.disabled && ((_this7$dom$statusAnno = _this7.dom.statusAnnouncementCooldown) == null ? void 0 : _this7$dom$statusAnno.textContent) !== 'On Cooldown') {
                  _this7.dom.btnNextAnnouncement.disabled = false;
                  _this7.dom.btnNextAnnouncement.textContent = 'Trigger Next Announcement';
                  if (_this7.lastAnnouncementStatus) {
                    var cloned = _this7.cloneAnnouncementStatus(_this7.lastAnnouncementStatus);
                    if (cloned) {
                      cloned.cooldown_active = false;
                      cloned.cooldown_remaining_seconds = 0;
                      _this7.renderAnnouncementSlotButtons(cloned);
                    }
                  }
                } else if (!_this7.dom.btnNextAnnouncement.disabled) {
                  _this7.dom.btnNextAnnouncement.textContent = 'Trigger Next Announcement';
                }
              }, 7000);
            case 2:
              return _context5.a(2);
          }
        }, _callee5, this);
      }));
      function handleNextAnnouncement() {
        return _handleNextAnnouncement.apply(this, arguments);
      }
      return handleNextAnnouncement;
    }();
    _proto.persistOperatorStationValue = function persistOperatorStationValue() {
      if (!this.dom.locationInput) return;
      try {
        sessionStorage.setItem(OPERATOR_STATION_STORAGE_KEY, this.dom.locationInput.value || '');
      } catch (error) {
        console.warn('OperatorUI', 'Unable to persist operator station value', error);
      }
    };
    _proto.restoreOperatorStationValue = function restoreOperatorStationValue() {
      try {
        var storedValue = sessionStorage.getItem(OPERATOR_STATION_STORAGE_KEY);
        if (storedValue !== null && this.dom.locationInput && !this.dom.locationInput.value) {
          this.dom.locationInput.value = storedValue;
        }
      } catch (error) {
        console.warn('OperatorUI', 'Unable to restore operator station value', error);
      }
    };
    return OperatorPage;
  }();
  document.addEventListener('DOMContentLoaded', function () {
    var page = new OperatorPage();
    page.init();
  });

})();
//# sourceMappingURL=operator.legacy.js.map
