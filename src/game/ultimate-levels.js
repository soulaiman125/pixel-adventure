const encounters = {
  17: { 0:'shadowRival' },
  22: { 1:'nightHunter' },
  28: { 0:'ironGuardian' },
};

const secrets = {
  1:{ id:'grove', clue:'Red leaves mark ledges behind the start.', x:27, y:92, ledges:[[14,147,29],[13,108,30]], wall:[0,99,12,85] },
  19:{ id:'shrine', clue:'Violet lanterns mark ledges behind the gate.', x:23, y:89, ledges:[[13,144,19],[13,105,19]], wall:[0,92,12,92] },
};

export function ultimateLevel(level, index) {
  const secret = secrets[index + 1];
  const swaps = encounters[index + 1];
  return {
    ...level,
    enemies: swaps ? level.enemies.map((enemy, i) => swaps[i] ? [...enemy.slice(0,3),swaps[i]] : enemy) : level.enemies,
    platforms: secret ? [...level.platforms,...secret.ledges] : level.platforms,
    solidWalls: secret ? [...(level.solidWalls ?? []),secret.wall] : level.solidWalls,
    secret,
  };
}

export const SURVIVAL_LEVEL = {
  name:'Moonlit Watch', theme:'castle', survival:true, width:456, spawnX:228, flagX:450,
  ground:[[0,456]], platforms:[[76,145,59],[314,145,62],[191,118,74]],
  solidWalls:[[0,102,10,82],[446,102,10,82]], hazards:[], coins:[],
  trees:[[25,.65],[413,.6]],
  enemies:['shadowRival','ironGuardian','nightHunter'].flatMap(type =>
    Array.from({length:3}, (_,i) => [56+i*28,84,28,type])),
};

export function waveComposition(wave) {
  if (wave % 3 === 0) return ['ironGuardian','shadowRival',...(wave >= 6 ? ['nightHunter'] : [])];
  const types = ['shadowRival','nightHunter','ironGuardian'];
  return Array.from({length:Math.min(6,2+Math.floor(wave/2))},(_,i)=>types[(wave+i) % types.length]);
}

export function createSurvival(scene) {
  const run = { wave:0, score:0, until:1150, health:3 };
  const enemies = scene.enemies.getChildren();
  for (const enemy of enemies) enemy.disableBody(true,true);
  const show = message => scene.ui.onSurvival?.(run,message);
  show('Prepare for Wave 1');
  return {
    run,
    update() {
      if (scene.complete || enemies.some(enemy=>enemy.active)) return;
      if (run.until === null) {
        scene.clearProjectiles();
        run.score += run.wave * 100;
        run.until = scene.elapsed + 1600;
        run.health = Math.min(3,run.health + Number(run.wave % 3 === 0));
        show(`Wave ${run.wave} cleared`);
      }
      if (scene.elapsed < run.until) return;
      run.wave++;
      run.until = null;
      const roster = waveComposition(run.wave);
      for (const [i,type] of roster.entries()) {
        const enemy = enemies.find(candidate=>!candidate.active && candidate.getData('type')===type);
        const x = i % 2 ? 367-i*6 : 72+i*10;
        const homeY = type === 'nightHunter' ? 144 : 184;
        enemy.enableBody(true,x,homeY,true,true).setAlpha(1).setVelocity(0,0);
        enemy.setData({left:Math.max(13,x-56),right:Math.min(443,x+55),homeY,shadowHitUntil:0,shadowStaggerReady:0,
          ultimateState:{ phase:'recover', until:scene.elapsed+720, facing:i % 2 ? -1 : 1 },
          captain:run.wave%3===0 && i===0});
        scene.ninja.enemyHp.delete(enemy);
      }
      show(run.wave % 3 === 0 ? `Wave ${run.wave} · Guardian Captain` : `Wave ${run.wave}`);
    },
    defeat() { run.score += 75; show(); },
    hurt() {
      run.health--;
      show();
      return run.health === 0;
    },
    cleared:() => run.wave - Number(run.until === null),
  };
}
