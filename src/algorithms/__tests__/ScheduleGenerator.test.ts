import { generateScheduleOptions } from '../ScheduleGenerator';
import { createMockTask, createMockPreferences, createTimestamp } from '../../../testUtils';

describe('generateScheduleOptions', () => {
  it('creates three schedule options with tasks ordered by priority', () => {
    const prefs = createMockPreferences({
      morningAvailableTime: 120,
      eveningAvailableTime: 0,
    });

    const start = new Date('2023-01-01T08:00:00Z');
    const tasks = [
      createMockTask({ id: 'A', urgency: 5, difficulty: 5, durationMinutes: 30, deadline: createTimestamp(start) }),
      createMockTask({ id: 'B', urgency: 3, difficulty: 2, durationMinutes: 30, deadline: createTimestamp(start) }),
      createMockTask({ id: 'C', urgency: 1, difficulty: 1, durationMinutes: 60, deadline: createTimestamp(start) }),
    ];

    const schedules = generateScheduleOptions(tasks, prefs, start, 120, start);

    expect(schedules).toHaveLength(3);
    for (const schedule of schedules) {
      expect(schedule.tasks).toHaveLength(3);
    }

    const [firstTask, secondTask, thirdTask] = schedules[0].tasks;
    expect(firstTask.taskId).toBe('A');
    expect(secondTask.taskId).toBe('B');
    expect(thirdTask.taskId).toBe('C');
  });

  it('balances tasks across categories', () => {
    const prefs = createMockPreferences({
      morningAvailableTime: 120,
      eveningAvailableTime: 0,
    });

    const start = new Date('2023-01-01T08:00:00Z');
    const tasks = [
      createMockTask({ id: 'A1', tags: ['A'], urgency: 5, difficulty: 3, durationMinutes: 30, deadline: createTimestamp(start) }),
      createMockTask({ id: 'B1', tags: ['B'], urgency: 5, difficulty: 3, durationMinutes: 30, deadline: createTimestamp(start) }),
      createMockTask({ id: 'A2', tags: ['A'], urgency: 4, difficulty: 2, durationMinutes: 30, deadline: createTimestamp(start) }),
      createMockTask({ id: 'B2', tags: ['B'], urgency: 4, difficulty: 2, durationMinutes: 30, deadline: createTimestamp(start) }),
    ];

    const schedules = generateScheduleOptions(tasks, prefs, start, 120, start);
    const balanced = schedules[1];
    const categories = balanced.tasks.map(t => tasks.find(tsk => tsk.id === t.taskId)?.tags[0]);
    expect(categories).toEqual(['A', 'B', 'A', 'B']);
  });

  it('groups similar tasks together', () => {
    const prefs = createMockPreferences({
      morningAvailableTime: 120,
      eveningAvailableTime: 0,
    });

    const start = new Date('2023-01-01T08:00:00Z');
    const tasks = [
      createMockTask({ id: 'A1', tags: ['A'], urgency: 5, difficulty: 3, durationMinutes: 30, deadline: createTimestamp(start) }),
      createMockTask({ id: 'A2', tags: ['A'], urgency: 4, difficulty: 2, durationMinutes: 30, deadline: createTimestamp(start) }),
      createMockTask({ id: 'B1', tags: ['B'], urgency: 3, difficulty: 2, durationMinutes: 30, deadline: createTimestamp(start) }),
      createMockTask({ id: 'B2', tags: ['B'], urgency: 2, difficulty: 1, durationMinutes: 30, deadline: createTimestamp(start) }),
    ];

    const schedules = generateScheduleOptions(tasks, prefs, start, 120, start);
    const grouped = schedules[2];
    const categories = grouped.tasks.map(t => tasks.find(tsk => tsk.id === t.taskId)?.tags[0]);
    expect(categories.slice(0, 2)).toEqual(['A', 'A']);
    expect(categories.slice(2)).toEqual(['B', 'B']);
  });

  it('respects available time when scheduling', () => {
    const prefs = createMockPreferences({
      morningAvailableTime: 60,
      eveningAvailableTime: 0,
    });

    const start = new Date('2023-01-01T08:00:00Z');
    const tasks = [
      createMockTask({ id: 'A', urgency: 5, difficulty: 3, durationMinutes: 45, deadline: createTimestamp(start) }),
      createMockTask({ id: 'B', urgency: 4, difficulty: 2, durationMinutes: 45, deadline: createTimestamp(start) }),
    ];

    const schedules = generateScheduleOptions(tasks, prefs, start, 60, start);
    const priority = schedules[0];
    expect(priority.tasks).toHaveLength(1);
    expect(priority.tasks[0].taskId).toBe('A');
  });
});
