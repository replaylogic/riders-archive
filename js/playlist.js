// The saloon's records. Mostly slow guitar for the lone rider at dusk, one
// honky-tonk rag so the room has some life. Credits: audio/CREDITS.md.

export const TRACKS = [
  { src: 'audio/ode-to-a-spanish-cowboy.mp3', title: 'Ode to a Spanish Cowboy', artist: 'TokyoRifft' },
  { src: 'audio/halloway-ridge.mp3', title: 'Halloway Ridge Theme', artist: 'sonofevan' },
  { src: 'audio/seven-horsemen.mp3', title: 'Seven Horsemen for Freedom', artist: 'Phisigma' },
  { src: 'audio/tap-room-rag.mp3', title: 'Tap Room Rag', artist: 'geoffharvey' },
];

// Shuffle per cycle (Fisher–Yates); a new cycle never opens with the track that just ended.
export function makeShuffle(items, rng = Math.random) {
  let queue = [];
  let last;
  const refill = () => {
    queue = [...items];
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    if (queue.length > 1 && queue[0] === last) [queue[0], queue[1]] = [queue[1], queue[0]];
  };
  return {
    next() {
      if (!queue.length) refill();
      last = queue.shift();
      return last;
    },
  };
}
