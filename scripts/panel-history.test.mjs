import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PanelHistory } from '../src/diner/panel-history.ts';

test('a supporting project returns directly to the menu', () => {
  const history = new PanelHistory();
  history.reset('menu');
  history.visit('project-relicvr');
  assert.equal(history.back(), 'menu');
  assert.equal(history.back(), null);
});
test('a project opened from the notebook returns to the notebook', () => {
  const history = new PanelHistory();
  history.reset('notebook');
  history.visit('project-echo-of-mobius');
  assert.equal(history.back(), 'notebook');
});
test('duplicate navigation and reopening do not leave stale back destinations', () => {
  const history = new PanelHistory();
  history.reset('menu');
  history.visit('project-relicvr');
  history.visit('project-relicvr');
  assert.equal(history.back(), 'menu');
  history.reset('about');
  assert.equal(history.back(), null);
});
