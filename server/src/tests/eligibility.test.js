const { checkEligibility } = require('../utils/eligibility');

const student = { cgpa: 8.0, branch: 'CSE', graduationYear: 2027, backlogs: 0 };
const drive = (eligibility) => ({ eligibility });

describe('checkEligibility', () => {
  it('passes when every criterion is met', () => {
    const result = checkEligibility(student, drive({ minCgpa: 7, branches: ['CSE', 'ISE'], graduationYear: 2027, maxBacklogs: 0 }));
    expect(result.eligible).toBe(true);
    expect(result.checks).toHaveLength(4);
  });

  it('treats empty branches and null year as open to all', () => {
    const result = checkEligibility({ ...student, branch: 'ME', graduationYear: 2026 }, drive({ minCgpa: 6, branches: [], graduationYear: null }));
    expect(result.eligible).toBe(true);
  });

  it('reports exactly which criteria failed', () => {
    const result = checkEligibility({ ...student, cgpa: 6.5, backlogs: 2 }, drive({ minCgpa: 7, branches: ['ECE'], graduationYear: 2027, maxBacklogs: 1 }));
    expect(result.eligible).toBe(false);
    expect(result.checks.filter((c) => !c.passed).map((c) => c.field)).toEqual(['cgpa', 'branch', 'backlogs']);
  });

  it('accepts a CGPA exactly at the cut-off', () => {
    expect(checkEligibility({ ...student, cgpa: 7 }, drive({ minCgpa: 7 })).eligible).toBe(true);
  });
});
