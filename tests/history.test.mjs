import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SignagePage } from '../public/js/pages/signage/page.js';

globalThis.document = { addEventListener() {} };
const { SignagePageWithQR } = await import('../public/js/pages/signage/signage_with_qr.js');

for (const Class of [SignagePage, SignagePageWithQR]) {
  test(`${Class.name}: history excludes skipped and active tokens and keeps the newest occurrence first`, () => {
    const page = Object.create(Class.prototype);
    const older = { id: 'A01', timestamp: '2026-10-29T01:00:00Z' };
    const latest = { id: 'A01', timestamp: '2026-10-29T03:00:00Z' };
    const other = { id: 'A02', timestamp: '2026-10-29T02:00:00Z' };
    const current = { id: 'A03', timestamp: '2026-10-29T04:00:00Z' };
    const state = {
      current_call: current,
      completed_history: [older, other, current, latest, null, { id: '' }],
      skipped_history: [{ id: 'A99', timestamp: '2026-10-29T05:00:00Z' }],
    };
    assert.deepEqual(page.getDisplayHistory(state), [latest, other]);
    assert.deepEqual(state.completed_history, [older, other, current, latest, null, { id: '' }]);
    assert.deepEqual(page.getDisplayHistory(null), []);
    assert.deepEqual(page.getDisplayHistory({ completed_history: 'invalid' }), []);
    page.currentProcessingEvent = { callData: { id: ' a01 ' } };
    assert.deepEqual(page.getDisplayHistory({ completed_history: [older, other] }), [other]);
  });
}
