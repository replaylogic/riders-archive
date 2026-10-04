// Share a link the best way this browser allows: the phone's share sheet,
// else the clipboard, else ask the caller to show the link for manual copy.
// Instagram's in-app browser often has neither API.

export function pickShareMethod(nav, url) {
  if (typeof nav?.share === 'function' && nav.canShare?.({ url }) !== false) return 'share';
  if (typeof nav?.clipboard?.writeText === 'function') return 'clipboard';
  return 'manual';
}

export async function shareLink(nav, { title, url }) {
  if (pickShareMethod(nav, url) === 'share') {
    try {
      await nav.share({ title, url });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  return copyText(nav, url);
}

export async function copyText(nav, text) {
  if (typeof nav?.clipboard?.writeText !== 'function') return 'manual';
  try {
    await nav.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'manual';
  }
}
