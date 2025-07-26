const mockAuth = { currentUser: { uid: 'abc' } };
jest.mock('../../config/firebase', () => ({ __esModule: true, auth: mockAuth }));
const { getCurrentUserId, getCurrentUserIdRequired, isAuthenticated } = require('../userUtils');

describe('userUtils', () => {
  beforeEach(() => {
    mockAuth.currentUser = { uid: 'abc' } as any;
  });

  it('returns current user id when signed in', () => {
    expect(getCurrentUserId()).toBe('abc');
    expect(isAuthenticated()).toBe(true);
    expect(getCurrentUserIdRequired()).toBe('abc');
  });

  it('handles missing user', () => {
    mockAuth.currentUser = null as any;
    expect(getCurrentUserId()).toBeNull();
    expect(isAuthenticated()).toBe(false);
    expect(() => getCurrentUserIdRequired()).toThrow('No user is currently signed in');
  });
});
