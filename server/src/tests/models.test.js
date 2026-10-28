const User = require('../models/User');
const Drive = require('../models/Drive');
const Application = require('../models/Application');

const studentData = {
  name: 'Asha Rao',
  email: 'ASHA@College.edu',
  role: 'student',
  rollNumber: '21cs045',
  branch: 'CSE',
  cgpa: 8.4,
  graduationYear: 2027,
};

describe('models', () => {
  it('normalises student fields and hides the password hash in JSON', async () => {
    const user = await User.create({ ...studentData, passwordHash: await User.hashPassword('Str0ngPass!') });
    expect(user.email).toBe('asha@college.edu');
    expect(user.rollNumber).toBe('21CS045');
    expect(user.backlogs).toBe(0);
    expect(user.toJSON().passwordHash).toBeUndefined();

    const withHash = await User.findById(user._id).select('+passwordHash');
    expect(await withHash.comparePassword('Str0ngPass!')).toBe(true);
    expect(await withHash.comparePassword('wrong')).toBe(false);
  });

  it('does not require student fields for admins', async () => {
    const admin = await User.create({ name: 'Officer', email: 'o@college.edu', role: 'admin', passwordHash: 'x' });
    expect(admin.rollNumber).toBeUndefined();
    expect(admin.backlogs).toBeUndefined();
  });

  it('rejects a drive date before the deadline', async () => {
    const drive = new Drive({
      companyName: 'Infosys',
      role: 'SE',
      package: 6,
      jobType: 'full-time',
      deadline: new Date('2030-01-10'),
      driveDate: new Date('2030-01-05'),
      createdBy: '6650f1c2a1b2c3d4e5f60000',
    });
    await expect(drive.validate()).rejects.toThrow('Drive date must be on or after the deadline');
  });

  it('enforces one application per student per drive', async () => {
    const ids = { student: '6650f1c2a1b2c3d4e5f60001', drive: '6650f1c2a1b2c3d4e5f60101' };
    await Application.create(ids);
    await expect(Application.create(ids)).rejects.toMatchObject({ code: 11000 });
  });
});
