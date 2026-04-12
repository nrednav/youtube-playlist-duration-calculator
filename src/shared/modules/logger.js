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

  debug(label, data) {
    if (this.#debugEnabled) {
      const resolved = typeof data === "function" ? data() : data;
      if (resolved !== undefined) {
        console.debug(this.prefix, label, resolved);
      } else {
        console.debug(this.prefix, label);
      }
    }
  }
}

export const logger = Logger.getInstance();
