const ROLES = ['student', 'admin'];
const BRANCHES = ['CSE', 'ISE', 'ECE', 'EEE', 'ME', 'CE', 'AIML', 'DS', 'OTHER'];
// Mirrored in client/src/utils/constants.js.
const BRANCH_NAMES = {
  CSE: 'Computer Science',
  ISE: 'Information Science',
  ECE: 'Electronics & Communication',
  EEE: 'Electrical & Electronics',
  ME: 'Mechanical',
  CE: 'Civil',
  AIML: 'AI & Machine Learning',
  DS: 'Data Science',
  OTHER: 'Engineering',
};
const JOB_TYPES = ['full-time', 'internship'];
const DRIVE_STATUSES = ['open', 'closed'];

// Fields of a drive embedded in application responses (see api-contract.md 1.6).
const DRIVE_SUMMARY_FIELDS = 'companyName role package location jobType deadline driveDate status';

module.exports = { ROLES, BRANCHES, BRANCH_NAMES, JOB_TYPES, DRIVE_STATUSES, DRIVE_SUMMARY_FIELDS };
