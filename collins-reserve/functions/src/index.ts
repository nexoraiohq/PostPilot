import { onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { app, runDue } from './app'

export const api = onRequest(
  { region: 'us-central1', timeoutSeconds: 540, memory: '512MiB', cors: false },
  app,
)

export const scheduler = onSchedule(
  { region: 'us-central1', schedule: 'every 1 minutes', timeoutSeconds: 300 },
  async () => {
    const result = await runDue()
    logger.info('scheduler tick', result)
  },
)
