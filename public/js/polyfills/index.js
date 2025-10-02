// Polyfill entrypoint for legacy browsers (Tizen, webOS)
// Imports polyfills for language features, Promises, fetch, EventSource, etc.
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import 'whatwg-fetch';
import 'eventsource-polyfill';

// Element.closest polyfill for very old WebKit browsers.
if (typeof Element !== 'undefined' && !Element.prototype.closest) {
  Element.prototype.closest = function closest(selector) {
    let node = this;
    while (node && node.nodeType === 1) {
      if (node.matches(selector)) return node;
      node = node.parentElement || node.parentNode;
    }
    return null;
  };
}

// Element.matches polyfill
if (typeof Element !== 'undefined' && !Element.prototype.matches) {
  const proto = Element.prototype;
  proto.matches = proto.matchesSelector || proto.mozMatchesSelector || proto.msMatchesSelector ||
    proto.oMatchesSelector || proto.webkitMatchesSelector || function matches(selector) {
      const matchesList = (this.document || this.ownerDocument).querySelectorAll(selector);
      let i = matchesList.length - 1;
      while (i >= 0 && matchesList.item(i) !== this) {
        i -= 1;
      }
      return i > -1;
    };
}

// NodeList.forEach polyfill (for older browsers)
if (typeof window !== 'undefined' && window.NodeList && !NodeList.prototype.forEach) {
  NodeList.prototype.forEach = Array.prototype.forEach;
}

// HTMLCollection.forEach polyfill for convenience
if (typeof window !== 'undefined' && window.HTMLCollection && !HTMLCollection.prototype.forEach) {
  HTMLCollection.prototype.forEach = Array.prototype.forEach;
}

// dataset polyfill for elements (very old WebKit)
if (typeof document !== 'undefined' && !document.documentElement.dataset) {
  Object.defineProperty(Element.prototype, 'dataset', {
    get() {
      const attributes = this.attributes;
      const map = {};
      for (let i = 0; i < attributes.length; i += 1) {
        const attr = attributes[i];
        if (attr && attr.name && attr.name.indexOf('data-') === 0) {
          const name = attr.name.slice(5).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          map[name] = attr.value;
        }
      }
      return map;
    },
  });
}

// textContent fallback for older browsers
if (typeof Element !== 'undefined' && !('textContent' in Element.prototype)) {
  Object.defineProperty(Element.prototype, 'textContent', {
    get() {
      return this.innerText;
    },
    set(value) {
      this.innerText = value;
    },
  });
}

export default {};
