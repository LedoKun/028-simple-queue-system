const API_BASE_URL = '/api';
const SSE_URL = `${API_BASE_URL}/events`;

const UI_TEXT = {
  en: {
    connecting: 'Connecting to server...',
    connected: 'Live Connection Active',
    disconnected: 'Connection lost. Retrying...',
    announcementPlaceholder: 'Announcements',
    historyPlaceholder: '----',
    skippedPlaceholder: '----',
    loading: 'Loading...',
    errorPrefix: 'Error: ',
    successPrefix: 'Success: ',
  },
  th: {
    connecting: 'Connecting to server...',
    connected: 'Live Connection Active',
    disconnected: 'Connection lost. Retrying...',
    announcementPlaceholder: 'ประกาศ',
    historyPlaceholder: 'รอการเรียก...',
    skippedPlaceholder: 'ไม่มีคิวที่ข้ามไป',
    loading: 'กำลังโหลด...',
    errorPrefix: 'ข้อผิดพลาด: ',
    successPrefix: 'สำเร็จ: ',
  },
};

let currentLanguage = 'en';

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

function getLabels(lang = getCurrentLanguage()) {
  return UI_TEXT[lang] || UI_TEXT.en;
}

export { API_BASE_URL, SSE_URL, UI_TEXT, getCurrentLanguage, setCurrentLanguage, getLabels };
