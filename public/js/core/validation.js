const CALL_IDENTIFIER_REGEX_PREFIX_REQUIRED = /^[A-Z][0-9]+$/;
const CALL_IDENTIFIER_REGEX_NUMERIC_ONLY = /^[0-9]+$/;
const CALL_LOCATION_REGEX = /^[0-9]+$/;

let queueIdentifierPrefixRequired = true;

function setQueueIdentifierPrefixRequired(required) {
  queueIdentifierPrefixRequired = required !== false;
  return queueIdentifierPrefixRequired;
}

function isQueueIdentifierPrefixRequired() {
  return queueIdentifierPrefixRequired;
}

function getCallIdentifierRegex() {
  return queueIdentifierPrefixRequired
    ? CALL_IDENTIFIER_REGEX_PREFIX_REQUIRED
    : CALL_IDENTIFIER_REGEX_NUMERIC_ONLY;
}

function getCallIdentifierValidationMessage() {
  return queueIdentifierPrefixRequired
    ? 'Identifier must start with an uppercase letter, followed by digits (e.g., A1, Z99).'
    : 'Identifier must contain digits only (e.g., 1, 99).';
}

function sanitizeCallIdentifierInput(value) {
  const rawValue = String(value || '');

  if (!queueIdentifierPrefixRequired) {
    return rawValue.replace(/[^0-9]/g, '');
  }

  let cleaned = '';
  if (rawValue.length > 0) {
    const firstChar = rawValue.charAt(0).toUpperCase();
    if (/^[A-Z]$/.test(firstChar)) {
      cleaned += firstChar;
    }
    if (rawValue.length > 1) {
      cleaned += rawValue.substring(1).replace(/[^0-9]/g, '');
    }
  }

  return cleaned;
}

function isValidCallIdentifier(value) {
  return getCallIdentifierRegex().test(String(value || '').trim());
}

function isValidCallLocation(value) {
  return CALL_LOCATION_REGEX.test(String(value || '').trim());
}

const Validation = Object.freeze({
  CALL_IDENTIFIER_REGEX_PREFIX_REQUIRED,
  CALL_IDENTIFIER_REGEX_NUMERIC_ONLY,
  CALL_LOCATION_REGEX,
  getCallIdentifierRegex,
  getCallIdentifierValidationMessage,
  sanitizeCallIdentifierInput,
  setQueueIdentifierPrefixRequired,
  isQueueIdentifierPrefixRequired,
  isValidCallIdentifier,
  isValidCallLocation,
});

if (typeof window !== 'undefined') {
  window.Validation = Validation;
}

export {
  CALL_IDENTIFIER_REGEX_PREFIX_REQUIRED,
  CALL_IDENTIFIER_REGEX_NUMERIC_ONLY,
  CALL_LOCATION_REGEX,
  getCallIdentifierRegex,
  getCallIdentifierValidationMessage,
  sanitizeCallIdentifierInput,
  setQueueIdentifierPrefixRequired,
  isQueueIdentifierPrefixRequired,
  isValidCallIdentifier,
  isValidCallLocation,
  Validation,
};
