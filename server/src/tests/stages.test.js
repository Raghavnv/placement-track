const { STAGES, canTransition, emptyStageCounts } = require('../utils/stages');

describe('stage transitions', () => {
  it.each([
    ['applied', 'aptitude'],
    ['applied', 'rejected'],
    ['aptitude', 'interview'],
    ['aptitude', 'rejected'],
    ['interview', 'offer'],
    ['interview', 'rejected'],
  ])('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ['applied', 'interview'],
    ['applied', 'offer'],
    ['aptitude', 'applied'],
    ['offer', 'rejected'],
    ['rejected', 'applied'],
    ['applied', 'applied'],
    ['unknown', 'applied'],
  ])('blocks %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it('builds zeroed counts for every stage', () => {
    expect(Object.keys(emptyStageCounts())).toEqual(STAGES);
    expect(Object.values(emptyStageCounts()).every((n) => n === 0)).toBe(true);
  });
});
