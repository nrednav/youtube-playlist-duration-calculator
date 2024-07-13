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
  debug = (() => {
    try {
      const url = new URL(window.location.href);

      if (url.searchParams.has("ytpdc-debug", "true")) {
        return this.logWithPrefix(console.debug);
      } else {
        return () => {};
      }
    } catch (error) {
      this.error(error.message);
      return () => {};
    }
  })();
  warn = this.logWithPrefix(console.warn);
  error = this.logWithPrefix(console.error);
}

export const logger = Logger.getInstance();
