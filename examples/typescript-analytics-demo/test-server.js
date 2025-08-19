// Quick test to see if the server functions work
import { calculateMetric } from './src/actions/analytics-all.server.ts';

async function test() {
  try {
    const result = await calculateMetric('user_count_daily', {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString()
    });
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();