import { calculateTaskScore, TimeOfDay } from '../TaskScoring';
import { createMockTask, createMockPreferences, createTimestamp } from '../../../testUtils';

// Freeze time for deterministic deadline calculations
beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));
});

afterAll(() => {
  jest.useRealTimers();
});

describe('calculateTaskScore', () => {
  it('computes weighted score based on urgency, difficulty and deadline', () => {
    const prefs = createMockPreferences({ morningComplexFactor: 1.2 });
    const deadline = new Date('2023-01-01T01:00:00Z'); // 1 hour from now
    const task = createMockTask({
      urgency: 4,
      difficulty: 3,
      deadline: createTimestamp(deadline),
    });

    const score = calculateTaskScore(task, prefs, TimeOfDay.MORNING);

    // Manual calculation mirrored from algorithm
    const urgencyScore = 4 * 20;
    const normalizedDifficulty = 3 / 5;
    const complexFactor = 1.2;
    const alignmentScore = 100 - Math.abs(normalizedDifficulty - (complexFactor / 1.5)) * 100;
    const hoursUntilDeadline = 1; // because we froze time
    const deadlineScore = 100 * (1 / (1 + 0.01 * hoursUntilDeadline));
    const expected = urgencyScore * 0.45 + alignmentScore * 0.35 + deadlineScore * 0.20;

    expect(score).toBeCloseTo(expected, 5);
  });
});
