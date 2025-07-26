import { generateUniqueId } from '../idGenerator';

describe('generateUniqueId', () => {
  it('returns unique ids each call', () => {
    jest.spyOn(Date, 'now').mockReturnValue(123456789);
    jest.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValueOnce(0.9);

    const id1 = generateUniqueId();
    const id2 = generateUniqueId();

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^[a-z0-9]+-[a-z0-9]+$/i);
    expect(id2).toMatch(/^[a-z0-9]+-[a-z0-9]+$/i);

    jest.restoreAllMocks();
  });
});
