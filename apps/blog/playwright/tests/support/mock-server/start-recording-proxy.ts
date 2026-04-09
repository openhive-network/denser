import { createRecordingProxy } from './recording-proxy';

const port = parseInt(process.argv[2] || '8200', 10);

async function main() {
  const handle = await createRecordingProxy('api.hive.blog', port);

  const shutdown = async () => {
    console.log(`\n[recording-proxy] Shutting down... (${handle.recordedCount()} entries)`);
    await handle.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[recording-proxy] Failed to start:', err);
  process.exit(1);
});
