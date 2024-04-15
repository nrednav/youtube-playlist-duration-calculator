class Logger {
  static instance;

  constructor() {
    const { version } = chrome.runtime.getManifest();
    this.prefix = `YTPDC (v${version}):`;
  }

  static getInstance() {
    return Logger.instance ? Logger.instance : new Logger();
  }

  logWithPrefix(logMethod) {
    return (...args) => logMethod(this.prefix, ...args);
  }

  info = this.logWithPrefix(console.info);
  debug = this.logWithPrefix(console.debug);
  warn = this.logWithPrefix(console.warn);
  error = this.logWithPrefix(console.error);
}

export const logger = Logger.getInstance();
