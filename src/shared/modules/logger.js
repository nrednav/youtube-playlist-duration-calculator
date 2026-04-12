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

  #debugEnabled = (() => {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.has("ytpdc-debug", "true");
    } catch {
      return false;
    }
  })();

  debug(...args) {
    if (this.#debugEnabled) {
      console.debug(this.prefix, ...args);
    }
  }
}

export const logger = Logger.getInstance();
