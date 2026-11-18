export default async ({ level, bridges, timeout, dash = false }) => {
  const { hazardFrame, dangerHits } = await import("/src/game/danger.js");
  return new Promise((resolve) => {
    const s = window.qaScene;
    const keys = new Set();
    const events = [];
    let deaths = 0;
    let lastGrace = 0;
    let lastSwing = -Infinity;
    let mode = "ground";
    let hopIndex = 0;
    let crossing = -1;
    let hop = null;
    let waitStarted = 0;
    let lastJump = -Infinity;
    let launchAt = 0;
    let hopGroundTime = 0;
    let bossDodge = -1;
    let previous = [];
    let trapTarget;
    let lastDash = -Infinity;
    let dashStarts = 0;
    let previousDash = false;
    const stats = {
      checkpoints: new Set(),
      ledges: new Set(),
      swings: 0,
      bossPatterns: new Set(),
      projectiles: new Set(),
      enemyTypes: new Set(),
    };
    const begin = performance.now();
    const allowed = level >= 20 ? Math.max(80_000, timeout) : timeout;
    const initialTime = s.elapsed;
    const record = (tag, extra = "") => {
      events.push([Math.round(s.player.x), Math.round(s.player.y), tag, extra]);
      if (events.length > 60) events.shift();
    };
    function input(code, pressed) {
      if (keys.has(code) === pressed) return;
      if (pressed) keys.add(code);
      else keys.delete(code);
      window.dispatchEvent(
        new KeyboardEvent(pressed ? "keydown" : "keyup", {
          code,
          bubbles: true,
          cancelable: true,
        }),
      );
    }
    function steer(direction) {
      input("ArrowLeft", direction < 0);
      input("ArrowRight", direction > 0);
    }
    function jump() {
      if (s.elapsed - lastJump < 115) return false;
      input("Space", false);
      input("Space", true);
      lastJump = s.elapsed;
      return true;
    }
    function swing() {
      const strike = s.ninja?.attack;
      if (strike) {
        const buffer = [94, 119, 230][strike.index];
        if (
          strike.index === 2 ||
          strike.queued ||
          s.elapsed - strike.since < buffer
        )
          return;
      } else if (s.elapsed - lastSwing < 350) return;
      input("KeyX", true);
      input("KeyX", false);
      lastSwing = s.elapsed;
      stats.swings++;
    }
    function approach(target, player, tolerance = 3) {
      const v = player.body.velocity.x;
      const estimate = player.x + (Math.sign(v) * v * v) / (2 * 1250);
      const error = target - estimate;
      steer(Math.abs(error) <= tolerance ? 0 : Math.sign(error));
    }
    function platform(id) {
      const p = s.level.platforms.find(([x]) => x === id);
      return {
        x: p[0],
        y: p[1],
        w: p[2],
        special: s.specialPlatforms.find((item) => item.x === id),
      };
    }
    function predicted(p, ms) {
      const ledge = p.special;
      if (ledge?.kind === "moving") {
        const ratio = -Math.cos(
          ((s.elapsed + ms) / ledge.period) * 2 * Math.PI,
        );
        return { x: p.x + ledge.a * ratio, y: p.y + ledge.b * ratio };
      }
      return p;
    }
    function targetFor(h, px, v) {
      if (!h.dest) return [h.right + 24, 0, true];
      let future = predicted(h.dest, 545);
      const t =
        (263 + Math.sqrt(Math.max(0, 263 ** 2 + 1400 * (future.y - h.fromY)))) /
        700;
      future = predicted(h.dest, t * 1000);
      const position = Math.max(
        future.x + Math.min(12, h.dest.w * 0.32),
        Math.min(future.x + h.dest.w - 8, px + 132 * t - 6),
      );
      const ledge = h.dest.special;
      const safe =
        ledge?.kind !== "vanish" ||
        ((s.elapsed + t * 1000 + ledge.x * 7) % ledge.period) / ledge.period <
          0.62;
      return [position, t, safe];
    }
    function output(status, reason) {
      for (const key of [...keys]) input(key, false);
      resolve({
        level,
        name: s.level.name,
        status,
        reason,
        coins: s.collected,
        total: s.level.coins.length,
        deaths,
        time: Math.round(s.elapsed - initialTime),
        x: Math.round(s.player.x),
        y: Math.round(s.player.y),
        checkpoints: [...stats.checkpoints],
        ledges: [...stats.ledges],
        bossPatterns: [...stats.bossPatterns],
        projectiles: [...stats.projectiles],
        enemyTypes: [...stats.enemyTypes],
        dashStarts, abilities:{...s.ninja?.uses},
        events,
      });
    }
    function tick() {
      const p = s.player;
      const time = s.elapsed;
      const grounded = p.body.blocked.down && p.body.velocity.y >= 0;
      if (s.ninja?.dash && !previousDash) dashStarts++;
      previousDash = Boolean(s.ninja?.dash);
      if (s.complete)
        return output("Completed", "Normal keyboard input reached the flag");
      if (performance.now() - begin > allowed)
        return output("Partial", "Input strategy timed out");
      if (s.invulnerableUntil > lastGrace) {
        lastGrace = s.invulnerableUntil;
        deaths++;
        bossDodge = -1;
        record("respawn", [mode, ...previous]);
        mode = "ground";
        crossing = -1;
        hop = null;
        hopIndex = 0;
        trapTarget = undefined;
        input("Space", false);
      }
      previous = [
        Math.round(p.x),
        Math.round(p.y),
        Math.round(p.body.velocity.x),
      ];
      if (s.checkpoint !== s.level.spawnX) stats.checkpoints.add(s.checkpoint);
      if (time - lastJump > 600) input("Space", false);
      const island = s.level.ground.findIndex(
        ([start, end]) => p.x >= start - 4 && p.x <= end + 3,
      );
      const enemy = s.enemies
        .getChildren()
        .find(
          (e) =>
            e.active && Math.abs(e.x - p.x) < 45 && Math.abs(e.y - p.y) < 25,
        );
      if (enemy) {
        stats.enemyTypes.add(enemy.getData("type") ?? "slime");
        if (
          (!p.flipX && enemy.x >= p.x - 5 && enemy.x - p.x <= 29) ||
          (p.flipX && enemy.x <= p.x + 5 && p.x - enemy.x <= 29)
        )
          swing();
      }
      for (const shot of s.projectiles)
        if (shot.dot.active && Math.abs(shot.dot.x - p.x) < 110)
          stats.projectiles.add(shot.vy ? "falling" : "horizontal");

      const boss = s.boss;
      if (boss?.hp > 0 && p.x > boss.start - 10) {
        const x = boss.x;
        if (boss.kind) {
          const pattern = boss.profile?.pattern;
          const projectile = pattern === "wave" || pattern === "venom";
          if (boss.phase === "attack") stats.bossPatterns.add(pattern);
          if (boss.phase === "open" && boss.hits < 2) {
            approach(x - 26, p, 3);
            if (p.x >= x - 36 && p.x <= x + 3 && !p.flipX) swing();
            if (p.flipX && p.x <= x - 23) steer(1);
          } else if (
            (boss.phase === "warn" || boss.phase === "attack") &&
            !projectile
          ) {
            const distance = ["bloom", "crownfall"].includes(pattern) ? 62 : 49;
            const dodge =
              boss.target > x - 108
                ? boss.target - distance
                : boss.target + distance;
            approach(Math.min(x - 26, dodge), p, 3);
          } else {
            approach(x - 56, p, 4);
            const threat = s.projectiles.some(
              (shot) =>
                shot.vx < 0 && shot.dot.x >= p.x - 3 && shot.dot.x - p.x < 30,
            );
            if (threat && grounded && bossDodge !== boss.cycle && jump())
              bossDodge = boss.cycle;
          }
          requestAnimationFrame(tick);
          return;
        }
        const pattern = boss.cycle % 2;
        if (boss.phase === "attack") stats.bossPatterns.add(pattern);
        if (boss.phase === "warn" && pattern === 1) {
          approach(boss.target < x - 42 ? x - 32 : x - 70, p, 4);
        } else if (boss.phase === "open" && boss.hits < 2) {
          const target = x - 25;
          approach(target, p, 3);
          if (p.x >= x - 36 && p.x <= x + 5 && !p.flipX) swing();
          else if (p.flipX && p.x <= target + 3) {
            steer(1);
          }
        } else if (boss.phase === "attack" && pattern === 0) {
          const threat = s.projectiles.some(
            (shot) =>
              shot.vx < 0 && shot.dot.x >= p.x - 6 && shot.dot.x - p.x < 49,
          );
          approach(x - 54, p, 4);
          if (threat && grounded && bossDodge !== boss.cycle && jump()) {
            bossDodge = boss.cycle;
            record("boss wave jump", boss.cycle);
          }
        } else if (boss.phase === "attack" && pattern === 1) {
          approach(boss.target < x - 42 ? x - 32 : x - 70, p, 4);
        } else {
          approach(x - 58, p, 4);
        }
        requestAnimationFrame(tick);
        return;
      }

      const armored =
        enemy &&
        ["guard", "golem", "sentinel"].includes(
          enemy.getData("type"),
        );
      if (
        armored &&
        mode === "ground" &&
        grounded &&
        Math.abs(enemy.y - p.y) < 16 &&
        enemy.x - p.x > 10
      ) {
        const segment = s.level.ground.find(
          ([left, right]) => p.x >= left && p.x <= right,
        );
        if (segment && segment[1] - p.x > 70) {
          approach(enemy.x - 25, p, 2);
          swing();
          requestAnimationFrame(tick);
          return;
        }
      }

      if (mode === "ground") {
        const current =
          island < 0
            ? s.level.ground.findIndex(([start]) => start > p.x) - 1
            : island;
        const segment = s.level.ground[Math.max(0, current)];
        const next = s.level.ground[current + 1];
        const remaining = segment[1] - p.x;
        const shieldAhead = s.enemies
          .getChildren()
          .find(
            (e) =>
              e.active &&
              e.getData("type") === "knight" &&
              e.x - p.x > 25 &&
              e.x - p.x < 43 &&
              Math.abs(e.y - p.y) < 13,
          );
        if (shieldAhead && grounded && p.y > 177 && remaining > 91 && jump()) {
          record("jump over shield");
        }
        if (
          next &&
          remaining < 65 &&
          !grounded &&
          p.body.velocity.y >= 0 &&
          p.x < segment[1] - 3 &&
          p.y < 186 &&
          mode === "ground"
        ) {
          approach(segment[1] - 12, p, 3);
          requestAnimationFrame(tick);
          return;
        }
        if (!next && p.x > s.level.flagX - 48) {
          approach(s.level.flagX, p, 3);
          if (p.x > s.level.flagX + 6) steer(-1);
          requestAnimationFrame(tick);
          return;
        }
        const fireGate = level === 14 ? 670 : level === 16 ? 265 : 0;
        if (
          fireGate &&
          p.x > fireGate - 64 &&
          p.x < fireGate - 16 &&
          grounded
        ) {
          const future = Math.max(0, (fireGate - 15 - p.x) / 132) * 1000 + 50;
          let safe = true;
          for (let ahead = future; ahead < future + 290; ahead += 24) {
            const flame = (time + ahead + fireGate * 6) % 2800;
            if (flame >= 650 && flame < 1600) {
              const age = (flame - 650) / 950;
              if (level === 14 || 184 - 106 * age * (1 - age) > 164) {
                safe = false;
                break;
              }
            }
          }
          if (!safe) {
            approach(fireGate - 36, p, 3);
            requestAnimationFrame(tick);
            return;
          }
        }
        const gate = (s.level.hazards ?? []).find((entry) => {
          if (
            ![
              "crusher",
              "walls",
              "piston",
              "laserGrid",
              "rotatingLaser",
            ].includes(entry.kind)
          )
            return false;
          const nearEdge = entry.x - (entry.spread ?? 0) - entry.width / 2;
          return p.x > nearEdge - 50 && p.x <= nearEdge - 13;
        });
        if (gate && grounded) {
          const near = gate.x - (gate.spread ?? 0) - gate.width / 2;
          let safe = true;
          for (let ahead = 35; ahead <= 1175; ahead += 30) {
            const beginFrom = Math.max(0, p.body.velocity.x);
            const seconds = ahead / 1000;
            const acceleration = Math.min(seconds, (132 - beginFrom) / 880);
            const xp =
              p.x +
              beginFrom * acceleration +
              440 * acceleration ** 2 +
              132 * (seconds - acceleration);
            if (
              dangerHits(
                { left: xp - 6, right: xp + 6, top: 166, bottom: 184 },
                gate,
                hazardFrame(gate, time + ahead, {}),
              )
            ) {
              safe = false;
              break;
            }
          }
          if (!safe) {
            approach(near - 24, p, 2);
            requestAnimationFrame(tick);
            return;
          }
        }
        const hazard = s.level.hazards?.find((entry) => {
          if (!Array.isArray(entry)) {
            if (
              [
                "poisonPool",
                "risingLava",
                "crusher",
                "walls",
                "piston",
                "laserGrid",
                "rotatingLaser",
              ].includes(entry.kind)
            )
              return false;
            const frame = hazardFrame(entry, time, {});
            if (frame.phase !== "active" && frame.phase !== "warning")
              return false;
            const lookAhead = entry.kind === "saw" ? 40 : 32;
            return (
              (entry.kind === "saw" || frame.y + frame.height / 2 > 165) &&
              frame.x >= p.x &&
              frame.x - frame.width / 2 - p.x < lookAhead
            );
          }
          const [type, x, y, w, range] = entry;
          if (fireGate === x && (type === "jet" || type === "fireball"))
            return false;
          if (
            y > 190 ||
            type === "lava" ||
            type === "rock" ||
            type === "icicle"
          )
            return false;
          const activeX =
            type === "sweep" ? x + Math.sin(time / 520) * range : x;
          return activeX - p.x > 1 && activeX - p.x < 34 + w / 2;
        });
        const bullet =
          s.projectiles.some(
            (shot) =>
              shot.vx < 0 &&
              shot.dot.x >= p.x &&
              shot.dot.x - p.x < 32 &&
              shot.dot.y >= p.y - 16 &&
              shot.dot.y <= p.y + 4,
          ) && !(fireGate && p.x > fireGate - 80 && p.x < fireGate + 8);
        if (
          grounded &&
          (hazard || bullet) &&
          !(next && remaining < 43) &&
          jump()
        ) {
          if (next && remaining < 112) {
            const obstacleEnd = Array.isArray(hazard)
              ? hazard[1] + hazard[3] / 2
              : hazard
                ? hazard.x + hazard.width / 2
                : p.x + 25;
            trapTarget = Math.min(
              segment[1] - 3,
              Math.max(segment[1] - 12, obstacleEnd + 10),
            );
            mode = "trap";
            launchAt = time;
            record("trap hop", hazard?.[0] ?? hazard?.kind ?? "bullet");
          }
        }
        if (
          mode === "ground" &&
          next &&
          remaining < 41 &&
          remaining > -13 &&
          (grounded || time <= s.groundedUntil) &&
          time - lastJump > 160
        ) {
          crossing = current;
          hopIndex = 0;
          const candidates = bridges[current] ?? [];
          hop = {
            dest: candidates.length ? platform(candidates[0]) : null,
            right: next[0],
            fromY: 184,
          };
          mode = "approach";
          waitStarted = time;
        } else if (mode === "ground") {
          steer(1);
          const clearFloor = s.level.ground.some(
            ([left, right]) => p.x > left + 20 && p.x < right - 110,
          );
          const danger = (s.level.hazards ?? []).some((h) => {
            const x = Array.isArray(h) ? h[1] : h.x;
            return Math.abs(x - p.x) < 110;
          });
          const enemyAhead = s.enemies
            .getChildren()
            .some((e) => e.active && e.x > p.x - 8 && e.x < p.x + 95);
          if (
            dash &&
            grounded &&
            clearFloor &&
            !danger &&
            !enemyAhead &&
            !s.ninja?.attack &&
            time - lastDash > 1000
          ) {
            input("KeyZ", true);
            input("KeyZ", false);
            lastDash = time;
          }
        }
      }
      if (mode === "trap") {
        approach(trapTarget, p, 4);
        if (grounded && time - launchAt > 250) {
          mode = "ground";
          trapTarget = undefined;
        }
      } else if (mode === "approach") {
        const end = s.level.ground[crossing][1];
        const [target, duration, safe] = targetFor(hop, p.x, p.body.velocity.x);
        const lower = hop.dest
          ? predicted(hop.dest, duration * 1000).x + 2
          : hop.right - 3;
        const runUp = Math.max(0, (132 - Math.max(0, p.body.velocity.x)) / 880);
        const range = 132 * duration - 440 * runUp * runUp;
        const launchPoint = hop.dest
          ? Math.max(end - 23, Math.min(end + 1, lower - range + 5))
          : end - 10;
        const adjustedReady = !hop.dest || lower - p.x < range + 5;
        const ready =
          (grounded || time <= s.groundedUntil) &&
          p.x >= launchPoint - 3 &&
          safe &&
          adjustedReady;
        if (ready && jump()) {
          launchAt = time;
          hop.target = target;
          mode = "air";
          record("jump", hop.dest?.x ?? hop.right);
          steer(1);
        } else if (!safe) approach(end - 13, p, 3);
        else if (p.x > end - 7 && !adjustedReady) approach(end + 1, p, 1);
        else if (p.x > end - 2) approach(end, p, 1);
        else steer(1);
        if (time - waitStarted > 7000) {
          mode = "ground";
          record("reapproach");
        }
      } else if (mode === "air") {
        const dest = hop.dest;
        if (dest) {
          const future = predicted(dest, Math.max(0, 515 - (time - launchAt)));
          const target =
            dest.special?.kind === "moving"
              ? future.x + dest.w / 2
              : hop.target;
          approach(target, p, 4);
        } else steer(1);
        if (grounded && time - launchAt > 225) {
          const after = s.level.ground[crossing + 1][0];
          const candidates = bridges[crossing] ?? [];
          if (p.x >= after - 3 && (!dest || p.y > 177)) {
            mode = "ground";
            record("land island", after);
          } else if (p.y < 176 && p.x > s.level.ground[crossing][1] - 4) {
            stats.ledges.add(dest?.x ?? Math.round(p.x));
            record("land ledge", dest?.x ?? "");
            hopIndex++;
            hop = {
              dest:
                candidates[hopIndex] === undefined
                  ? null
                  : platform(candidates[hopIndex]),
              right: after,
              fromY: p.y,
            };
            mode = "ledge";
            hopGroundTime = time;
            input("Space", false);
          } else if (p.x < s.level.ground[crossing][1]) {
            mode = "approach";
            waitStarted = time;
          }
        }
      } else if (mode === "ledge") {
        const [target, duration, safe] = targetFor(hop, p.x, p.body.velocity.x);
        const nextX = hop.dest
          ? predicted(hop.dest, duration * 1000).x + 3
          : hop.right + 4;
        const available = hop.dest
          ? 132 * duration - 10
          : 93 + Math.max(0, 184 - hop.fromY) * 0.35;
        if (
          (grounded || time <= s.groundedUntil) &&
          safe &&
          nextX - p.x <= available &&
          time - hopGroundTime > 52 &&
          jump()
        ) {
          launchAt = time;
          hop.target = target;
          mode = "air";
          record("jump from ledge", hop.dest?.x ?? hop.right);
          steer(1);
        } else {
          const old = (bridges[crossing] ?? [])[hopIndex - 1];
          if (old !== undefined) {
            const ledge = platform(old);
            approach(predicted(ledge, 80).x + ledge.w - 8, p, 3);
          } else steer(1);
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
};
