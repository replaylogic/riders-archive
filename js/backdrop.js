// Makes the page behind an overlay (doors, file sheet) inert while any overlay
// holds it, so one closing never re-enables the page under another.

export function makeBackdropLock(getTargets) {
  const holders = new Set();
  const apply = () => getTargets().forEach((el) => { el.inert = holders.size > 0; });
  return {
    hold(name) { holders.add(name); apply(); },
    release(name) { holders.delete(name); apply(); },
  };
}

export const backdrop = makeBackdropLock(() => document.querySelectorAll('#app, .dock'));
