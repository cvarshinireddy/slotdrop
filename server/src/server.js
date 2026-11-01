const http = require('http');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const app = require('./app');

async function main() {
  await connectDB();
  const server = http.createServer(app);
  server.listen(env.port, () => console.log(`SlotDrop API on :${env.port}`));
}

main().catch((err) => { console.error(err); process.exit(1); });
