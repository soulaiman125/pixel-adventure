const palettes = {
  verdant: ['#4b9486', '#68b099', '#a1d091'],
  canyon: ['#9f536d', '#ce776e', '#f0a77c'],
  crystal: ['#56769b', '#84baca', '#c1e4ee'],
  fire: ['#613951', '#9a5464', '#f58a54'],
  castle: ['#413557', '#635375', '#d29bb0'],
  jungle: ['#405953', '#67856d', '#a3b77a'],
  thunder: ['#3b486c', '#5b7293', '#8bbbc9'],
};

// Drawn once per world into the existing foreground parallax texture.
export function drawLandmarks(ctx, theme) {
  const [shadow, middle, light] = palettes[theme];
  const rect = (color, x, y, w, h) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  const tower = (x, y, w, h) => {
    rect(shadow, x, y, w, h);
    rect(middle, x + 3, y + 4, Math.round(w / 3), h - 4);
    for (let row = y + 14; row < y + h - 6; row += 11) rect(shadow, x + 2, row, w - 4, 1);
  };
  for (const [x, y] of [[55, 153], [210, 143], [372, 158], [563, 140], [684, 150]]) {
    if (theme === 'verdant') {
      rect(shadow, x + 16, y + 8, 7, 35);
      for (let tier = 0; tier < 5; tier++) {
        rect(tier % 2 ? middle : shadow, x + 15 - tier * 4, y - 10 + tier * 5, 9 + tier * 8, 7);
        rect(light, x + 17 - tier * 4, y - 10 + tier * 5, 7 + tier * 2, 1);
      }
    } else if (theme === 'canyon' || theme === 'fire') {
      for (let tier = 0; tier < 8; tier++) {
        rect(shadow, x + 16 - tier * 2, y - 8 + tier * 4, 21 + tier * 4, 8);
        rect(tier % 3 ? middle : light, x + 18 - tier * 2, y - 8 + tier * 4, 12 + tier * 3, 2);
      }
      if (theme === 'fire') for (let i = 0; i < 4; i++) rect(light, x + 24 + i * 5, y - 11 - i * 5, 2, 2);
    } else if (theme === 'crystal') {
      for (const [dx, size] of [[0, 10], [15, 19], [29, 12]]) {
        for (let step = 0; step < size; step++) {
          const wide = Math.min(9, step + 1);
          rect(shadow, x + dx, y - size + step * 2, wide, 2);
          rect(step % 2 ? light : middle, x + dx, y - size + step * 2, 2, 2);
        }
      }
    } else if (theme === 'castle' || theme === 'thunder') {
      tower(x, y - 9, 26, 46);
      tower(x + 31, y + 4, 18, 31);
      rect(shadow, x + 24, y + 16, 8, 4);
      for (let n = 0; n < 3; n++) {
        rect(middle, x + n * 9, y - 15, 6, 8);
        rect(light, x + 5 + n * 7, y + 1, theme === 'castle' ? 2 : 5, theme === 'castle' ? 9 : 2);
      }
      if (theme === 'thunder') rect(light, x + 13, y - 24, 2, 13);
    } else {
      tower(x, y + 4, 13, 30);
      tower(x + 30, y + 7, 16, 26);
      rect(shadow, x + 9, y, 26, 9);
      rect(light, x + 21, y + 6, 2, 14);
      for (const offset of [-4, 18, 38]) {
        rect(shadow, x + offset + 4, y + 17, 3, 12);
        rect(middle, x + offset, y + 15, 10, 5);
        rect(light, x + offset + 2, y + 14, 5, 2);
      }
    }
  }
}
