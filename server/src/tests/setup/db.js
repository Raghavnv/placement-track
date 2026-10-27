const crypto = require('crypto');
const mongoose = require('mongoose');

beforeAll(async () => {
  const dbName = `test-${crypto.randomBytes(4).toString('hex')}`;
  await mongoose.connect(process.env.MONGO_TEST_URI, { dbName });
  // Build unique indexes before tests rely on them.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
