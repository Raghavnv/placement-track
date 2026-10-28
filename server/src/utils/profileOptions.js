// Onboarding answer options. Keys are stored on the user; keywords drive the match score.
// Mirrored in client/src/utils/profileOptions.js - keep the keys in sync.
const ROLE_OPTIONS = [
  { key: 'software', label: 'Software Engineer', keywords: ['software', 'developer', 'sde', 'programmer', 'technical staff', 'systems engineer', 'application'] },
  { key: 'web', label: 'Web / Full-stack Developer', keywords: ['web', 'frontend', 'front-end', 'backend', 'full stack', 'full-stack', 'fullstack'] },
  { key: 'data', label: 'Data Analyst / Scientist', keywords: ['data', 'analytics', 'machine learning', 'ml', 'scientist', 'ai'] },
  { key: 'cloud', label: 'Cloud & DevOps', keywords: ['cloud', 'devops', 'sre', 'site reliability', 'infrastructure', 'platform'] },
  { key: 'security', label: 'Cybersecurity', keywords: ['security', 'cyber', 'soc'] },
  { key: 'consulting', label: 'Consulting / Business Analyst', keywords: ['consultant', 'consulting', 'business analyst', 'analyst', 'strategy'] },
  { key: 'product', label: 'Product & Design', keywords: ['product', 'design', 'designer', 'ux', 'ui'] },
  { key: 'core', label: 'Core Engineering', keywords: ['graduate engineer', 'trainee', 'mechanical', 'electrical', 'civil', 'electronics', 'manufacturing'] },
  { key: 'embedded', label: 'Embedded & VLSI', keywords: ['embedded', 'iot', 'firmware', 'vlsi', 'hardware'] },
  { key: 'finance', label: 'Finance & Fintech', keywords: ['finance', 'fintech', 'banking', 'investment', 'risk'] },
];

const INTEREST_OPTIONS = [
  { key: 'ai', label: 'AI & Machine Learning', keywords: ['ai', 'machine learning', 'ml', 'deep learning', 'data science'] },
  { key: 'web', label: 'Web Development', keywords: ['web', 'react', 'node.js', 'frontend', 'full stack', 'javascript'] },
  { key: 'mobile', label: 'Mobile Apps', keywords: ['android', 'ios', 'mobile', 'flutter', 'kotlin', 'swift'] },
  { key: 'data', label: 'Data & Analytics', keywords: ['data', 'analytics', 'sql', 'power bi', 'tableau', 'excel'] },
  { key: 'cloud', label: 'Cloud & DevOps', keywords: ['cloud', 'aws', 'azure', 'devops', 'docker', 'kubernetes'] },
  { key: 'security', label: 'Cybersecurity', keywords: ['security', 'cyber', 'networking'] },
  { key: 'product', label: 'Product & Design', keywords: ['product', 'design', 'ux', 'figma'] },
  { key: 'core', label: 'Core Engineering', keywords: ['mechanical', 'electrical', 'civil', 'autocad', 'solidworks', 'matlab', 'automotive'] },
  { key: 'embedded', label: 'Embedded & IoT', keywords: ['embedded', 'iot', 'vlsi', 'firmware', 'embedded c'] },
  { key: 'finance', label: 'Finance & Fintech', keywords: ['finance', 'fintech', 'banking'] },
  { key: 'consulting', label: 'Consulting & Strategy', keywords: ['consulting', 'consultant', 'strategy', 'business'] },
  { key: 'research', label: 'Research & Higher Studies', keywords: ['research', 'r&d', 'scientist'] },
];

const ROLE_KEYS = ROLE_OPTIONS.map((r) => r.key);
const INTEREST_KEYS = INTEREST_OPTIONS.map((i) => i.key);

module.exports = { ROLE_OPTIONS, INTEREST_OPTIONS, ROLE_KEYS, INTEREST_KEYS };
