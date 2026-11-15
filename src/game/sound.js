const melodies = {
  click: [[530, 0, 0.055]],
  attack: [[298, 0, 0.065, 650]],
  jump: [[370, 0, 0.08, 545]],
  coin: [[785, 0, 0.07], [1175, 0.06, 0.125]],
  stomp: [[205, 0, 0.12, 102]],
  block: [[780, 0, .06, 520], [320, .04, .14, 200]],
  warning: [[480, 0, .09], [600, .13, .09]],
  hazard: [[235, 0, .09, 157]],
  electric: [[360, 0, .09, 850], [200, .07, .09, 410]],
  bossDefeat: [[311, 0, .19, 155], [523, .18, .12], [698, .30, .22]],
  respawn: [[290, 0, 0.13, 175]],
  checkpoint: [[523, 0, 0.08], [659, 0.08, 0.09], [880, 0.16, 0.16]],
  finish: [[523, 0, 0.14], [659, 0.13, 0.14], [784, 0.26, 0.16], [1047, 0.41, 0.29]],
};

export function createSound() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  let context;
  let output;
  let enabled = true;
  let volume = 1;

  return {
    unlock() {
      if (!Audio || !enabled) return;
      try {
        if (!context) {
          context = new Audio();
          output = context.createGain();
          output.gain.value = volume;
          output.connect(context.destination);
        }
        if (context.state === 'suspended') context.resume().catch(() => {});
      } catch {
        // The game can run in browsers that restrict audio.
      }
    },
    configure(isEnabled, level) {
      enabled = isEnabled;
      volume = level;
      if (output) output.gain.value = enabled ? volume : 0;
    },
    play(name) {
      if (!enabled || context?.state !== 'running') return;
      for (const [pitch, delay, length, endPitch] of melodies[name]) {
        const start = context.currentTime + delay;
        const voice = context.createOscillator();
        const envelope = context.createGain();
        voice.type = 'triangle';
        voice.frequency.setValueAtTime(pitch, start);
        if (endPitch) voice.frequency.exponentialRampToValueAtTime(endPitch, start + length);
        envelope.gain.setValueAtTime(0.001, start);
        envelope.gain.exponentialRampToValueAtTime(0.14, start + 0.012);
        envelope.gain.exponentialRampToValueAtTime(0.001, start + length);
        voice.connect(envelope);
        envelope.connect(output);
        voice.start(start);
        voice.stop(start + length + 0.01);
        voice.onended = () => { voice.disconnect(); envelope.disconnect(); };
      }
    },
  };
}
