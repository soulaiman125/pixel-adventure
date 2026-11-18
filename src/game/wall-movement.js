export const WALL_FALL = 70;
export const WALL_JUMP_SPEED = 224;
export const WALL_LOCK = 145;

export function wallSide(body, walls, direction) {
  if (!direction || body.velocity?.x * direction < -6) return 0;
  return walls?.getChildren().some(({ body: wall }) =>
    body.bottom > wall.top + 2 && body.top < wall.bottom - 2 &&
    Math.abs(direction < 0 ? body.left - wall.right : body.right - wall.left) <= 3) ? direction : 0;
}

export function canWallJump(state, side, buffered) {
  return Boolean(side && buffered && !state.wallJumpUsed && !state.dash && !state.special && !state.attack?.dive);
}
