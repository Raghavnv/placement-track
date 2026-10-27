// Development seed: WIPES users, drives and applications, then inserts demo data.
// Usage: npm run seed   (refuses to run when NODE_ENV=production unless --force)
const mongoose = require('mongoose');
const env = require('../config/env');
const connectDB = require('../config/db');
const User = require('../models/User');
const Drive = require('../models/Drive');
const Application = require('../models/Application');
const { upsertAdmin } = require('./seedAdmin');
const { checkEligibility } = require('./eligibility');

const STUDENT_PASSWORD = 'Student@123';
const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (n, hour = 18) => {
  const d = new Date(Date.now() + n * DAY);
  d.setUTCHours(hour, 29, 0, 0);
  return d;
};

const students = [
  { name: 'Asha Rao', email: 'asha@college.edu', rollNumber: '21CS045', branch: 'CSE', cgpa: 8.4, backlogs: 0, graduationYear: 2027, phone: '9876543210' },
  { name: 'Rohan Mehta', email: 'rohan@college.edu', rollNumber: '21CS012', branch: 'CSE', cgpa: 9.1, backlogs: 0, graduationYear: 2027 },
  { name: 'Priya Nair', email: 'priya@college.edu', rollNumber: '21IS033', branch: 'ISE', cgpa: 7.8, backlogs: 0, graduationYear: 2027 },
  { name: 'Karthik Iyer', email: 'karthik@college.edu', rollNumber: '21EC021', branch: 'ECE', cgpa: 7.2, backlogs: 0, graduationYear: 2027 },
  { name: 'Sneha Kulkarni', email: 'sneha@college.edu', rollNumber: '21AI007', branch: 'AIML', cgpa: 8.9, backlogs: 0, graduationYear: 2027 },
  { name: 'Arjun Reddy', email: 'arjun@college.edu', rollNumber: '21ME040', branch: 'ME', cgpa: 6.8, backlogs: 1, graduationYear: 2027 },
  { name: 'Fatima Sheikh', email: 'fatima@college.edu', rollNumber: '21DS015', branch: 'DS', cgpa: 8.1, backlogs: 0, graduationYear: 2027 },
  { name: 'Vikram Singh', email: 'vikram@college.edu', rollNumber: '21EE009', branch: 'EEE', cgpa: 7.0, backlogs: 0, graduationYear: 2027 },
  { name: 'Ananya Das', email: 'ananya@college.edu', rollNumber: '21CS078', branch: 'CSE', cgpa: 6.4, backlogs: 2, graduationYear: 2027 },
  { name: 'Meera Pillai', email: 'meera@college.edu', rollNumber: '21IS051', branch: 'ISE', cgpa: 9.4, backlogs: 0, graduationYear: 2027 },
  { name: 'Rahul Verma', email: 'rahul@college.edu', rollNumber: '20CS030', branch: 'CSE', cgpa: 7.6, backlogs: 0, graduationYear: 2026 },
  { name: 'Divya Menon', email: 'divya@college.edu', rollNumber: '21CE011', branch: 'CE', cgpa: 7.4, backlogs: 0, graduationYear: 2027 },
];

const drives = [
  { key: 'infosys', companyName: 'Infosys', role: 'Systems Engineer', package: 6.5, location: 'Bengaluru', jobType: 'full-time',
    description: 'Full-time role with 4 months of training at the Mysuru campus. Online assessment followed by one technical + HR interview.',
    eligibility: { minCgpa: 6.5, branches: [], graduationYear: 2027, maxBacklogs: 0 }, deadline: daysFromNow(10), driveDate: daysFromNow(15, 4) },
  { key: 'tcs', companyName: 'TCS', role: 'Ninja Developer', package: 3.6, location: 'Pan-India', jobType: 'full-time',
    description: 'TCS National Qualifier Test based hiring. Candidates scoring above the Digital cut-off are considered for the Digital role.',
    eligibility: { minCgpa: 6.0, branches: [], graduationYear: 2027, maxBacklogs: 1 }, deadline: daysFromNow(1), driveDate: daysFromNow(5, 4) },
  { key: 'zoho', companyName: 'Zoho', role: 'Member Technical Staff', package: 8.4, location: 'Chennai', jobType: 'full-time',
    description: 'Written programming round, two technical rounds and an HR discussion. Strong problem-solving in any language expected.',
    eligibility: { minCgpa: 7.5, branches: ['CSE', 'ISE', 'AIML', 'DS'], graduationYear: 2027, maxBacklogs: 0 }, deadline: daysFromNow(3), driveDate: daysFromNow(8, 4) },
  { key: 'google', companyName: 'Google', role: 'Software Engineering Intern', package: 14.4, location: 'Hyderabad', jobType: 'internship',
    description: '12-week summer internship. Two technical interviews focused on data structures and algorithms.',
    eligibility: { minCgpa: 8.5, branches: ['CSE', 'ISE', 'AIML'], graduationYear: 2027, maxBacklogs: 0 }, deadline: daysFromNow(20), driveDate: daysFromNow(27, 4) },
  { key: 'bosch', companyName: 'Bosch', role: 'Graduate Engineer Trainee', package: 5.5, location: 'Bengaluru', jobType: 'full-time',
    description: 'Core engineering role across automotive and industrial technology divisions.',
    eligibility: { minCgpa: 6.5, branches: ['ME', 'EEE', 'ECE'], graduationYear: 2027, maxBacklogs: 1 }, deadline: daysFromNow(6), driveDate: daysFromNow(12, 4) },
  { key: 'wipro', companyName: 'Wipro', role: 'Project Engineer', package: 3.5, location: 'Pan-India', jobType: 'full-time',
    description: 'Elite National Talent Hunt. Online assessment, then a combined technical and HR interview.',
    eligibility: { minCgpa: 6.0, branches: [], graduationYear: 2027, maxBacklogs: 0 }, deadline: daysFromNow(-10), driveDate: daysFromNow(2, 4) },
  { key: 'accenture', companyName: 'Accenture', role: 'Associate Software Engineer', package: 4.5, location: 'Pune', jobType: 'full-time',
    description: 'Cognitive and technical assessment, coding round and a communication assessment.',
    eligibility: { minCgpa: 6.0, branches: [], graduationYear: null, maxBacklogs: 1 }, deadline: daysFromNow(-12), driveDate: daysFromNow(-6, 4) },
  { key: 'deloitte', companyName: 'Deloitte', role: 'Analyst', package: 7.6, location: 'Hyderabad', jobType: 'full-time', status: 'closed',
    description: 'Consulting analyst role. Aptitude, group discussion and partner interview.',
    eligibility: { minCgpa: 7.0, branches: [], graduationYear: null, maxBacklogs: 0 }, deadline: daysFromNow(-30), driveDate: daysFromNow(-24, 4) },
];

// [studentEmail, driveKey, finalStage, rejectedAfter?, notes?]
const applications = [
  ['asha@college.edu', 'infosys', 'applied', null, 'Revise OOP pillars and SQL joins. Infosys asks a lot of puzzles in the HR round.'],
  ['asha@college.edu', 'wipro', 'aptitude', null, 'Aptitude on drive day. Practise time-speed-distance and essay writing.'],
  ['asha@college.edu', 'accenture', 'interview', null, 'Prepare final-year project explanation (2 min). Revise OS scheduling + DBMS normalisation.'],
  ['asha@college.edu', 'deloitte', 'offer', null, 'Offer received! Joining date to be confirmed by HR.'],
  ['rohan@college.edu', 'infosys', 'applied'],
  ['rohan@college.edu', 'zoho', 'applied'],
  ['rohan@college.edu', 'google', 'applied', null, 'Grind LeetCode mediums: graphs and DP. Mock interview with seniors on Friday.'],
  ['rohan@college.edu', 'accenture', 'offer'],
  ['rohan@college.edu', 'deloitte', 'rejected', 'interview'],
  ['priya@college.edu', 'wipro', 'aptitude'],
  ['priya@college.edu', 'accenture', 'rejected', 'aptitude'],
  ['priya@college.edu', 'deloitte', 'offer'],
  ['karthik@college.edu', 'wipro', 'rejected', 'applied'],
  ['karthik@college.edu', 'accenture', 'interview'],
  ['karthik@college.edu', 'deloitte', 'rejected', 'aptitude'],
  ['sneha@college.edu', 'google', 'applied'],
  ['sneha@college.edu', 'zoho', 'applied'],
  ['sneha@college.edu', 'deloitte', 'offer'],
  ['arjun@college.edu', 'accenture', 'aptitude'],
  ['fatima@college.edu', 'wipro', 'aptitude'],
  ['fatima@college.edu', 'accenture', 'offer'],
  ['fatima@college.edu', 'deloitte', 'rejected', 'interview'],
  ['vikram@college.edu', 'bosch', 'applied'],
  ['vikram@college.edu', 'wipro', 'rejected', 'aptitude'],
  ['vikram@college.edu', 'accenture', 'interview'],
  ['meera@college.edu', 'google', 'applied'],
  ['meera@college.edu', 'deloitte', 'offer'],
  ['rahul@college.edu', 'accenture', 'interview'],
  ['divya@college.edu', 'wipro', 'aptitude'],
];

const REMARKS = {
  aptitude: 'Shortlisted for the online aptitude test',
  interview: 'Cleared aptitude. Interview slot will be shared by email',
  offer: 'Selected. Offer letter sent to registered email',
  rejected: 'Not shortlisted in this round',
};

function buildHistory(finalStage, rejectedAfter, start, studentId, adminId) {
  const path = ['applied', 'aptitude', 'interview', 'offer'];
  const lastReached = finalStage === 'rejected' ? rejectedAfter : finalStage;
  const stages = path.slice(0, path.indexOf(lastReached) + 1);
  if (finalStage === 'rejected') stages.push('rejected');

  return stages.map((stage, i) => ({
    stage,
    changedAt: new Date(start.getTime() + i * 2 * DAY),
    changedBy: stage === 'applied' ? studentId : adminId,
    remark: REMARKS[stage] || '',
  }));
}

async function seed() {
  await Promise.all([User.deleteMany({}), Drive.deleteMany({}), Application.deleteMany({})]);

  const admin = await upsertAdmin({
    email: process.env.ADMIN_SEED_EMAIL || 'officer@college.edu',
    password: process.env.ADMIN_SEED_PASSWORD || 'Officer@123',
  });

  const passwordHash = await User.hashPassword(STUDENT_PASSWORD);
  const studentDocs = await User.insertMany(students.map((s) => ({ ...s, role: 'student', passwordHash })));
  const studentByEmail = Object.fromEntries(studentDocs.map((s) => [s.email, s]));

  const driveDocs = await Drive.insertMany(drives.map(({ key, ...d }) => ({ ...d, createdBy: admin._id })));
  const driveByKey = Object.fromEntries(drives.map((d, i) => [d.key, driveDocs[i]]));

  const appDocs = applications.map(([email, key, stage, rejectedAfter, notes = '']) => {
    const student = studentByEmail[email];
    const drive = driveByKey[key];
    if (!checkEligibility(student, drive).eligible) {
      throw new Error(`Seed data error: ${email} is not eligible for ${key}`);
    }
    const start = new Date(Math.min(drive.deadline.getTime(), Date.now()) - 6 * DAY);
    return {
      student: student._id,
      drive: drive._id,
      stage,
      notes,
      stageHistory: buildHistory(stage, rejectedAfter, start, student._id, admin._id),
    };
  });
  await Application.insertMany(appDocs);

  console.log(`Seeded 1 admin, ${studentDocs.length} students, ${driveDocs.length} drives, ${appDocs.length} applications`);
  console.log(`  Admin:    ${admin.email} / ${process.env.ADMIN_SEED_PASSWORD || 'Officer@123'}`);
  console.log(`  Students: asha@college.edu (or any seeded email) / ${STUDENT_PASSWORD}`);
}

async function main() {
  if (env.isProduction && !process.argv.includes('--force')) {
    throw new Error('Refusing to wipe a production database. Use npm run seed:admin instead.');
  }
  await connectDB(env.mongoUri);
  await seed();
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
