// Tiny WebAudio sound effects, synthesised on the spot: no sound files, no
// network. The context is created lazily on the first player gesture, so the
// game stays silent (and error-free) until someone actually plays.

export function createAudio() {
  let context = null;
  let enabled = true;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  /** Unlock audio from a user gesture; call from pointer/key handlers. */
  function unlock() {
    const ctx = ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function blip(freq, seconds, type, gainValue, slideTo) {
    if (!enabled) return;
    const ctx = ensure();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + seconds);
      gain.gain.setValueAtTime(gainValue, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + seconds + 0.02);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  return {
    unlock,
    toggle() {
      enabled = !enabled;
      return enabled;
    },
    get on() {
      return enabled;
    },
    /** Short knife chop when an ingredient lands on the plate. */
    chop() {
      blip(520, 0.07, 'square', 0.08);
      blip(260, 0.09, 'triangle', 0.06);
    },
    /** Sizzle pop when raw food hits the grill. */
    sizzle() {
      blip(1800, 0.12, 'sawtooth', 0.03, 900);
      blip(1200, 0.1, 'sawtooth', 0.025, 2400);
    },
    /** Happy ding when a dish is served. */
    ding() {
      blip(880, 0.12, 'sine', 0.12);
      setTimeout(() => blip(1318, 0.18, 'sine', 0.1), 90);
    },
    /** Low buzz for a wrong serve, a full plate or a burnt grill slot. */
    buzz() {
      blip(140, 0.22, 'sawtooth', 0.09, 90);
    },
    /** Soft pop when a cooked item comes off the grill. */
    pop() {
      blip(660, 0.08, 'sine', 0.09, 990);
    },
    /** Sad slide when a customer storms out. */
    walkout() {
      blip(330, 0.35, 'triangle', 0.08, 110);
    },
    /** Little fanfare when the shift ends. */
    fanfare() {
      blip(523, 0.12, 'sine', 0.1);
      setTimeout(() => blip(659, 0.12, 'sine', 0.1), 110);
      setTimeout(() => blip(784, 0.25, 'sine', 0.12), 220);
    },
  };
}
