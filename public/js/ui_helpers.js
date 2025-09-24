(function (global) {
    'use strict';

    const noop = () => {};

    const getSanitizer = () => (typeof sanitizeText === 'function'
        ? sanitizeText
        : (value) => (value == null ? '' : String(value)));

    const getTimestampFormatter = () => (typeof formatDisplayTime === 'function'
        ? formatDisplayTime
        : (value) => (value == null ? '' : String(value)));

    /**
     * Renders a list of queue calls into the provided container. Falls back to a placeholder
     * entry when no data is available.
     *
     * @param {HTMLElement|null} container - The target list element.
     * @param {Array<object>|null} items - Collection of calls (with id, location, timestamp).
     * @param {object} [options]
     * @param {number} [options.maxItems] - Maximum entries to display.
     * @param {string} [options.placeholderText] - Message shown when the list is empty.
     * @param {string} [options.itemClass] - CSS class applied to each list item.
     * @param {string} [options.placeholderClass] - CSS class applied to the placeholder item.
     * @param {string} [options.highlightClass] - Cosmetic class applied to both id and location spans.
     * @param {string} [options.timestampClass] - CSS class for the timestamp span.
     * @param {boolean} [options.reverse=false] - When true, data items are rendered newest-first.
     * @param {boolean} [options.showTimestamp=true] - Controls whether timestamps are rendered.
     * @param {Function} [options.timestampFormatter] - Custom formatter for timestamp values.
     */
    function renderCallList(container, items, options = {}) {
        if (!container) return;

        const {
            maxItems = Array.isArray(items) ? items.length : 0,
            placeholderText = '',
            itemClass = 'history-item flex justify-between items-center',
            placeholderClass = `${itemClass} italic`,
            highlightClass = '',
            timestampClass = 'text-xs text-gray-400',
            reverse = false,
            showTimestamp = true,
            timestampFormatter = getTimestampFormatter(),
        } = options;

        container.innerHTML = '';
        const sanitizer = getSanitizer();
        const data = Array.isArray(items) ? items.slice(0, maxItems) : [];
        if (reverse) data.reverse();

        if (data.length === 0) {
            const placeholder = document.createElement('li');
            placeholder.className = placeholderClass.trim();
            placeholder.textContent = placeholderText;
            container.appendChild(placeholder);
            return;
        }

        data.forEach((entry) => {
            const li = document.createElement('li');
            li.className = itemClass;

            const labelSpan = document.createElement('span');
            const idStrong = document.createElement('strong');
            idStrong.className = ['font-semibold', highlightClass].filter(Boolean).join(' ');
            idStrong.textContent = sanitizer(entry?.id ?? '----');

            const arrowSpan = document.createElement('span');
            arrowSpan.textContent = ' → ';

            const locationStrong = document.createElement('strong');
            locationStrong.className = ['font-semibold', highlightClass].filter(Boolean).join(' ');
            locationStrong.textContent = sanitizer(entry?.location ?? '----');

            labelSpan.appendChild(idStrong);
            labelSpan.appendChild(arrowSpan);
            labelSpan.appendChild(locationStrong);
            li.appendChild(labelSpan);

            if (showTimestamp) {
                const tsSpan = document.createElement('span');
                tsSpan.className = timestampClass;
                tsSpan.textContent = timestampFormatter(entry?.timestamp ?? '');
                li.appendChild(tsSpan);
            }

            container.appendChild(li);
        });
    }

    /**
     * Returns a function that updates the SSE indicator element using the supplied options.
     *
     * @param {HTMLElement|null} element - Target indicator element.
     * @param {object} [options]
     * @param {Record<string,string>} [options.statusClassMap] - Maps status keys to class names.
     * @param {string} [options.baseClass] - Base class preserved on each update.
     * @param {boolean} [options.setDataset=false] - Whether to synchronise `dataset.status`.
     * @param {string} [options.fallbackMessage] - Default message when status lacks text.
     * @param {boolean} [options.keepClasses=false] - Whether to skip class manipulation.
     * @returns {Function} Updater accepting `{status, message}` payloads.
     */
    function createSseIndicatorUpdater(element, options = {}) {
        if (!element) return noop;

        const {
            statusClassMap = {},
            baseClass = element.className,
            setDataset = false,
            fallbackMessage = '',
            keepClasses = false,
        } = options;

        const classMap = { default: '', ...statusClassMap };

        return ({ status, message } = {}) => {
            const normalizedStatus = status || '';
            const text = message || fallbackMessage || normalizedStatus;
            element.textContent = text;

            if (setDataset) {
                element.dataset.status = normalizedStatus;
            }

            if (!keepClasses) {
                const statusClass = classMap.hasOwnProperty(normalizedStatus)
                    ? classMap[normalizedStatus]
                    : classMap.default;
                element.className = [baseClass, statusClass].filter(Boolean).join(' ');
            }
        };
    }

    global.UIHelpers = {
        renderCallList,
        createSseIndicatorUpdater,
    };
})(window);
