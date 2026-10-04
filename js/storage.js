// Safe wrappers around localStorage / sessionStorage. Private browsing, in-app
// browsers (Instagram) and blocked site data can make every access throw, so
// each call swallows errors and falls back.

export function makeStore(getBackend) {
  return {
    get(key, fallback) {
      try {
        const raw = getBackend().getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        getBackend().setItem(key, JSON.stringify(value));
      } catch {
        /* storage unavailable — preference simply isn't remembered */
      }
    },
  };
}

export const store = makeStore(() => globalThis.localStorage);
export const session = makeStore(() => globalThis.sessionStorage);
