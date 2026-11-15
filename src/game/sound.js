const effects = {
  click: ['triangle', [[530, 0, .055]]],
  attack: ['triangle', [[298, 0, .065, 650]]],
  jump: ['sine', [[370, 0, .12, 630]]],
  coin: ['triangle', [[785, 0, .07], [1175, .06, .125], [1568, .115, .1]]],
  stomp: ['triangle', [[205, 0, .12, 102], [350, .037, .09, 260]]],
  block: ['triangle', [[780, 0, .06, 520], [320, .04, .14, 200]]],
  warning: ['sine', [[480, 0, .09], [600, .13, .09]]],
  hazard: ['triangle', [[235, 0, .09, 157]]],
  electric: ['square', [[360, 0, .075, 850], [200, .06, .09, 410]]],
  laserCharge: ['sine', [[275, 0, .19, 640], [410, .13, .16, 840]]],
  laserFire: ['triangle', [[950, 0, .13, 355]]],
  saw: ['triangle', [[95, 0, .25, 145], [160, .09, .16, 105]]],
  fire: ['triangle', [[112, 0, .23, 226], [290, .11, .12, 180]]],
  poison: ['sine', [[287, 0, .12, 412], [204, .06, .17, 133]]],
  charge: ['triangle', [[190, 0, .12, 230], [265, .12, .09, 315]]],
  impact: ['triangle', [[120, 0, .19, 55]]],
  bossHit: ['square', [[176, 0, .08, 95], [470, .035, .07, 340]]],
  bossWarning: ['triangle', [[165, 0, .16], [208, .22, .16]]],
  bossStrike: ['triangle', [[187, 0, .18, 75], [470, .05, .16, 180]]],
  bossOpen: ['sine', [[438, 0, .09], [657, .07, .13]]],
  bossPhase: ['triangle', [[185, 0, .15], [247, .16, .15], [370, .32, .22]]],
  bossDefeat: ['triangle', [[311, 0, .19, 155], [523, .18, .12], [698, .30, .22]]],
  respawn: ['triangle', [[290, 0, .13, 175], [137, .07, .16, 72]]],
  checkpoint: ['triangle', [[523, 0, .08], [659, .08, .09], [880, .16, .16]]],
  finish: ['triangle', [[523, 0, .14], [659, .13, .14], [784, .26, .16], [1047, .41, .29]]],
  victory: ['triangle', [[523, 0, .18], [784, .16, .18], [659, .33, .2], [1047, .51, .53], [392, .51, .5]]],
};

// Original eight-beat arrangements built from scale offsets. Rests leave room for trap cues.
const tracks = {
  verdant: [261.63, .39, [0, 4, 7, null, 9, 7, 4, 2]],
  canyon: [220, .43, [0, null, 3, 7, 8, 7, null, 3]],
  crystal: [293.66, .47, [12, 7, 4, null, 2, 9, 7, null]],
  fire: [196, .31, [0, 7, null, 3, 0, 10, 7, null]],
  castle: [164.81, .42, [0, null, 7, 6, 3, null, 10, 7]],
  jungle: [220, .36, [0, 5, 3, null, 10, 8, 5, 3]],
  thunder: [185, .29, [0, 12, 7, null, 2, 8, 10, null]],
};

export function createSound(Audio = globalThis.AudioContext ?? globalThis.webkitAudioContext) {
  let context;
  let sfx;
  let music;
  let enabled = true;
  let effectsLevel = 1;
  let musicLevel = .45;
  let track;
  let clock;
  let nextBeat;
  let step = 0;
  const effectVoices = new Set();
  const musicVoices = new Set();
  const lastEffect = new Map();

  function voice(bus, voices, wave, pitch, start, length, endPitch, peak) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(pitch, start);
    if (endPitch) oscillator.frequency.exponentialRampToValueAtTime(endPitch, start + length);
    envelope.gain.setValueAtTime(.001, start);
    envelope.gain.exponentialRampToValueAtTime(peak, start + .016);
    envelope.gain.exponentialRampToValueAtTime(.001, start + length);
    oscillator.connect(envelope);
    envelope.connect(bus);
    oscillator.onended = () => {
      voices.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    };
    voices.add(oscillator);
    oscillator.start(start);
    oscillator.stop(start + length + .012);
  }

  function stopMusic() {
    clearInterval(clock);
    clock = undefined;
    for (const note of musicVoices) note.stop();
    musicVoices.clear();
  }

  function scheduleMusic() {
    if (context.state !== 'running' || globalThis.document?.hidden) return;
    const [root, beat, notes] = tracks[track];
    if (nextBeat < context.currentTime) nextBeat = context.currentTime + .035;
    while (nextBeat <= context.currentTime + .19) {
      const note = notes[step];
      if (note !== null) voice(music, musicVoices, 'triangle', root * 2 ** (note / 12), nextBeat, beat * .79, 0, .082);
      if (step % 4 === 0) {
        voice(music, musicVoices, 'sine', root * (step === 4 ? .375 : .5), nextBeat, beat * 1.9, 0, .095);
      }
      nextBeat += beat;
      step = (step + 1) % notes.length;
    }
  }

  function syncMusic() {
    if (!enabled || !musicLevel || !tracks[track] || context?.state !== 'running' || globalThis.document?.hidden) {
      stopMusic();
    } else if (clock === undefined) {
      nextBeat = context.currentTime + .045;
      scheduleMusic();
      clock = setInterval(scheduleMusic, 100);
    }
  }

  function levels() {
    if (!context) return;
    sfx.gain.setTargetAtTime(enabled ? effectsLevel : 0, context.currentTime, .025);
    music.gain.setTargetAtTime(enabled ? musicLevel : 0, context.currentTime, .025);
  }

  return {
    unlock() {
      if (!Audio || !enabled) return;
      try {
        if (!context) {
          context = new Audio();
          sfx = context.createGain();
          music = context.createGain();
          const limiter = context.createDynamicsCompressor();
          limiter.threshold.value = -16;
          limiter.ratio.value = 8;
          sfx.connect(limiter);
          music.connect(limiter);
          limiter.connect(context.destination);
          levels();
        }
        if (context.state === 'suspended') context.resume().then(syncMusic).catch(() => {});
        else syncMusic();
      } catch {
        // Gameplay remains available on systems that restrict audio.
      }
    },
    configure(isEnabled, effectsPercent, musicPercent) {
      enabled = isEnabled;
      effectsLevel = effectsPercent;
      musicLevel = musicPercent;
      levels();
      syncMusic();
    },
    music(trackName) {
      if (track !== trackName) {
        stopMusic();
        track = trackName;
        step = 0;
      }
      syncMusic();
    },
    play(name) {
      if (!enabled || !effectsLevel || context?.state !== 'running' || !effects[name]) return;
      const now = context.currentTime;
      if (now - (lastEffect.get(name) ?? -Infinity) < .10) return;
      const [wave, notes] = effects[name];
      lastEffect.set(name, now);
      for (const [pitch, delay, length, endPitch] of notes) {
        if (effectVoices.size >= 16) break;
        voice(sfx, effectVoices, wave, pitch, now + delay, length, endPitch, wave === 'square' ? .069 : .123);
      }
    },
  };
}
