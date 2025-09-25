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
    timestampFormatter = (value) => (value ?? ''),
    sanitizer = (value) => (value == null ? '' : String(value)),
  } = options;

  container.innerHTML = '';
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

function createSseIndicatorUpdater(element, options = {}) {
  if (!element) return () => {};

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
      const mappedClass = Object.prototype.hasOwnProperty.call(classMap, normalizedStatus)
        ? classMap[normalizedStatus]
        : classMap.default;
      element.className = [baseClass, mappedClass].filter(Boolean).join(' ');
    }
  };
}

export { renderCallList, createSseIndicatorUpdater };
