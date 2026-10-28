const { ROLE_OPTIONS, INTEREST_OPTIONS } = require('./profileOptions');

// How well a drive fits a student's onboarding answers (0-100), with human-readable reasons.
// Weights: skills 35, role 25, interests 10, location 10, job type 10, package 10.
const WEIGHTS = { skills: 35, role: 25, interests: 10, location: 10, jobType: 10, package: 10 };

const norm = (text) => String(text || '').toLowerCase().trim();
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWord = (text, word) => new RegExp(`(^|[^a-z0-9])${escape(word)}([^a-z0-9]|$)`).test(text);

function computeMatch(student, drive) {
  const reasons = [];
  let score = 0;

  const driveSkills = drive.skills || [];
  const studentSkills = new Set((student.skills || []).map(norm));
  if (driveSkills.length) {
    const matched = driveSkills.filter((skill) => studentSkills.has(norm(skill)));
    score += Math.round((WEIGHTS.skills * matched.length) / driveSkills.length);
    if (matched.length) {
      reasons.push(`${matched.length} of ${driveSkills.length} skills match (${matched.slice(0, 3).join(', ')})`);
    }
  } else {
    score += Math.round(WEIGHTS.skills / 2); // no skills listed: neutral
  }

  const roleText = norm(drive.role);
  const role = ROLE_OPTIONS.find(
    (option) => (student.preferredRoles || []).includes(option.key) && option.keywords.some((k) => hasWord(roleText, k)),
  );
  if (role) {
    score += WEIGHTS.role;
    reasons.push(`Fits your ${role.label} goal`);
  }

  const haystack = norm([drive.role, drive.description, ...driveSkills].join(' '));
  const interest = INTEREST_OPTIONS.find(
    (option) => (student.interests || []).includes(option.key) && option.keywords.some((k) => hasWord(haystack, k)),
  );
  if (interest) {
    score += WEIGHTS.interests;
    reasons.push(`Matches your interest in ${interest.label}`);
  }

  const locations = (student.preferredLocations || []).map(norm);
  const location = norm(drive.location);
  if (!locations.length) {
    score += WEIGHTS.location / 2;
  } else if (
    locations.includes('anywhere') ||
    location.includes('pan-india') ||
    (location && locations.some((l) => location.includes(l) || l.includes(location)))
  ) {
    score += WEIGHTS.location;
    if (drive.location && !locations.includes('anywhere')) reasons.push(`${drive.location} is on your list`);
  }

  const jobTypes = student.jobTypes || [];
  if (!jobTypes.length || jobTypes.includes(drive.jobType)) score += WEIGHTS.jobType;

  const target = student.expectedPackage;
  if (!target || drive.package == null) {
    score += WEIGHTS.package / 2; // no target, or an outside job with no salary listed: neutral
  } else if (drive.package >= target) {
    score += WEIGHTS.package;
    reasons.push(`Pays above your ₹${target} LPA target`);
  } else {
    score += Math.floor((WEIGHTS.package * drive.package) / target);
  }

  return { score: Math.min(100, Math.round(score)), reasons: reasons.slice(0, 3) };
}

module.exports = { computeMatch, WEIGHTS };
