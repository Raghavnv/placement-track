const User = require('../../models/User');
const Drive = require('../../models/Drive');
const Application = require('../../models/Application');
const { signToken } = require('../../utils/token');

const DAY = 24 * 60 * 60 * 1000;
let counter = 0;

async function createStudent(overrides = {}) {
  counter += 1;
  const n = counter; // capture before awaiting so parallel calls get unique values
  return User.create({
    name: `Student ${n}`,
    email: `student${n}@college.edu`,
    passwordHash: await User.hashPassword('Str0ngPass!'),
    role: 'student',
    rollNumber: `21CS${String(n).padStart(3, '0')}`,
    branch: 'CSE',
    cgpa: 8,
    backlogs: 0,
    graduationYear: 2027,
    ...overrides,
  });
}

async function createAdmin(overrides = {}) {
  counter += 1;
  const n = counter;
  return User.create({
    name: 'Placement Officer',
    email: `officer${n}@college.edu`,
    passwordHash: await User.hashPassword('Str0ngPass!'),
    role: 'admin',
    ...overrides,
  });
}

function createDrive(admin, overrides = {}) {
  return Drive.create({
    companyName: 'Infosys',
    role: 'Systems Engineer',
    package: 6.5,
    jobType: 'full-time',
    eligibility: { minCgpa: 7, branches: [], graduationYear: null, maxBacklogs: 0 },
    deadline: new Date(Date.now() + 5 * DAY),
    createdBy: admin._id,
    ...overrides,
  });
}

function createApplication(student, drive, overrides = {}) {
  return Application.create({
    student: student._id,
    drive: drive._id,
    stageHistory: [{ stage: 'applied', changedBy: student._id }],
    ...overrides,
  });
}

const bearer = (user) => ({ Authorization: `Bearer ${signToken(user)}` });

module.exports = { DAY, createStudent, createAdmin, createDrive, createApplication, bearer };
