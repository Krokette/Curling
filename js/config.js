const CONFIG = {
  // Rink dimensions (meters, world coords: y=0 at hack, y increases toward house)
  SHEET_LENGTH: 42.07,
  SHEET_WIDTH: 4.75,
  HACK_X: 4.75 / 2,     // center of sheet
  HACK_Y: 1.83,          // hack sits ~1.83m from end board

  BUTTON_Y: 38.405,      // distance from hack-end board to button center
  HOUSE_RADIUS: 1.829,   // 6 feet
  NEAR_HOG_Y: 6.4,       // near hog line (stone released before here)
  FAR_HOG_Y: 33.67,      // far hog line (stone must cross to remain)
  FAR_TEE_Y: 38.405,     // tee line at far end (= BUTTON_Y)
  BACK_BOARD_Y: 42.07,   // far back board

  // FGZ: between near hog and edge of far house, excluding the house itself
  // FGZ_FAR = BUTTON_Y - HOUSE_RADIUS so any stone with y < FGZ_FAR is not in house
  get FGZ_NEAR() { return this.NEAR_HOG_Y; },
  get FGZ_FAR()  { return this.BUTTON_Y - this.HOUSE_RADIUS; },

  // Stone geometry
  STONE_RADIUS: 0.145,   // 29cm diameter → 14.5cm radius

  // Physics (per-tick at 60fps)
  // Stone must cross far hog (31.84m from hack) to stay in play.
  // Full power reaches the backboard (40.24m from hack).
  // Formula: distance = v² / (2 * FRICTION_COEFF)
  FRICTION_COEFF: 0.00067,      // linear deceleration per tick
  CURL_COEFF: 0.000050,         // curl lateral accel = CURL_COEFF * sqrt(speed) * spin
  SWEEP_FRICTION_MULT: 0.88,    // sweeping reduces friction to 88% (~5m extra on a draw)
  SWEEP_CURL_MULT: 0.50,        // sweeping reduces curl to 50%
  RESTITUTION: 0.92,
  MIN_SPEED: 0.0003,            // below this, stone is considered stopped

  // Throwing — range maps the entire power bar to valid shots
  POWER_MAX_SPEED: 0.232,       // m/tick at 100% power (reaches backboard ~40m)
  POWER_MIN_SPEED: 0.207,       // m/tick at 0% power (just crosses far hog ~31.8m)
  POWER_FILL_DURATION: 1800,    // ms to fill power bar fully

  // Game rules
  TOTAL_ENDS: 4,
  STONES_PER_TEAM: 8,           // 8 per team, 16 per end total

  // AI
  AI_ANGLE_VARIANCE_DEG: 1.8,
  AI_POWER_VARIANCE: 0.028,
  AI_THINK_DELAY: 900,          // ms before AI commits shot

  // House ring radii for drawing
  RING_RADII: [1.829, 1.219, 0.610, 0.152],
  RING_COLORS: ['#1a6fc4', '#ffffff', '#cc2200', '#ffffff'],

  // Team colors
  TEAM_COLORS: ['#e03020', '#e0b800'],         // red, yellow
  TEAM_DARK:   ['#8b1a0e', '#8b6e00'],         // darker shade for handle
  TEAM_NAMES:  ['Rouge', 'Jaune'],
};
