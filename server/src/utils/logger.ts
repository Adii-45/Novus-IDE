const ts = () => new Date().toISOString().slice(11, 23);

export const logger = {
  info: (...args: unknown[]) => console.log(`\x1b[36m[${ts()}] info\x1b[0m`, ...args),
  warn: (...args: unknown[]) => console.warn(`\x1b[33m[${ts()}] warn\x1b[0m`, ...args),
  error: (...args: unknown[]) => console.error(`\x1b[31m[${ts()}] error\x1b[0m`, ...args),
};
