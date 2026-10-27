import { BarChart3, Briefcase, Cloud, Code2, Cog, Cpu, Globe2, IndianRupee, Lock, Palette } from 'lucide-react';

// Keys mirror server/src/utils/profileOptions.js.
export const ROLE_OPTIONS = [
  { key: 'software', label: 'Software Engineer', hint: 'Build products and systems', icon: Code2 },
  { key: 'web', label: 'Web / Full-stack', hint: 'Frontend, backend, everything between', icon: Globe2 },
  { key: 'data', label: 'Data Analyst / Scientist', hint: 'Turn data into decisions', icon: BarChart3 },
  { key: 'cloud', label: 'Cloud & DevOps', hint: 'Ship, scale and keep it running', icon: Cloud },
  { key: 'security', label: 'Cybersecurity', hint: 'Break things, then protect them', icon: Lock },
  { key: 'consulting', label: 'Consulting / Business Analyst', hint: 'Solve business problems', icon: Briefcase },
  { key: 'product', label: 'Product & Design', hint: 'Decide what to build and how it feels', icon: Palette },
  { key: 'core', label: 'Core Engineering', hint: 'Mechanical, electrical, civil roles', icon: Cog },
  { key: 'embedded', label: 'Embedded & VLSI', hint: 'Chips, firmware and hardware', icon: Cpu },
  { key: 'finance', label: 'Finance & Fintech', hint: 'Markets, banking and money tech', icon: IndianRupee },
];

export const INTEREST_OPTIONS = [
  { key: 'ai', label: 'AI & Machine Learning', emoji: '🤖' },
  { key: 'web', label: 'Web Development', emoji: '🌐' },
  { key: 'mobile', label: 'Mobile Apps', emoji: '📱' },
  { key: 'data', label: 'Data & Analytics', emoji: '📊' },
  { key: 'cloud', label: 'Cloud & DevOps', emoji: '☁️' },
  { key: 'security', label: 'Cybersecurity', emoji: '🛡️' },
  { key: 'product', label: 'Product & Design', emoji: '🎨' },
  { key: 'core', label: 'Core Engineering', emoji: '⚙️' },
  { key: 'embedded', label: 'Embedded & IoT', emoji: '🔌' },
  { key: 'finance', label: 'Finance & Fintech', emoji: '💹' },
  { key: 'consulting', label: 'Consulting & Strategy', emoji: '🧭' },
  { key: 'research', label: 'Research & Higher Studies', emoji: '🔬' },
];

export const roleLabel = (key) => ROLE_OPTIONS.find((r) => r.key === key)?.label || key;
export const interestOption = (key) => INTEREST_OPTIONS.find((i) => i.key === key);

export const LOCATION_OPTIONS = ['Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Mumbai', 'Delhi NCR', 'Kolkata', 'Remote', 'Anywhere'];

const COMMON_SKILLS = ['DSA', 'Problem Solving', 'Communication', 'Aptitude', 'Git', 'Excel'];
const SOFTWARE_SKILLS = ['Java', 'Python', 'C++', 'C', 'JavaScript', 'TypeScript', 'SQL', 'React', 'Node.js', 'HTML/CSS', 'Spring Boot', 'System Design', 'AWS', 'Docker', 'Linux'];
const DATA_SKILLS = ['Python', 'SQL', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'Pandas', 'Power BI', 'Tableau', 'Statistics'];
const ELECTRONICS_SKILLS = ['Embedded C', 'Verilog', 'VLSI', 'MATLAB', 'Arduino', 'IoT', 'PCB Design', 'Signal Processing'];
const MECH_SKILLS = ['AutoCAD', 'SolidWorks', 'ANSYS', 'MATLAB', 'CATIA', 'Manufacturing', 'GD&T'];
const ELECTRICAL_SKILLS = ['MATLAB', 'PLC', 'Power Systems', 'Embedded C', 'AutoCAD Electrical', 'SCADA'];
const CIVIL_SKILLS = ['AutoCAD', 'STAAD Pro', 'Revit', 'Surveying', 'Project Management', 'Estimation'];

// Suggestions tuned to the student's branch, most relevant first.
export function skillSuggestions(branch) {
  const byBranch = {
    CSE: [...SOFTWARE_SKILLS, ...DATA_SKILLS],
    ISE: [...SOFTWARE_SKILLS, ...DATA_SKILLS],
    AIML: [...DATA_SKILLS, ...SOFTWARE_SKILLS],
    DS: [...DATA_SKILLS, ...SOFTWARE_SKILLS],
    ECE: [...ELECTRONICS_SKILLS, ...SOFTWARE_SKILLS.slice(0, 6)],
    EEE: [...ELECTRICAL_SKILLS, ...ELECTRONICS_SKILLS.slice(0, 4)],
    ME: MECH_SKILLS,
    CE: CIVIL_SKILLS,
  }[branch] || [...SOFTWARE_SKILLS.slice(0, 8), ...DATA_SKILLS.slice(0, 4)];
  // Top branch skills first, then the universal ones (DSA, aptitude…), then the long tail.
  return [...new Set([...byBranch.slice(0, 8), ...COMMON_SKILLS, ...byBranch.slice(8)])];
}

export const COLLEGES = [
  'BMS College of Engineering',
  'Christ University',
  'Dayananda Sagar College of Engineering',
  'IIT Bombay',
  'IIT Delhi',
  'IIT Madras',
  'IIIT Bangalore',
  'IIIT Hyderabad',
  'Manipal Institute of Technology',
  'MS Ramaiah Institute of Technology',
  'NIT Karnataka (Surathkal)',
  'NIT Trichy',
  'NIT Warangal',
  'PES University',
  'RV College of Engineering',
  'Sir M Visvesvaraya Institute of Technology',
  'SRM Institute of Science and Technology',
  'Siddaganga Institute of Technology',
  'Thapar Institute of Engineering and Technology',
  'VIT Vellore',
];
