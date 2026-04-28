// Physics engine: stone movement, curl, elastic collisions
const Physics = (() => {

  function createStone(team, spin) {
    return {
      id: Math.random(),
      team,
      x: CONFIG.HACK_X,
      y: CONFIG.HACK_Y,
      vx: 0,
      vy: 0,
      spin,           // +1 = clockwise (curls right going up), -1 = CCW (curls left)
      isMoving: false,
      inPlay: false,
      wasRemoved: false,
      // Snapshot for FGZ restoration
      fgzSnapshot: null,
    };
  }

  function launchStone(stone, angle, power) {
    // angle: radians from straight-up (+y direction), positive = right
    const speed = CONFIG.POWER_MIN_SPEED +
      power * (CONFIG.POWER_MAX_SPEED - CONFIG.POWER_MIN_SPEED);
    stone.vx = Math.sin(angle) * speed;
    stone.vy = Math.cos(angle) * speed;  // y increases toward house
    stone.isMoving = true;
    stone.inPlay = true;
    stone.x = CONFIG.HACK_X;
    stone.y = CONFIG.HACK_Y;
    stone.wasRemoved = false;
  }

  // Returns true if any stone is still moving
  function update(stones, isSweeping) {
    let anyMoving = false;
    const toRemove = [];

    for (const s of stones) {
      if (!s.isMoving) continue;

      const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);

      if (speed < CONFIG.MIN_SPEED) {
        s.vx = 0;
        s.vy = 0;
        s.isMoving = false;
        continue;
      }

      anyMoving = true;

      const ux = s.vx / speed;
      const uy = s.vy / speed;

      // Friction: decelerates along motion direction
      const frictionMag = CONFIG.FRICTION_COEFF *
        (isSweeping ? CONFIG.SWEEP_FRICTION_MULT : 1.0);

      // Curl: lateral force perpendicular to velocity
      // spin=+1 (CW from above): when moving in +y, drifts to +x (right)
      // Perpendicular CW of (ux,uy) = (uy, -ux)
      const curlMag = CONFIG.CURL_COEFF * Math.sqrt(speed) * s.spin *
        (isSweeping ? CONFIG.SWEEP_CURL_MULT : 1.0);

      s.vx += -ux * frictionMag + curlMag * uy;
      s.vy += -uy * frictionMag + curlMag * (-ux);

      s.x += s.vx;
      s.y += s.vy;

      // Boundary: off any edge of the sheet
      if (s.y > CONFIG.BACK_BOARD_Y + CONFIG.STONE_RADIUS ||
          s.y < -CONFIG.STONE_RADIUS ||
          s.x < -CONFIG.STONE_RADIUS ||
          s.x > CONFIG.SHEET_WIDTH + CONFIG.STONE_RADIUS) {
        toRemove.push(s);
      }
    }

    // Remove out-of-bounds stones after position updates
    for (const s of toRemove) {
      s.isMoving = false;
      s.wasRemoved = true;
      s.inPlay = false;
    }

    // Collision detection (all pairs)
    const diameter = CONFIG.STONE_RADIUS * 2;
    const diam2 = diameter * diameter;
    for (let i = 0; i < stones.length; i++) {
      for (let j = i + 1; j < stones.length; j++) {
        const a = stones[i];
        const b = stones[j];
        if (a.wasRemoved || b.wasRemoved) continue;
        if (!a.isMoving && !b.isMoving) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist2 = dx * dx + dy * dy;

        if (dist2 >= diam2 || dist2 < 1e-10) continue;

        const dist = Math.sqrt(dist2);
        const nx = dx / dist;
        const ny = dy / dist;

        // Relative velocity along normal
        const dvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (dvn > 0) continue; // already separating

        const impulse = -(1 + CONFIG.RESTITUTION) * dvn / 2;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        b.vx += impulse * nx;
        b.vy += impulse * ny;

        // Positional correction to prevent sinking
        const overlap = diameter - dist;
        const corr = overlap / 2 + 0.0001;
        a.x -= nx * corr;
        a.y -= ny * corr;
        b.x += nx * corr;
        b.y += ny * corr;

        if (Math.sqrt(a.vx*a.vx + a.vy*a.vy) > CONFIG.MIN_SPEED) a.isMoving = true;
        if (Math.sqrt(b.vx*b.vx + b.vy*b.vy) > CONFIG.MIN_SPEED) b.isMoving = true;
      }
    }

    // Re-check any moving after collisions
    for (const s of stones) {
      if (s.isMoving) anyMoving = true;
    }

    return anyMoving;
  }

  // Remove stones that didn't cross far hog line (stopped short)
  function enforceHogLine(stone) {
    if (stone.inPlay && !stone.wasRemoved && stone.y < CONFIG.FAR_HOG_Y) {
      stone.wasRemoved = true;
      stone.inPlay = false;
    }
  }

  function distToButton(stone) {
    const dx = stone.x - CONFIG.HACK_X;
    const dy = stone.y - CONFIG.BUTTON_Y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function isInHouse(stone) {
    return distToButton(stone) <= CONFIG.HOUSE_RADIUS;
  }

  function isInFGZ(stone) {
    // Between near hog and near edge of house, not inside the house
    return stone.y >= CONFIG.FGZ_NEAR && stone.y < CONFIG.FGZ_FAR;
  }

  return { createStone, launchStone, update, enforceHogLine, distToButton, isInHouse, isInFGZ };
})();
