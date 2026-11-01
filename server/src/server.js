const http = require('http');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const app = require('./app');
const sockets = require('./sockets');
const reminderJob = require('./jobs/reminderJob');
const slotGenerationJob = require('./jobs/slotGenerationJob');
const { generateSlots, ensureDefaultTemplates } = require('./services/slotService');

async function main() {
  await connectDB();
  await ensureDefaultTemplates();
  await generateSlots(7); // make sure today's slots exist on boot
  const server = http.createServer(app);
  sockets.init(server);
  reminderJob.start();
  slotGenerationJob.start();
  server.listen(env.port, () => console.log(`SlotDrop API on :${env.port}`));
}

main().catch((err) => { console.error(err); process.exit(1); });
