const SENSITIVE = /(secret|private|seed|mnemonic|password|api[_-]?key|authorization)/i;

function redact(value) {
  if (value == null) return value;
  if (typeof value === "string") {
    if (SENSITIVE.test(value) && value.length > 12) return "[REDACTED]";
    return value;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE.test(k) ? "[REDACTED]" : redact(v);
    }
    return out;
  }
  return value;
}

function write(level, message, meta) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: redact(meta) } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message, meta) => write("info", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  error: (message, meta) => write("error", message, meta),
  debug: (message, meta) => {
    if (process.env.LOG_LEVEL === "debug") write("debug", message, meta);
  },
};
