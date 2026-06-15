import '@testing-library/jest-dom';
import { beforeAll, afterAll } from 'vitest';

// Silence console.error in tests to keep output clean
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] ?? '');
    if (
      msg.includes('Warning:') ||
      msg.includes('ReactDOM.render') ||
      msg.includes('act(')
    ) return;
    originalError(...args);
  };
});
afterAll(() => {
  console.error = originalError;
});
