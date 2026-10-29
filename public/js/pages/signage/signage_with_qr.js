import { SignagePage } from './page.js';
import { getLabels } from '../../core/constants.js';
import { scheduleAutoRefresh } from '../../core/refresh.js';

const AUTO_REFRESH_INTERVAL_MS = 90 * 60 * 1000;

export class SignagePageWithQR extends SignagePage {
  setupAutoRefresh() {
    this.autoRefreshCancel = scheduleAutoRefresh({
      refreshIntervalMs: AUTO_REFRESH_INTERVAL_MS,
      shouldDelay: () => this.shouldDelayRefresh(),
    });

    window.addEventListener('beforeunload', () => {
      this.autoRefreshCancel();
      this.clock.stop();
    });
  }

  updateAnnouncementDisplay(announcementStatus) {
    const container = this.dom.announcementBannerContainer;
    if (!container) return;

    if (this.bannerIntervalId) {
      clearInterval(this.bannerIntervalId);
      this.bannerIntervalId = null;
    }

    const placeholder = this.ensureBannerPlaceholder();
    this.clearBannerContainer(placeholder);

    const banners = Array.isArray(announcementStatus?.current_banner_playlist)
      ? announcementStatus.current_banner_playlist.slice()
      : [];
    if (banners.length === 0) {
      this.renderAnnouncementsPlaceholder(placeholder);
      placeholder.style.display = '';
      return;
    }

    placeholder.style.display = 'none';

    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov'];
    const playlist = banners
      .map((mediaUrl) => {
        const extension = String(mediaUrl || '').split('.').pop().toLowerCase();
        if (imageExtensions.includes(extension)) return { mediaUrl, type: 'image' };
        if (videoExtensions.includes(extension)) return { mediaUrl, type: 'video' };
        console.warn('SignagePageWithQR', 'Unsupported banner media type', mediaUrl);
        return null;
      })
      .filter(Boolean);

    if (playlist.length === 0) {
      placeholder.style.display = '';
      this.renderAnnouncementsPlaceholder(placeholder);
      container.appendChild(placeholder);
      return;
    }

    let currentIndex = 0;
    const cycleMs = (announcementStatus?.banner_cycle_interval_seconds || 10) * 1000;

    const showNextBanner = () => {
      if (playlist.length <= 1) return;
      currentIndex = (currentIndex + 1) % playlist.length;
      displayBanner();
    };

    const displayBanner = () => {
      if (this.bannerIntervalId) {
        clearInterval(this.bannerIntervalId);
        this.bannerIntervalId = null;
      }

      if (playlist.length === 0) return;
      const current = playlist[currentIndex];

      this.clearBannerContainer(placeholder);

      if (current.type === 'image') {
        const img = document.createElement('img');
        img.src = current.mediaUrl;
        img.alt = 'Announcement Banner';
        img.className = 'banner-media';
        container.appendChild(img);
        if (playlist.length > 1) {
          this.bannerIntervalId = setTimeout(showNextBanner, cycleMs);
        }
        return;
      }

      if (current.type === 'video') {
        const video = document.createElement('video');
        video.src = current.mediaUrl;
        video.className = 'banner-media';
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.loop = playlist.length === 1;

        let advanced = false;
        const advanceOnce = () => {
          if (advanced) return;
          advanced = true;
          showNextBanner();
        };

        if (playlist.length > 1) {
          video.onended = advanceOnce;
          video.onerror = advanceOnce;
        }
        container.appendChild(video);
        video.play().catch(() => {
          if (playlist.length > 1 && !advanced) {
            this.bannerIntervalId = setTimeout(advanceOnce, cycleMs);
          }
        });
        return;
      }

      placeholder.style.display = '';
      this.renderAnnouncementsPlaceholder(placeholder);
      container.appendChild(placeholder);
    };

    displayBanner();
  }

  ensureBannerPlaceholder() {
    const container = this.dom.announcementBannerContainer;
    let placeholder = this.dom.announcementPlaceholder;

    if (!placeholder) {
      placeholder = document.createElement('span');
      placeholder.id = 'announcement-placeholder';
      placeholder.className = 'text-gray-600';
      placeholder.textContent = getLabels().announcementPlaceholder || 'Announcements';
      container.appendChild(placeholder);
      this.dom.announcementPlaceholder = placeholder;
      return placeholder;
    }

    if (!placeholder.parentElement && container) {
      container.appendChild(placeholder);
    }

    return placeholder;
  }

  clearBannerContainer(placeholder = null) {
    const container = this.dom.announcementBannerContainer;
    if (!container) return;

    Array.from(container.children).forEach((child) => {
      if (placeholder && child === placeholder) {
        return;
      }
      container.removeChild(child);
    });
  }

  renderAnnouncementsPlaceholder(element) {
    if (!element) return;
    const labels = getLabels();
    if (document.documentElement.lang === 'th') {
      element.innerHTML = `
        <span style="font-size: 1.3em; font-weight: 600;">ประกาศ</span>
        <span style="font-size: 0.8em;">Announcements</span>
      `;
      element.style.display = 'flex';
      element.style.flexDirection = 'column';
      element.style.alignItems = 'center';
    } else {
      element.textContent = labels.announcementPlaceholder || 'Announcements';
    }
  }

  updateStaticPlaceholders() {
    const labels = getLabels();

    if (this.dom.listHistoryCalls) {
      this.dom.listHistoryCalls.innerHTML = '';
      const li = document.createElement('li');
      li.className = 'history-item italic text-gray-400';
      li.textContent = labels.historyPlaceholder || '----';
      this.dom.listHistoryCalls.appendChild(li);
    }

    if (this.dom.announcementPlaceholder) {
      this.renderAnnouncementsPlaceholder(this.dom.announcementPlaceholder);
    }
  }

  createClock() {
    let intervalId = null;

    const renderClock = () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');

      if (this.dom.timeElement) {
        this.dom.timeElement.textContent = `${hours}:${minutes}`;
      }
      if (this.dom.dateElement) {
        this.dom.dateElement.textContent = `${day}/${month}/${year}`;
      }
    };

    return {
      start: () => {
        if (intervalId) return;
        renderClock();
        intervalId = setInterval(renderClock, 1000);
      },
      stop: () => {
        if (!intervalId) return;
        clearInterval(intervalId);
        intervalId = null;
      },
    };
  }
}

document.addEventListener('DOMContentLoaded', () => new SignagePageWithQR().init());
