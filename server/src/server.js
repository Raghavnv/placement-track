require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

// TODO (feature/backend-api): connect to MongoDB (src/config/db.js) before listening.
app.listen(PORT, () => {
  console.log(`PlacementTrack API listening on http://localhost:${PORT}`);
});
