import { describe, expect, it } from 'vitest';
import { BASE_TOUR_STEPS, getTourSteps } from '../tour-steps';

describe('inotum tour step for pinned apps', () => {
  const base = { isDemoMode: false, supportsCalendar: true, supportsWebDAV: true };

  it('adds no step when nothing is pinned', () => {
    expect(getTourSteps(base).map((s) => s.id)).toEqual(BASE_TOUR_STEPS.map((s) => s.id));
    expect(getTourSteps({ ...base, pinnedAppIds: [] }).some((s) => s.id === 'inotum-apps')).toBe(false);
  });

  it('inserts the step before settings, anchored on the first pinned app', () => {
    const ids = getTourSteps({ ...base, pinnedAppIds: ['google-calendar', 'configura-casella'] }).map((s) => s.id);
    const idx = ids.indexOf('inotum-apps');
    expect(idx).toBeGreaterThan(0);
    expect(ids[idx + 1]).toBe('nav-settings');
    const step = getTourSteps({ ...base, pinnedAppIds: ['google-calendar'] }).find((s) => s.id === 'inotum-apps');
    expect(step?.target).toBe('[data-tour="app-google-calendar"]');
  });

  it('does not mutate BASE_TOUR_STEPS', () => {
    const before = BASE_TOUR_STEPS.length;
    getTourSteps({ ...base, pinnedAppIds: ['google-calendar'] });
    expect(BASE_TOUR_STEPS.length).toBe(before);
  });
});
