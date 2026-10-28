const { policyCheck, policyCondition } = require('./placement');

// Pure eligibility rules (api-contract.md 1.5). Returns one check per criterion so
// the UI can render a pass/fail checklist and the API can explain NOT_ELIGIBLE.
// `placement` (from utils/placement placementFor) adds the offer-policy check when it applies.
function checkEligibility(student, drive, placement = null) {
  const rules = drive.eligibility || {};
  const minCgpa = rules.minCgpa ?? 0;
  const branches = rules.branches || [];
  const graduationYear = rules.graduationYear ?? null;
  const maxBacklogs = rules.maxBacklogs ?? 0;
  const backlogs = student.backlogs ?? 0;

  const checks = [
    {
      field: 'cgpa',
      label: `CGPA ≥ ${minCgpa}`,
      actual: student.cgpa,
      passed: student.cgpa >= minCgpa,
    },
    {
      field: 'branch',
      label: branches.length ? `Branch: ${branches.join(', ')}` : 'Any branch',
      actual: student.branch,
      passed: branches.length === 0 || branches.includes(student.branch),
    },
    {
      field: 'graduationYear',
      label: graduationYear ? `Graduating in ${graduationYear}` : 'Any graduation year',
      actual: student.graduationYear,
      passed: graduationYear === null || graduationYear === student.graduationYear,
    },
    {
      field: 'backlogs',
      label: `Backlogs ≤ ${maxBacklogs}`,
      actual: backlogs,
      passed: backlogs <= maxBacklogs,
    },
  ];
  const policy = policyCheck(placement, drive);
  if (policy) checks.push(policy);

  return { eligible: checks.every((c) => c.passed), checks };
}

// The same rules as a MongoDB filter, for "eligible only" listings and reminders.
function eligibilityFilter(student, placement = null) {
  const policy = policyCondition(placement);
  return {
    'eligibility.minCgpa': { $lte: student.cgpa },
    'eligibility.maxBacklogs': { $gte: student.backlogs ?? 0 },
    $and: [
      { $or: [{ 'eligibility.branches': { $size: 0 } }, { 'eligibility.branches': student.branch }] },
      { $or: [{ 'eligibility.graduationYear': null }, { 'eligibility.graduationYear': student.graduationYear }] },
      ...(policy ? [policy] : []),
    ],
  };
}

module.exports = { checkEligibility, eligibilityFilter };
