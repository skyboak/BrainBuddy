jest.mock('../UserPreferencesService', () => ({
  __esModule: true,
  default: {
    getUserPreferences: jest.fn(),
    updateUserPreferences: jest.fn(),
  },
}));
const UserPreferencesService = require('../UserPreferencesService').default;
const ProductivityFeedbackService = require('../ProductivityFeedbackService').default;
import { createMockTask, createMockPreferences, createTimestamp } from '../../../testUtils';

const mockPrefs = createMockPreferences({
  morningComplexFactor: 1,
  eveningComplexFactor: 1,
});

(UserPreferencesService.getUserPreferences as jest.Mock).mockResolvedValue(mockPrefs);
(UserPreferencesService.updateUserPreferences as jest.Mock).mockResolvedValue(undefined);

describe('ProductivityFeedbackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (UserPreferencesService.getUserPreferences as jest.Mock).mockResolvedValue(mockPrefs);
  });

  it('updates morning factor based on completed task difficulty', async () => {
    const date = new Date();
    date.setHours(9);
    const task = createMockTask({
      userId: 'test-user',
      difficulty: 5,
      completedAt: createTimestamp(date),
    });

    await ProductivityFeedbackService.recordTaskCompletion(task);

    const expected = 1 * 0.9 + 0.1 * 1.5;
    expect(UserPreferencesService.updateUserPreferences).toHaveBeenCalledWith('test-user', {
      morningComplexFactor: expected,
    });
  });

  it('updates evening factor when task completed at night', async () => {
    const date = new Date();
    date.setHours(20);
    const task = createMockTask({
      userId: 'test-user',
      difficulty: 2,
      completedAt: createTimestamp(date),
    });

    await ProductivityFeedbackService.recordTaskCompletion(task);

    const difficultyFactor = 0.5 + ((2 - 1) / 4);
    const expected = 1 * 0.9 + 0.1 * difficultyFactor;
    expect(UserPreferencesService.updateUserPreferences).toHaveBeenCalledWith('test-user', {
      eveningComplexFactor: expected,
    });
  });

  it('clamps updated factor within valid range', async () => {
    (UserPreferencesService.getUserPreferences as jest.Mock).mockResolvedValue(
      createMockPreferences({ morningComplexFactor: 2 })
    );
    const date = new Date();
    date.setHours(9);
    const task = createMockTask({
      userId: 'test-user',
      difficulty: 5,
      completedAt: createTimestamp(date),
    });

    await ProductivityFeedbackService.recordTaskCompletion(task);

    expect(UserPreferencesService.updateUserPreferences).toHaveBeenCalledWith('test-user', {
      morningComplexFactor: 1.5,
    });
  });
});
