// Skills we look for in outside job listings, so a listing gets a skill list like a drive does.
// Mirrors the onboarding suggestions in client/src/utils/profileOptions.js, plus common extras.
// Left out: single letters (C, R) and words like Go and REST, which match too much ordinary text.
const KNOWN_SKILLS = [
  'Java', 'Python', 'C++', 'C#', 'JavaScript', 'TypeScript', 'SQL', 'React', 'Angular', 'Vue', 'Node.js',
  'HTML', 'CSS', 'Spring Boot', 'Django', 'Flask', 'Kotlin', 'Swift', 'Flutter', 'Android', 'iOS',
  'System Design', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Linux', 'Git', 'GraphQL',
  'MongoDB', 'PostgreSQL', 'MySQL', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas',
  'NLP', 'Power BI', 'Tableau', 'Excel', 'Statistics', 'Embedded C', 'Verilog', 'VLSI', 'MATLAB', 'Arduino',
  'IoT', 'PCB Design', 'Signal Processing', 'AutoCAD', 'SolidWorks', 'ANSYS', 'CATIA', 'GD&T', 'PLC',
  'SCADA', 'Power Systems', 'STAAD Pro', 'Revit', 'Figma', 'Selenium', 'Communication',
];

const ALIASES = { 'node.js': ['nodejs'], javascript: ['js'], 'machine learning': ['ml'], 'html/css': ['html', 'css'] };

const norm = (text) => String(text || '').toLowerCase().trim();
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Word boundaries that also work for "C++", "C#" and "Node.js" (and keep "js" from matching inside "Node.js").
const mentions = (text, word) => new RegExp(`(^|[^a-z0-9+#.])${escape(word)}([^a-z0-9+#]|$)`).test(text);

// Skills mentioned in the text, from KNOWN_SKILLS and the student's own list (kept in the student's spelling).
function extractSkills(text, studentSkills = []) {
  const haystack = norm(text);
  const found = [];
  const seen = new Set(); // words already credited, so "HTML/CSS" and "HTML" don't both count
  for (const skill of [...studentSkills, ...KNOWN_SKILLS]) {
    const key = norm(skill);
    const words = [key, ...(ALIASES[key] || [])];
    if (key.length < 2 || words.some((w) => seen.has(w))) continue;
    if (words.some((w) => mentions(haystack, w))) {
      found.push(skill);
      words.forEach((w) => seen.add(w));
    }
  }
  return found;
}

module.exports = { KNOWN_SKILLS, extractSkills };
