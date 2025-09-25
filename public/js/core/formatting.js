function sanitizeText(value) {
  if (value === null || typeof value === 'undefined') {
    return '';
  }
  const temp = document.createElement('div');
  temp.textContent = String(value);
  return temp.innerHTML;
}

function formatDisplayTime(isoTimestamp) {
  if (!isoTimestamp) {
    return '';
  }
  try {
    const date = new Date(isoTimestamp);
    return date.toLocaleTimeString(navigator.language, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    });
  } catch (error) {
    console.error('FORMAT', 'Failed to format timestamp', isoTimestamp, error);
    return 'Invalid Time';
  }
}

export { sanitizeText, formatDisplayTime };
