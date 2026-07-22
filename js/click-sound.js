// Synthesizes a mechanical button "click" using the Web Audio API so the app
// ships with zero binary audio assets. Deliberately avoids a tonal
// oscillator sweep (reads as a sci-fi UI blip) in favor of a short filtered
// noise burst for the sharp "tick" plus a low sine "thock" underneath for
// body weight — the same recipe used to fake a physical switch click.
const ClickSound = (() => {
  let ctx = null;

  function getContext() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function play() {
    // Never let an audio failure (no AudioContext, autoplay policy, etc.)
    // block the caller — the display must still update even if the click
    // can't be heard.
    try {
      playInternal();
    } catch (err) {
      /* silent: audio is a nice-to-have, not required for the app to work */
    }
  }

  function playInternal() {
    const audioCtx = getContext();
    const now = audioCtx.currentTime;

    // Sharp broadband tick: filtered white noise, no pitch content.
    const tickDuration = 0.018;
    const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * tickDuration));
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3200;
    filter.Q.value = 0.9;

    const tickGain = audioCtx.createGain();
    tickGain.gain.setValueAtTime(0.5, now);
    tickGain.gain.exponentialRampToValueAtTime(0.0001, now + tickDuration);

    noise.connect(filter);
    filter.connect(tickGain);
    tickGain.connect(audioCtx.destination);
    noise.start(now);
    noise.stop(now + tickDuration);

    // Low thock underneath, giving the tick some mechanical weight.
    const thock = audioCtx.createOscillator();
    thock.type = 'sine';
    thock.frequency.setValueAtTime(180, now);
    thock.frequency.exponentialRampToValueAtTime(90, now + 0.02);

    const thockGain = audioCtx.createGain();
    thockGain.gain.setValueAtTime(0.22, now);
    thockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

    thock.connect(thockGain);
    thockGain.connect(audioCtx.destination);
    thock.start(now);
    thock.stop(now + 0.03);
  }

  return { play };
})();
