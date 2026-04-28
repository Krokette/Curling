// AI opponent: computes shot parameters for team 1
const AI = (() => {

  // Gaussian-ish noise via Box-Muller (clamped to ±2σ)
  function randNorm(stddev) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return Math.max(-2, Math.min(2, z)) * stddev;
  }

  // Simulate how far a stone travels with given power (no curl, straight)
  function simulateDistance(power) {
    const initSpeed = CONFIG.POWER_MIN_SPEED +
      power * (CONFIG.POWER_MAX_SPEED - CONFIG.POWER_MIN_SPEED);
    let speed = initSpeed;
    let dist = 0;
    while (speed > CONFIG.MIN_SPEED) {
      dist += speed;
      speed -= CONFIG.FRICTION_COEFF;
    }
    return dist; // in meters (world units)
  }

  // Binary search for power that makes stone reach targetY
  function powerForDistance(targetY) {
    // Distance from hack to target
    const target = targetY - CONFIG.HACK_Y;
    let lo = 0.0, hi = 1.0;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (simulateDistance(mid) < target) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // Angle (radians from straight up) from hack to world point (tx, ty)
  function angleToPoint(tx, ty) {
    const dx = tx - CONFIG.HACK_X;
    const dy = ty - CONFIG.HACK_Y;
    return Math.atan2(dx, dy);
  }

  // Apply random variance
  function addVariance(angle, power) {
    const aVar = CONFIG.AI_ANGLE_VARIANCE_DEG * Math.PI / 180;
    return {
      angle: angle + randNorm(aVar),
      power: Math.max(0.05, Math.min(1.0, power + randNorm(CONFIG.AI_POWER_VARIANCE))),
    };
  }

  // Main decision function
  function computeShot(stones, stonesThrown, aiTeam) {
    const opTeam = 1 - aiTeam;
    const inPlay = stones.filter(s => s.inPlay && !s.wasRemoved);
    const inHouse = inPlay.filter(s => Physics.isInHouse(s));

    inHouse.sort((a, b) => Physics.distToButton(a) - Physics.distToButton(b));

    let targetX, targetY, spin;
    spin = Math.random() < 0.5 ? 1 : -1;

    if (inHouse.length === 0) {
      // No stones in house → draw to button
      targetX = CONFIG.HACK_X + randNorm(0.15);
      targetY = CONFIG.BUTTON_Y;
    } else if (inHouse[0].team === opTeam) {
      // Opponent leads → takeout their best stone
      const target = inHouse[0];
      targetX = target.x;
      targetY = target.y;
      // Hard shot: don't aim exactly at stone center to account for stone radius offset
      // Aim slightly past (the stone will stop at their current position on contact)
    } else {
      // We lead → place a guard in FGZ
      // Guards protect our stone in the house
      targetX = CONFIG.HACK_X + randNorm(0.25);
      // Top-12 guard: ~1.5m in front of the near edge of the house
      targetY = CONFIG.BUTTON_Y - CONFIG.HOUSE_RADIUS - 1.4 + randNorm(0.3);
      targetY = Math.max(CONFIG.FGZ_NEAR + 0.5, Math.min(CONFIG.FGZ_FAR - 0.3, targetY));
      // Curl toward center
      spin = targetX > CONFIG.HACK_X ? -1 : 1;
    }

    const baseAngle = angleToPoint(targetX, targetY);
    const basePower = powerForDistance(targetY);
    const { angle, power } = addVariance(baseAngle, basePower);

    return { angle, power, spin };
  }

  return { computeShot };
})();
