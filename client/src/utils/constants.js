export const BRANCHES = ['CSE', 'ISE', 'ECE', 'EEE', 'ME', 'CE', 'AIML', 'DS', 'OTHER'];

export const BRANCH_NAMES = {
  CSE: 'Computer Science',
  ISE: 'Information Science',
  ECE: 'Electronics & Communication',
  EEE: 'Electrical & Electronics',
  ME: 'Mechanical',
  CE: 'Civil',
  AIML: 'AI & Machine Learning',
  DS: 'Data Science',
  OTHER: 'Other',
};

export const JOB_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'internship', label: 'Internship' },
];

export const jobTypeLabel = (value) => JOB_TYPES.find((t) => t.value === value)?.label || value;

const today = new Date();
const thisYear = today.getFullYear();
export const GRADUATION_YEARS = Array.from({ length: 6 }, (_, i) => thisYear - 1 + i);
// Placement season runs in the final year: after June, finalists graduate next year.
export const DEFAULT_GRADUATION_YEAR = today.getMonth() >= 5 ? thisYear + 1 : thisYear;

export const REMINDER_DAYS = Number(import.meta.env.VITE_REMINDER_DAYS) || 3;

export const homePathFor = (user) => (user?.role === 'admin' ? '/admin' : '/student');
