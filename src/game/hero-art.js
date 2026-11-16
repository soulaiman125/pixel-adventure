export const costumes = {
  scout: ['#613b50', '#cc6455', '#fba77e', '#ffd26d', '#4faba6'],
  ember: ['#612c46', '#df4c44', '#ffa062', '#ffa84f', '#d17676'],
  frost: ['#384885', '#618ece', '#b7e4ee', '#7bdccc', '#90a7df'],
  storm: ['#433464', '#856ac1', '#cab5fa', '#a6f7ee', '#6683c6'],
};

const head = [
  '.....ooooo......', '....oUHHHHoo....', '...oUHhHHHHoo...', '...oHHhHHHHHoo..',
  '...ohhhoooooooo.', '....ooosssswwo..', '....oosssswseo..', '....ooSsssssSo..',
  '.....ooSSSSoo...',
];
const legs = {
  idle: ['.....oboboo.....','.....oboboo.....','.....oboboo.....','....oBBBooBo....','....ooooooo.....'],
  step: ['.....obBboo.....','....obo..obbo...','...oboo...obo...','..oBBo....oBBo..','..ooo.....oooo..'],
  stride: ['.....obbboo.....','......oboBo.....','.....obooBo.....','....oBBo.ooo....','....oooo........'],
  accelerate: ['.....obbboo.....','.....ob..ob.....','....ob...obo....','..oBBo....oBBo..','..ooo.....oooo..'],
  brake: ['.....oboboo.....','....obo..obo....','...oBo...oBBo...','...ooo....ooo...','................'],
  launch: ['.....oboboo.....','......obbBo.....','.....oBBoBo.....','.....oooooo.....','................'],
  jump: ['.....obbboo.....','....ob..oBBo....','...oBBo.oooo....','...ooo..........','................'],
  fall: ['.....obbboo.....','....obo..obo....','....oBo...oBo...','....ooo...ooo...','................'],
  land: ['................','.....obbbo......','....ooBBboo.....','...oBBo.oBBo....','...oooo.oooo....'],
  attack: ['.....obbboo.....','....obo..obo....','...oboo...obo...','..oBBo....oBBo..','..ooo.....oooo..'],
  hurt: ['.....oboboo.....','.....oboobb.....','....oo..oBBo....','....ooo.oooo....','................'],
  respawn: ['.....oboboo.....','.....oboboo.....','.....oboboo.....','....oBBBooBo....','....ooooooo.....'],
  victory: ['.....oboboo.....','.....oboboo.....','.....oboboo.....','....oBBBooBo....','....ooooooo.....'],
};

export function drawHeroSprite(ctx, pose, costume) {
  const [h, H, U, g, B] = costumes[costume];
  const colors = { h, H, U, g, B, o: '#1f2234', s: '#ffce97', S: '#b87769', w: '#fff1ce',
    e: '#29243a', b: '#31546d', a: '#b7e7ed' };
  const paint = (rows, ox, oy) => rows.forEach((row, y) => [...row].forEach((pixel, x) => {
    if (!colors[pixel]) return;
    ctx.fillStyle = colors[pixel];
    ctx.fillRect(ox + x, oy + y, 1, 1);
  }));
  const low = pose === 'land' || pose === 'brake' ? 2 : pose === 'hurt' ? 1 : 0;
  paint(head, 0, 1 + low);
  paint(['....ogggggho....','..ogggoBBaBoo...','..og..oBBBBbo...','......oBbBBso...', '......obbbbo....'], 0, 10 + low);
  paint(legs[pose], 0, 16);
  if (['step', 'stride', 'accelerate', 'jump', 'launch'].includes(pose)) {
    paint(['ooo..', 'ogggg', '.ooh.'], 0, 10);
  }
  if (pose === 'attack') paint(['....wa','..aaao','sshoo.'], 10, 11);
  if (pose === 'victory') paint(['.a', 'wa', 'ao', 'go', 'so'], 13, 8);
}

export function heroPose(state) {
  const { time, grounded, vy, vx, direction, reduced, landing, swing, grace, launch, complete } = state;
  if (complete) return 'victory';
  if (time < swing) return 'attack';
  if (time < grace) return time < grace - 600 && !reduced ? 'hurt' : 'respawn';
  if (!grounded || vy < -30) return vy < 0 ? (time < launch ? 'launch' : 'jump') : 'fall';
  if (!reduced && time < landing) return 'land';
  if (Math.abs(vx) < 16) return 'idle';
  if (!direction || direction !== Math.sign(vx)) return 'brake';
  if (Math.abs(vx) < 65) return 'accelerate';
  return Math.floor(time / 84) % 2 ? 'step' : 'stride';
}

export function heroTexture(pose, costume) {
  return costume === 'scout' || !costumes[costume] ? 'hero-' + pose : `hero-${costume}-${pose}`;
}

export const heroPoses = Object.keys(legs);
