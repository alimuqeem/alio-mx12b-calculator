// Synthesizes a short mechanical "click" using the Web Audio API so the app
// ships with zero binary audio assets.
const ClickSound = (() => {
  let ctx = null;

  function getContext() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function play() {
    const audioCtx = getContext();
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.02);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  return { play };
})();
