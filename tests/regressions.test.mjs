import assert from 'node:assert/strict';
import { test } from 'node:test';

globalThis.document = { addEventListener() {} };
const { SignagePage } = await import('../public/js/pages/signage/page.js');
const { OperatorPage } = await import('../public/js/pages/operator/index.js');
const { renderCallList } = await import('../public/js/core/uiHelpers.js');

function signage() {
  return Object.assign(Object.create(SignagePage.prototype), {
    queueStatusVersion: 0, announcementStatusVersion: 0,
    eventQueue: [], audioPlaybackQueue: [], currentProcessingEvent: null,
    orderedTtsLangCodes: ['th'], updateQueueDisplay() {},
    updateAnnouncementDisplay() {}, processNextEventFromQueue() {},
  });
}
const call = { id: 'A01', location: '1', timestamp: '2026-10-30T01:00:00Z' };

test('recalling an active number creates a second call and one TTS result prepares both', () => {
  const page = signage();
  page.handleQueueUpdate({ current_call: call });
  page.currentProcessingEvent = page.eventQueue.shift();
  const recalled = { ...call, timestamp: '2026-10-30T01:00:01Z' };
  page.handleQueueUpdate({ current_call: recalled });
  assert.equal(page.eventQueue.length, 1);
  page.handleQueueUpdate({ current_call: recalled });
  assert.equal(page.eventQueue.length, 1, 'unrelated updates must not repeat the call');
  page.handleTtsComplete({ id: 'A01', location: '1', lang: 'th', audio_urls: ['/call.mp3'] });
  assert.equal(page.currentProcessingEvent.ttsReady, true);
  assert.equal(page.eventQueue[0].ttsReady, true);
  assert.deepEqual(page.eventQueue[0].receivedTtsUrls, ['/call.mp3']);
});

test('an unchanged current call is not replayed after its audio finishes', () => {
  const page = signage();
  page.handleQueueUpdate({ current_call: call });
  page.eventQueue = [];
  page.handleQueueUpdate({ current_call: call, completed_history: [] });
  assert.equal(page.eventQueue.length, 0);
});

for (const Class of [SignagePage, OperatorPage]) {
  test(`${Class.name} refreshes state when SSE reconnects`, () => {
    const page = Object.create(Class.prototype);
    const handlers = {};
    let refreshes = 0;
    page.updateSseIndicator = () => {};
    page.fetchInitialState = async () => { refreshes++; };
    page.eventStream = { on(name, handler) { handlers[name] = handler; }, connect() {} };
    page.attachEventStreamHandlers();
    handlers.status({ detail: { status: 'connected' } });
    assert.equal(refreshes, 1);
  });
}

test('late signage HTTP state cannot replace a newer live call', async (t) => {
  const page = signage();
  let finishRead;
  t.mock.method(globalThis, 'fetch', async url => ({
    ok: true,
    json: () => url.endsWith('/queue/state')
      ? new Promise(resolve => { finishRead = resolve; })
      : Promise.resolve({ current_banner_playlist: [] }),
  }));
  page.updateCurrentCallDisplay = value => { page.displayed = value?.id; };
  page.processNextEventFromQueue = () => {
    if (page.eventQueue.length) {
      page.currentProcessingEvent = page.eventQueue.shift();
      page.lastShownCallData = page.currentProcessingEvent.callData;
      page.updateCurrentCallDisplay(page.lastShownCallData);
    }
  };
  const request = page.fetchInitialState();
  while (!finishRead) await new Promise(resolve => setImmediate(resolve));
  const newer = { ...call, id: 'A02' };
  page.handleQueueUpdate({ current_call: newer });
  finishRead({ current_call: call });
  await request;
  assert.equal(page.displayed, 'A02');
  assert.equal(page.lastShownCallData.id, 'A02');
});

test('late operator HTTP state cannot replace live queue or translator updates', async () => {
  const page = Object.assign(Object.create(OperatorPage.prototype), {
    queueStatusVersion: 0, translatorStatusVersion: 0,
    feedback: { show() {}, clear() {} },
    updateSseIndicator() {},
    updateQueueStatusDisplay(value) { this.displayed = value.current_call.id; },
    updateTranslatorStatusDisplay(value) { this.translator = value; },
    refreshAnnouncementStatus: async () => ({}),
  });
  const handlers = {};
  let finishQueue, finishTranslator;
  page.eventStream = { on(name, handler) { handlers[name] = handler; }, connect() {} };
  page.apiClient = {
    getQueueState: () => new Promise(resolve => { finishQueue = resolve; }),
    getTranslatorStatus: () => new Promise(resolve => { finishTranslator = resolve; }),
  };
  page.attachEventStreamHandlers();
  const initial = page.fetchInitialState();
  handlers.queueupdate({ detail: { current_call: { ...call, id: 'A02' } } });
  const status = { cooldown_active: true, cooldown_seconds: 30, cooldown_remaining_seconds: 30 };
  handlers.translatorcall({ detail: status });
  finishQueue({ current_call: call });
  finishTranslator({ cooldown_active: false });
  await initial;
  assert.equal(page.displayed, 'A02');
  assert.deepEqual(page.translator, status);
});

test('reverse history selects the newest entries before limiting the list', () => {
  const element = () => ({ children: [], appendChild(child) { this.children.push(child); } });
  globalThis.document.createElement = element;
  const container = element();
  const items = Array.from({ length: 10 }, (_, i) => ({ id: `A${i}`, location: '1' }));
  renderCallList(container, items, { reverse: true, maxItems: 3, showTimestamp: false });
  assert.deepEqual(container.children.map(li => li.children[0].children[0].textContent), ['A9', 'A8', 'A7']);
  assert.equal(items[0].id, 'A0');
});

test('finishing an older audio queue shows the latest state recovered after reconnect', () => {
  const page = signage();
  page.lastObservedCall = { ...call, id: 'A02' };
  page.lastShownCallData = call;
  page.updateCurrentCallDisplay = value => { page.displayed = value?.id; };
  SignagePage.prototype.processNextEventFromQueue.call(page);
  assert.equal(page.displayed, 'A02');
  page.lastObservedCall = null;
  SignagePage.prototype.processNextEventFromQueue.call(page);
  assert.equal(page.displayed, undefined);
});

test('completing a call includes it in history even if it was last displayed', () => {
  const page = signage();
  page.lastShownCallData = call;
  assert.deepEqual(page.getDisplayHistory({ current_call: null, completed_history: [call] }), [call]);
});
