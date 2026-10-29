import assert from 'node:assert/strict';
import { test } from 'node:test';

// Page bootstrapping is suppressed; tests exercise the shared playback logic directly.
globalThis.document = { addEventListener() {} };
const { SignagePage } = await import('../public/js/pages/signage/page.js');
const { SignagePageWithQR } = await import('../public/js/pages/signage/signage_with_qr.js');
const { OperatorPage } = await import('../public/js/pages/operator/index.js');
const { QueueApiClient } = await import('../public/js/api/queueApiClient.js');

function signage(Class = SignagePage) {
  const page = Object.create(Class.prototype);
  page.eventQueue = [];
  page.currentProcessingEvent = null;
  page.updateAnnouncementDisplay = () => {};
  page.processNextEventFromQueue = () => {};
  return page;
}

for (const Class of [SignagePage, SignagePageWithQR]) {
  test(`${Class.name}: turning off stops prerecorded audio and preserves calls and translator events`, () => {
    const page = signage(Class);
    const call = { type: 'call' };
    const translator = { type: 'announcement', source: 'translator' };
    page.eventQueue = [{ type: 'announcement' }, call, translator];
    page.currentProcessingEvent = { type: 'announcement' };
    let paused = 0;
    let detached = 0;
    let finished = 0;
    page.dom = {
      chimeAudio: { pause() { paused++; } },
      announcementAudioPlayer: { pause() { paused++; } },
    };
    page.removeAudioListeners = () => detached++;
    page.finishCurrentEvent = () => finished++;
    page.handleAnnouncementStatus({ enabled: false, current_audio_playlist: [] });
    assert.deepEqual(page.eventQueue, [call, translator]);
    assert.equal(paused, 2);
    assert.equal(detached, 2);
    assert.equal(finished, 1);
  });

  test(`${Class.name}: turning off leaves an active translator or queue call playing`, () => {
    for (const current of [{ type: 'call' }, { type: 'announcement', source: 'translator' }]) {
      const page = signage(Class);
      page.currentProcessingEvent = current;
      page.handleAnnouncementStatus({ enabled: false, current_audio_playlist: [] });
      assert.equal(page.currentProcessingEvent, current);
    }
  });
}

test('repeated status updates do not duplicate a queued announcement', () => {
  const page = signage();
  const status = { enabled: true, current_audio_playlist: ['/daily.mp3'] };
  page.handleAnnouncementStatus(status);
  page.handleAnnouncementStatus(status);
  assert.equal(page.eventQueue.length, 1);
  page.handleAnnouncementStatus({ enabled: true, current_audio_playlist: [] });
  assert.equal(page.eventQueue.length, 0);
});

test('a stopped announcement cannot advance the next event through a late play rejection', async () => {
  const page = signage();
  const previous = { type: 'announcement' };
  page.currentProcessingEvent = previous;
  page.audioPlaybackQueue = [{ src: '/daily.mp3', playerType: 'announcement' }];
  let rejectPlay;
  let failures = 0;
  page.dom = { chimeAudio: {} };
  page.getAudioPlayerForType = () => ({
    pause() {},
    play() { return new Promise((resolve, reject) => { rejectPlay = reject; }); },
  });
  page.attachAudioListeners = () => {};
  page.handleAudioFileError = () => failures++;
  page.playNextAudioFileInSequence();
  page.currentProcessingEvent = { type: 'call' };
  rejectPlay(new Error('Playback cancelled'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(failures, 0);
});

test('operator keeps next disabled while off or without eligible slots', () => {
  const page = Object.create(OperatorPage.prototype);
  const button = () => ({ classList: { toggle() {} }, setAttribute() {} });
  page.dom = { btnNextAnnouncement: button(), btnToggleAnnouncements: button() };
  page.renderAnnouncementSlotButtons = () => {};
  for (const [enabled, available_slots, expected] of [
    [false, [{ id: 'daily' }], true], [true, [], true], [true, [{ id: 'daily' }], false],
  ]) {
    page.updateAnnouncementStatusDisplay({ enabled, available_slots, cooldown_remaining_seconds: 0 });
    assert.equal(page.dom.btnNextAnnouncement.disabled, expected);
  }
  page.updateAnnouncementStatusDisplay(null);
  assert.equal(page.dom.btnToggleAnnouncements.disabled, true);
  assert.equal(page.dom.btnNextAnnouncement.disabled, true);
});

test('toggle API sends an explicit boolean state', async () => {
  const api = new QueueApiClient();
  api.request = async (path, options) => ({ path, options });
  assert.deepEqual(await api.setAnnouncementsEnabled(false), {
    path: '/announcements/enabled', options: { method: 'PUT', body: { enabled: false } },
  });
});

test('switching off cancels the operator cooldown timer', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const page = Object.create(OperatorPage.prototype);
  page.dom = { btnNextAnnouncement: { classList: { toggle() {} } } };
  page.renderAnnouncementSlotButtons = () => {};
  page.updateAnnouncementStatusDisplay({
    enabled: true, available_slots: [{ id: 'daily' }], cooldown_remaining_seconds: 2,
  });
  t.mock.timers.tick(1000);
  assert.equal(page.dom.btnNextAnnouncement.disabled, true);
  page.updateAnnouncementStatusDisplay({ enabled: false, available_slots: [{ id: 'daily' }] });
  t.mock.timers.tick(2000);
  assert.equal(page.dom.btnNextAnnouncement.disabled, true);
  assert.equal(page.lastAnnouncementStatus.enabled, false);
});

function operatorWithEvents() {
  const page = Object.create(OperatorPage.prototype);
  const handlers = {};
  page.announcementStatusVersion = 0;
  page.queueStatusVersion = 0;
  page.translatorStatusVersion = 0;
  page.dom = { btnNextAnnouncement: { classList: { toggle() {} } } };
  page.renderAnnouncementSlotButtons = () => {};
  page.feedback = { show() {}, clear() {} };
  page.eventStream = {
    on(name, handler) { handlers[name] = handler; },
    connect() {},
  };
  page.attachEventStreamHandlers();
  return { page, announce: status => handlers.announcementstatus({ detail: status }) };
}

const enabledStatus = {
  enabled: true, available_slots: [{ id: 'daily' }], cooldown_remaining_seconds: 0,
};

test('a delayed status refresh cannot undo a newer off event from another operator', async () => {
  const { page, announce } = operatorWithEvents();
  announce(enabledStatus);
  let finishRead;
  let startRead;
  const started = new Promise(resolve => { startRead = resolve; });
  page.apiClient = {
    async nextAnnouncement() { return {}; },
    getAnnouncementStatus() {
      startRead();
      return new Promise(resolve => { finishRead = resolve; });
    },
  };
  const trigger = page.handleNextAnnouncement();
  await started;
  announce({ ...enabledStatus, enabled: false });
  finishRead(enabledStatus);
  await trigger;
  assert.equal(page.lastAnnouncementStatus.enabled, false);
  assert.equal(page.dom.btnNextAnnouncement.disabled, true);
});

test('initial HTTP state cannot replace a newer live announcement state', async () => {
  const { page, announce } = operatorWithEvents();
  page.updateQueueStatusDisplay = () => {};
  page.updateTranslatorStatusDisplay = () => {};
  let finishRead;
  page.apiClient = {
    async getQueueState() { return {}; },
    async getTranslatorStatus() { return {}; },
    getAnnouncementStatus() { return new Promise(resolve => { finishRead = resolve; }); },
  };
  const initial = page.fetchInitialState();
  announce({ ...enabledStatus, enabled: false });
  finishRead(enabledStatus);
  await initial;
  assert.equal(page.lastAnnouncementStatus.enabled, false);
  assert.equal(page.dom.btnNextAnnouncement.disabled, true);
});

test('a newer status request wins when HTTP responses arrive out of order', async () => {
  const { page } = operatorWithEvents();
  let finishOldRead;
  const older = page.refreshAnnouncementStatus(new Promise(resolve => { finishOldRead = resolve; }));
  await page.refreshAnnouncementStatus(Promise.resolve({ ...enabledStatus, enabled: false }));
  finishOldRead(enabledStatus);
  await older;
  assert.equal(page.lastAnnouncementStatus.enabled, false);
});

test('a pending toggle still applies after a local cooldown tick', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { page, announce } = operatorWithEvents();
  announce({ ...enabledStatus, cooldown_remaining_seconds: 2 });
  let finishToggle;
  const toggle = page.refreshAnnouncementStatus(new Promise(resolve => { finishToggle = resolve; }));
  t.mock.timers.tick(1000);
  finishToggle({ ...enabledStatus, enabled: false });
  await toggle;
  assert.equal(page.lastAnnouncementStatus.enabled, false);
  t.mock.timers.tick(2000);
  assert.equal(page.dom.btnNextAnnouncement.disabled, true);
});
