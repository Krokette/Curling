// Main game loop and state machine
const Game = (() => {

  // ---- State ----
  const gs = {
    phase: 'MENU',           // MENU | SETUP_END | AIMING | POWER_SELECT | THROWING | STONE_SETTLED | SCORING | GAME_OVER
    gameMode: 'hotseat',     // 'hotseat' | 'vs_ai'

    currentEnd: 1,
    totalEnds: CONFIG.TOTAL_ENDS,
    isExtraEnd: false,
    scores: [0, 0],
    hammerTeam: 0,

    stonesThrown: 0,         // stones delivered this end (0–15)
    currentThrower: 0,       // team currently throwing

    stones: [],              // all StoneObjects on ice
    activeStone: null,       // stone currently in flight (or just settled)

    // Aiming
    aimAngle: 0,             // radians from straight-up toward house
    spinDir: 1,              // +1 CW, -1 CCW
    isSweeping: false,

    // Power
    power: 0,
    powerCharging: false,
    powerStartTime: 0,

    // FGZ snapshot taken before each throw
    fgzSnapshot: [],

    // AI timing
    aiThinkStart: 0,
    aiShot: null,

    // Scoring display
    scoringResult: null,
    scoringClickReady: false,

    // Mouse position (canvas coords) for aim
    mouseX: 0,
    mouseY: 0,
  };

  let canvas;
  let lastTime = 0;

  // ---- Init ----

  function init() {
    canvas = document.getElementById('gameCanvas');
    Renderer.init(canvas);
    Input.init(canvas);
    wireInput();
    window.addEventListener('resize', () => Renderer.resize());
    requestAnimationFrame(loop);
  }

  // ---- Input wiring ----

  function wireInput() {
    Input.on('mousemove', pos => {
      gs.mouseX = pos.x;
      gs.mouseY = pos.y;
    });

    Input.on('mousedown', pos => {
      if (gs.phase === 'AIMING' && !isAITurn()) {
        gs.powerCharging = true;
        gs.powerStartTime = performance.now();
        gs.power = 0;
        gs.phase = 'POWER_SELECT';
      }
    });

    Input.on('mouseup', pos => {
      if (gs.phase === 'POWER_SELECT' && !isAITurn()) {
        commitThrow();
      }
    });

    Input.on('click', pos => {
      if (gs.phase === 'MENU') handleMenuClick(pos);
      if (gs.phase === 'SCORING' && gs.scoringClickReady) advanceAfterScoring();
      if (gs.phase === 'GAME_OVER') resetToMenu();
    });

    Input.on('keydown', code => {
      if (gs.phase === 'AIMING' && !isAITurn()) {
        if (code === 'KeyQ') gs.spinDir = -1;
        if (code === 'KeyE') gs.spinDir =  1;
      }
      if (gs.phase === 'THROWING') {
        if (code === 'Space') gs.isSweeping = true;
      }
    });

    Input.on('keyup', code => {
      if (code === 'Space') gs.isSweeping = false;
    });
  }

  // ---- Menu ----

  function handleMenuClick(pos) {
    // Mode buttons
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const bx = cx - 120;

    if (Input.hitRect(pos, bx, cy - 10, 240, 44)) {
      gs.gameMode = 'hotseat';
    } else if (Input.hitRect(pos, bx, cy + 50, 240, 44)) {
      gs.gameMode = 'vs_ai';
    } else if (Input.hitRect(pos, cx - 90, cy + 140, 180, 44)) {
      startGame();
    }
  }

  function startGame() {
    gs.currentEnd = 1;
    gs.totalEnds = CONFIG.TOTAL_ENDS;
    gs.isExtraEnd = false;
    gs.scores = [0, 0];
    gs.hammerTeam = Math.random() < 0.5 ? 0 : 1;
    setupEnd();
  }

  // ---- End management ----

  function setupEnd() {
    gs.stones = [];
    gs.stonesThrown = 0;
    gs.activeStone = null;
    gs.isSweeping = false;
    gs.fgzSnapshot = [];
    gs.currentThrower = Rules.currentThrower(0, gs.hammerTeam);
    gs.phase = 'AIMING';
    gs.spinDir = 1;
    gs.aimAngle = 0;

    if (isAITurn()) scheduleAI();
  }

  // ---- Aiming update (called each frame in AIMING) ----

  function updateAiming() {
    if (isAITurn()) return; // AI sets aimAngle via scheduleAI
    // Convert mouse canvas pos to world aim angle
    // Hack is at world (HACK_X, HACK_Y) → compute canvas position via Renderer internals
    // Instead: use mouse position relative to hack canvas position
    const hackCX = canvas.width  / 2; // approximate — depends on Renderer scale
    // We use the fact that Renderer exposes nothing, so we store scale here
    // Actually Renderer.resize sets scale as an internal. We replicate:
    const scale = (canvas.height - 40) / CONFIG.SHEET_LENGTH;
    const hackCY = canvas.height - 20 - CONFIG.HACK_Y * scale;

    const dx = gs.mouseX - hackCX;
    const dy = hackCY - gs.mouseY; // upward = positive y in world

    // Only update angle if mouse is above hack
    if (dy > 0) {
      gs.aimAngle = Math.atan2(dx, dy);
      // Clamp to ±45° (realistic throwing angle)
      gs.aimAngle = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, gs.aimAngle));
    }
  }

  // ---- Power select ----

  function updatePowerSelect() {
    if (isAITurn()) return;
    const elapsed = performance.now() - gs.powerStartTime;
    gs.power = Math.min(1.0, elapsed / CONFIG.POWER_FILL_DURATION);
  }

  // ---- Launch stone ----

  function commitThrow() {
    const stone = Physics.createStone(gs.currentThrower, gs.spinDir);

    // Snapshot FGZ before this throw
    gs.fgzSnapshot = Rules.snapshotFGZ(gs.stones);

    Physics.launchStone(stone, gs.aimAngle, gs.power);
    gs.stones.push(stone);
    gs.activeStone = stone;
    gs.stonesThrown++;
    gs.phase = 'THROWING';
    gs.powerCharging = false;
    gs.power = 0;
  }

  // ---- AI ----

  function isAITurn() {
    return gs.gameMode === 'vs_ai' && gs.currentThrower === 1;
  }

  function scheduleAI() {
    gs.aiThinkStart = performance.now();
    gs.aiShot = AI.computeShot(gs.stones, gs.stonesThrown, 1);
  }

  function updateAI() {
    if (!isAITurn()) return;
    if (gs.phase !== 'AIMING') return;
    const elapsed = performance.now() - gs.aiThinkStart;
    if (elapsed >= CONFIG.AI_THINK_DELAY) {
      gs.aimAngle = gs.aiShot.angle;
      gs.spinDir  = gs.aiShot.spin;
      gs.power    = gs.aiShot.power;
      commitThrow();
    } else {
      // Show AI aiming animation
      gs.aimAngle = gs.aiShot ? gs.aiShot.angle * (elapsed / CONFIG.AI_THINK_DELAY) : 0;
    }
  }

  // ---- Stone settled ----

  function onStoneSettled() {
    const stone = gs.activeStone;

    // Hog line check
    Physics.enforceHogLine(stone);

    // FGZ violation check
    Rules.enforceFGZ(gs.fgzSnapshot, stone, gs.stonesThrown - 1);

    // Determine next state
    if (gs.stonesThrown >= CONFIG.STONES_PER_TEAM * 2) {
      endRound();
    } else {
      gs.currentThrower = Rules.currentThrower(gs.stonesThrown, gs.hammerTeam);
      gs.phase = 'AIMING';
      gs.aimAngle = 0;
      gs.spinDir = 1;
      if (isAITurn()) scheduleAI();
    }
  }

  // ---- Scoring ----

  function endRound() {
    const result = Rules.scoreEnd(gs.stones);
    gs.scores[0] += result.scorer === 0 ? result.points : 0;
    gs.scores[1] += result.scorer === 1 ? result.points : 0;
    gs.hammerTeam = Rules.nextHammer(gs.hammerTeam, result.scorer);
    gs.scoringResult = result;
    gs.scoringClickReady = false;
    gs.phase = 'SCORING';
    // Allow click after short delay to prevent accidental skip
    setTimeout(() => { gs.scoringClickReady = true; }, 800);
  }

  function advanceAfterScoring() {
    if (gs.currentEnd >= gs.totalEnds) {
      // Check for tie → extra end
      if (gs.scores[0] === gs.scores[1]) {
        gs.isExtraEnd = true;
        gs.totalEnds++;
        gs.currentEnd++;
        setupEnd();
      } else {
        gs.phase = 'GAME_OVER';
      }
    } else {
      gs.currentEnd++;
      setupEnd();
    }
  }

  function resetToMenu() {
    gs.phase = 'MENU';
    gs.stones = [];
    gs.activeStone = null;
  }

  // ---- Main loop ----

  function loop(timestamp) {
    const dt = Math.min(timestamp - lastTime, 50); // clamp dt
    lastTime = timestamp;

    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    switch (gs.phase) {
      case 'AIMING':
        updateAiming();
        updateAI();
        break;

      case 'POWER_SELECT':
        updatePowerSelect();
        break;

      case 'THROWING': {
        // Single physics step per frame. Do NOT filter wasRemoved stones here:
        // FGZ enforcement in STONE_SETTLED may restore stones that were knocked out.
        const anyMoving = Physics.update(gs.stones, gs.isSweeping);
        if (!anyMoving) {
          gs.phase = 'STONE_SETTLED';
        }
        break;
      }

      case 'STONE_SETTLED':
        onStoneSettled();
        // Filter dead stones only AFTER FGZ enforcement (which may restore some)
        gs.stones = gs.stones.filter(s => s.inPlay);
        break;
    }
  }

  function render() {
    Renderer.clear();

    if (gs.phase === 'MENU') {
      Renderer.drawMenu(gs.gameMode);
      return;
    }

    Renderer.drawRink();
    Renderer.drawStones(gs.stones);

    if (gs.phase === 'AIMING') {
      Renderer.drawAimLine(gs.aimAngle, gs.spinDir);
      Renderer.drawHUD(gs);
      Renderer.drawThrowerLabel(gs);
    }

    if (gs.phase === 'POWER_SELECT') {
      Renderer.drawAimLine(gs.aimAngle, gs.spinDir);
      Renderer.drawPowerBar(gs.power);
      Renderer.drawHUD(gs);
      Renderer.drawThrowerLabel(gs);
    }

    if (gs.phase === 'THROWING') {
      if (gs.isSweeping) Renderer.drawSweepIndicator();
      Renderer.drawHUD(gs);
    }

    if (gs.phase === 'STONE_SETTLED' || gs.phase === 'SCORING') {
      Renderer.drawHUD(gs);
    }

    if (gs.phase === 'SCORING') {
      Renderer.drawScoring(gs.scoringResult, gs.currentEnd, gs.scores);
    }

    if (gs.phase === 'GAME_OVER') {
      Renderer.drawGameOver(gs.scores);
    }
  }

  return { init };
})();

window.addEventListener('load', Game.init);
