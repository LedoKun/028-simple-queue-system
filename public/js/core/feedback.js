function createFeedbackController({ elementId = 'feedback-area', root = document } = {}) {
  let dismissTimeoutId = null;
  let fadeTimeoutId = null;
  let lastMessage = '';

  const resolveElement = () => {
    if (elementId instanceof HTMLElement) {
      return elementId;
    }
    return root.getElementById(elementId);
  };

  const resetTimers = () => {
    if (dismissTimeoutId) {
      clearTimeout(dismissTimeoutId);
      dismissTimeoutId = null;
    }
    if (fadeTimeoutId) {
      clearTimeout(fadeTimeoutId);
      fadeTimeoutId = null;
    }
  };

  const applyTypeClasses = (element, type) => {
    const baseClasses = 'mb-4 p-3 rounded-md text-sm transition-opacity duration-300 ease-in-out';
    const typeMap = {
      success: 'bg-green-600 text-white',
      warning: 'bg-yellow-500 text-black',
      error: 'bg-red-600 text-white',
      info: 'bg-blue-600 text-white',
    };
    element.className = `${baseClasses} ${typeMap[type] || typeMap.info}`;
  };

  const show = (message, { type = 'info', duration = 4000 } = {}) => {
    const element = resolveElement();
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
      dismissTimeoutId = setTimeout(() => {
        element.classList.remove('opacity-100');
        element.classList.add('opacity-0');
        fadeTimeoutId = setTimeout(() => {
          if (element.textContent === lastMessage) {
            element.classList.add('hidden');
            element.textContent = '';
          }
        }, 300);
      }, duration);
    }
  };

  const clear = () => {
    const element = resolveElement();
    if (!element) return;

    resetTimers();
    element.classList.remove('opacity-100');
    element.classList.add('opacity-0');
    fadeTimeoutId = setTimeout(() => {
      element.classList.add('hidden');
      element.textContent = '';
    }, 300);
  };

  return { show, clear };
}

export { createFeedbackController };
