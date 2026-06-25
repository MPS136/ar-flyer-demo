// Sonido procedural (sin ficheros) para el revelado del cerebro.
// init() en un gesto de usuario (politica de autoplay). Degrada en silencio.
export function createBrainAudio() {
  let ctx = null, master = null, hum = null, humGain = null;
  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 1.0; master.connect(ctx.destination);
    hum = ctx.createOscillator(); hum.type = "sine"; hum.frequency.value = 60;
    humGain = ctx.createGain(); humGain.gain.value = 0.0;
    hum.connect(humGain); humGain.connect(master); hum.start();
  }
  function setMorph(p) {
    if (!ctx) return;
    humGain.gain.setTargetAtTime(0.08 * p, ctx.currentTime, 0.1);
    hum.frequency.setTargetAtTime(60 + 40 * p, ctx.currentTime, 0.2);
  }
  function whoosh() {
    if (!ctx) return;
    const dur = 0.5;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "lowpass";
    f.frequency.setValueAtTime(400, ctx.currentTime);
    f.frequency.linearRampToValueAtTime(4500, ctx.currentTime + dur);
    const g = ctx.createGain(); g.gain.value = 0.22;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  function chime() {
    if (!ctx) return;
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = 880;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + 0.5);
  }
  return { init, setMorph, whoosh, chime, get ready() { return !!ctx; } };
}
