const CALL_IDENTIFIER_REGEX = /^[A-Z][0-9]+$/;
const CALL_LOCATION_REGEX = /^[0-9]+$/;

function isValidCallIdentifier(value) {
  return CALL_IDENTIFIER_REGEX.test(String(value || '').trim());
}

function isValidCallLocation(value) {
  return CALL_LOCATION_REGEX.test(String(value || '').trim());
}

const Validation = Object.freeze({
  CALL_IDENTIFIER_REGEX,
  CALL_LOCATION_REGEX,
  isValidCallIdentifier,
  isValidCallLocation,
});

if (typeof window !== 'undefined') {
  window.Validation = Validation;
}

export { CALL_IDENTIFIER_REGEX, CALL_LOCATION_REGEX, isValidCallIdentifier, isValidCallLocation, Validation };
