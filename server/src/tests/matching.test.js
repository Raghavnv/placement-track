const { computeMatch } = require('../utils/matching');

const drive = {
  role: 'Software Engineer',
  description: 'Build web apps with React and Node.js',
  skills: ['Java', 'React', 'SQL', 'DSA'],
  location: 'Bengaluru',
  jobType: 'full-time',
  package: 8,
};

describe('computeMatch', () => {
  it('scores a strong fit highly and explains why', () => {
    const student = {
      skills: ['react', 'SQL', 'Java', 'Python'],
      preferredRoles: ['software'],
      interests: ['web'],
      preferredLocations: ['Bengaluru'],
      jobTypes: ['full-time'],
      expectedPackage: 6,
    };
    const { score, reasons } = computeMatch(student, drive);
    expect(score).toBeGreaterThanOrEqual(90);
    expect(reasons[0]).toBe('3 of 4 skills match (Java, React, SQL)');
    expect(reasons).toContain('Fits your Software Engineer goal');
  });

  it('scores a poor fit low', () => {
    const student = {
      skills: ['AutoCAD'],
      preferredRoles: ['core'],
      interests: ['core'],
      preferredLocations: ['Pune'],
      jobTypes: ['internship'],
      expectedPackage: 16,
    };
    expect(computeMatch(student, drive).score).toBeLessThan(15);
  });

  it('gives neutral credit when the student has not answered yet', () => {
    const { score, reasons } = computeMatch({}, drive);
    expect(score).toBeGreaterThan(10);
    expect(score).toBeLessThan(40);
    expect(reasons).toEqual([]);
  });

  it('matches whole words only', () => {
    // "ai" must not match inside "maintain"
    const result = computeMatch({ interests: ['ai'] }, { ...drive, role: 'Maintenance Engineer', description: 'maintain plants', skills: [] });
    expect(result.reasons).not.toContain('Matches your interest in AI & Machine Learning');
  });

  it('treats Anywhere and Pan-India as location matches', () => {
    expect(computeMatch({ preferredLocations: ['Anywhere'] }, drive).score).toBe(computeMatch({ preferredLocations: ['Bengaluru'] }, drive).score);
    const panIndia = computeMatch({ preferredLocations: ['Pune'] }, { ...drive, location: 'Pan-India' });
    const elsewhere = computeMatch({ preferredLocations: ['Pune'] }, drive);
    expect(panIndia.score).toBeGreaterThan(elsewhere.score);
  });
});
