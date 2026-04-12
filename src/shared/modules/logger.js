class Logger {
  static instance;

  constructor() {
    const { version } = chrome.runtime.getManifest();
    this.prefix = `YTPDC (v${version}):`;
  }

  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  logWithPrefix(logMethod) {
    return (...args) => logMethod(this.prefix, ...args);
  }

  info = this.logWithPrefix(console.info);
  warn = this.logWithPrefix(console.warn);
  error = this.logWithPrefix(console.error);

  debug(...args) {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("ytpdc-debug", "true")) {
        console.debug(this.prefix, ...args);
      }
    } catch (error) {
      this.error("debug_check_failed", error.message);
    }
  }
}

export const logger = Logger.getInstance();
