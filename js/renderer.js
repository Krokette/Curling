// All canvas rendering — no game logic here
const Renderer = (() => {
  let canvas, ctx;
  let scale, offsetX; // world-to-canvas transform

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
  }

  function resize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    // Fit full sheet length in canvas height with padding
    scale = (canvas.height - 40) / CONFIG.SHEET_LENGTH;
    offsetX = (canvas.width - CONFIG.SHEET_WIDTH * scale) / 2;
  }

  // World → canvas
  function wx(worldX) { return offsetX + worldX * scale; }
  function wy(worldY) { return canvas.height - 20 - worldY * scale; }
  function ws(worldDist) { return worldDist * scale; }

  // ---------- Rink ----------

  function drawRink() {
    // Ice background
    ctx.fillStyle = '#ddeeff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sheet area
    ctx.fillStyle = '#eef6ff';
    ctx.fillRect(wx(0), wy(CONFIG.SHEET_LENGTH), ws(CONFIG.SHEET_WIDTH), ws(CONFIG.SHEET_LENGTH));

    // FGZ shading
    ctx.fillStyle = 'rgba(200,230,255,0.35)';
    ctx.fillRect(
      wx(0),
      wy(CONFIG.FGZ_FAR),
      ws(CONFIG.SHEET_WIDTH),
      ws(CONFIG.FGZ_FAR - CONFIG.FGZ_NEAR)
    );

    // Side boards
    ctx.strokeStyle = '#334';
    ctx.lineWidth = 2;
    ctx.strokeRect(wx(0), wy(CONFIG.SHEET_LENGTH), ws(CONFIG.SHEET_WIDTH), ws(CONFIG.SHEET_LENGTH));

    // Center line
    ctx.strokeStyle = '#aac';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(wx(CONFIG.HACK_X), wy(0));
    ctx.lineTo(wx(CONFIG.HACK_X), wy(CONFIG.SHEET_LENGTH));
    ctx.stroke();
    ctx.setLineDash([]);

    // Hog lines (red)
    ctx.strokeStyle = '#cc2200';
    ctx.lineWidth = 3;
    line(wx(0), wy(CONFIG.NEAR_HOG_Y), wx(CONFIG.SHEET_WIDTH), wy(CONFIG.NEAR_HOG_Y));
    line(wx(0), wy(CONFIG.FAR_HOG_Y),  wx(CONFIG.SHEET_WIDTH), wy(CONFIG.FAR_HOG_Y));

    // Tee line and back line (blue)
    ctx.strokeStyle = '#1a6fc4';
    ctx.lineWidth = 2;
    line(wx(0), wy(CONFIG.FAR_TEE_Y),    wx(CONFIG.SHEET_WIDTH), wy(CONFIG.FAR_TEE_Y));
    line(wx(0), wy(CONFIG.BACK_BOARD_Y), wx(CONFIG.SHEET_WIDTH), wy(CONFIG.BACK_BOARD_Y));

    // House (concentric circles, drawn back-to-front)
    const bx = wx(CONFIG.HACK_X);
    const by = wy(CONFIG.BUTTON_Y);
    for (let i = 0; i < CONFIG.RING_RADII.length; i++) {
      ctx.beginPath();
      ctx.arc(bx, by, ws(CONFIG.RING_RADII[i]), 0, Math.PI * 2);
      ctx.fillStyle = CONFIG.RING_COLORS[i];
      ctx.fill();
      ctx.strokeStyle = '#335';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Hack
    ctx.fillStyle = '#888';
    ctx.fillRect(wx(CONFIG.HACK_X) - ws(0.1), wy(CONFIG.HACK_Y) - ws(0.08),
                 ws(0.2), ws(0.16));

    // FGZ label
    ctx.fillStyle = 'rgba(80,120,200,0.5)';
    ctx.font = `${Math.max(9, ws(0.4))}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText('FGZ', wx(CONFIG.SHEET_WIDTH) - 4, wy((CONFIG.FGZ_NEAR + CONFIG.FGZ_FAR) / 2));
    ctx.textAlign = 'left';
  }

  function line(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // ---------- Stones ----------

  function drawStones(stones) {
    const inPlay = stones.filter(s => s.inPlay && !s.wasRemoved);
    for (const s of inPlay) {
      drawStone(s, false);
    }
  }

  function drawStone(s, highlight) {
    const cx = wx(s.x);
    const cy = wy(s.y);
    const r  = ws(CONFIG.STONE_RADIUS);

    // Outer ring (granite look)
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = highlight ? '#ffffff' : '#ccc';
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Team color body
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
    ctx.fillStyle = CONFIG.TEAM_COLORS[s.team];
    ctx.fill();

    // Handle (center)
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = CONFIG.TEAM_DARK[s.team];
    ctx.fill();
  }

  // ---------- Aim line ----------

  function drawAimLine(aimAngle, spinDir) {
    const hx = wx(CONFIG.HACK_X);
    const hy = wy(CONFIG.HACK_Y);
    const length = ws(8); // 8m preview line

    const ex = hx + Math.sin(aimAngle) * length;
    const ey = hy - Math.cos(aimAngle) * length;

    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrowhead
    const arrowLen = 12;
    const arrowAngle = 0.35;
    const dirAngle = Math.atan2(ex - hx, hy - ey);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - arrowLen * Math.sin(dirAngle - arrowAngle),
               ey + arrowLen * Math.cos(dirAngle - arrowAngle));
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - arrowLen * Math.sin(dirAngle + arrowAngle),
               ey + arrowLen * Math.cos(dirAngle + arrowAngle));
    ctx.stroke();

    // Spin indicator near hack
    ctx.fillStyle = spinDir > 0 ? '#ffcc00' : '#66ccff';
    ctx.font = `${Math.max(11, ws(0.5))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(spinDir > 0 ? '↻ E' : '↺ Q', hx, hy + ws(0.7));
    ctx.textAlign = 'left';
  }

  // ---------- Power bar ----------

  function drawPowerBar(power) {
    const barW = 18;
    const barH = canvas.height * 0.35;
    const bx = 20;
    const by = canvas.height / 2 - barH / 2;

    ctx.fillStyle = '#222a';
    roundRect(bx - 4, by - 4, barW + 8, barH + 8, 4);
    ctx.fill();

    // Background
    ctx.fillStyle = '#444';
    ctx.fillRect(bx, by, barW, barH);

    // Fill (green → red)
    const fillH = barH * power;
    const r = Math.floor(power * 220);
    const g = Math.floor((1 - power) * 180);
    ctx.fillStyle = `rgb(${r},${g},30)`;
    ctx.fillRect(bx, by + barH - fillH, barW, fillH);

    // Border
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, barH);

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PWR', bx + barW / 2, by - 8);
    ctx.fillText(Math.round(power * 100) + '%', bx + barW / 2, by + barH + 14);
    ctx.textAlign = 'left';
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // ---------- HUD ----------

  function drawHUD(gs) {
    const pad = 8;
    ctx.fillStyle = 'rgba(10,15,30,0.82)';
    ctx.fillRect(0, 0, canvas.width, 38);

    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(
      `End ${gs.currentEnd}/${gs.totalEnds}${gs.isExtraEnd ? ' (EXTRA)' : ''}`,
      pad, 24
    );

    // Scores
    const s0 = gs.scores[0];
    const s1 = gs.scores[1];
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.TEAM_COLORS[0];
    ctx.fillText(`${CONFIG.TEAM_NAMES[0]}: ${s0}`, canvas.width / 2 - 60, 24);
    ctx.fillStyle = CONFIG.TEAM_COLORS[1];
    ctx.fillText(`${CONFIG.TEAM_NAMES[1]}: ${s1}`, canvas.width / 2 + 60, 24);

    // Stones remaining
    const remaining = (CONFIG.STONES_PER_TEAM * 2) - gs.stonesThrown;
    ctx.fillStyle = '#ccc';
    ctx.textAlign = 'right';
    ctx.fillText(`Pierres: ${remaining}`, canvas.width - pad, 24);

    // Hammer indicator
    ctx.textAlign = 'right';
    ctx.fillStyle = CONFIG.TEAM_COLORS[gs.hammerTeam];
    ctx.fillText(`🔨 ${CONFIG.TEAM_NAMES[gs.hammerTeam]}`, canvas.width - pad, 14);
    ctx.textAlign = 'left';
  }

  // ---------- Current thrower label ----------

  function drawThrowerLabel(gs) {
    const team = gs.currentThrower;
    const name = CONFIG.TEAM_NAMES[team];
    const isAI = gs.gameMode === 'vs_ai' && team === 1;
    const label = isAI ? `${name} (IA) réfléchit…` : `Au tour de ${name}`;
    const stoneNum = Math.floor(gs.stonesThrown / 2) + 1;

    ctx.fillStyle = 'rgba(10,15,30,0.82)';
    ctx.fillRect(wx(0), wy(CONFIG.NEAR_HOG_Y) - 28, ws(CONFIG.SHEET_WIDTH), 26);

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = CONFIG.TEAM_COLORS[team];
    ctx.textAlign = 'center';
    ctx.fillText(
      `${label}  —  pierre ${stoneNum}/${CONFIG.STONES_PER_TEAM}`,
      wx(CONFIG.HACK_X), wy(CONFIG.NEAR_HOG_Y) - 10
    );
    ctx.textAlign = 'left';
  }

  // ---------- Sweeping indicator ----------

  function drawSweepIndicator() {
    ctx.fillStyle = 'rgba(100,200,255,0.22)';
    ctx.fillRect(wx(0), wy(CONFIG.FAR_HOG_Y), ws(CONFIG.SHEET_WIDTH), ws(CONFIG.FAR_HOG_Y - CONFIG.NEAR_HOG_Y));

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#66eeff';
    ctx.textAlign = 'center';
    ctx.fillText('SWEEP! [ESPACE]', wx(CONFIG.HACK_X), wy((CONFIG.NEAR_HOG_Y + CONFIG.FAR_HOG_Y) / 2));
    ctx.textAlign = 'left';
  }

  // ---------- Overlays ----------

  function drawOverlay(title, lines, btnLabel) {
    // Semi-transparent backdrop
    ctx.fillStyle = 'rgba(5,10,25,0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const boxW = Math.min(420, canvas.width - 40);
    const boxH = 60 + lines.length * 28 + 60;
    const bx = cx - boxW / 2;
    const by = cy - boxH / 2;

    ctx.fillStyle = '#0d1a2e';
    roundRect(bx, by, boxW, boxH, 12);
    ctx.fill();
    ctx.strokeStyle = '#3a6aaa';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(title, cx, by + 40);

    ctx.font = '15px sans-serif';
    lines.forEach((l, i) => {
      ctx.fillStyle = l.color || '#ccd';
      ctx.fillText(l.text, cx, by + 75 + i * 28);
    });

    if (btnLabel) {
      const btnY = by + boxH - 20;
      ctx.fillStyle = '#1a5a9a';
      roundRect(cx - 80, btnY - 22, 160, 34, 8);
      ctx.fill();
      ctx.strokeStyle = '#5599dd';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(btnLabel, cx, btnY);
    }
    ctx.textAlign = 'left';
  }

  function drawMenu(gameMode) {
    ctx.fillStyle = '#060e1c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.font = 'bold 42px sans-serif';
    ctx.fillStyle = '#ddeeff';
    ctx.textAlign = 'center';
    ctx.fillText('CURLING', canvas.width / 2, canvas.height / 2 - 100);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#7799bb';
    ctx.fillText('Choisissez le mode de jeu', canvas.width / 2, canvas.height / 2 - 60);

    // Buttons drawn by game.js (areas defined in input.js)
    const btns = [
      { label: '2 Joueurs (Hotseat)', mode: 'hotseat' },
      { label: 'Contre l\'IA', mode: 'vs_ai' },
    ];

    btns.forEach((b, i) => {
      const bx = canvas.width / 2 - 120;
      const by = canvas.height / 2 - 10 + i * 60;
      const selected = gameMode === b.mode;
      ctx.fillStyle = selected ? '#1a5a9a' : '#1a2a3a';
      roundRect(bx, by, 240, 44, 8);
      ctx.fill();
      ctx.strokeStyle = selected ? '#5599dd' : '#3a5a7a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(b.label, canvas.width / 2, by + 28);
    });

    // Start button
    const sbx = canvas.width / 2 - 90;
    const sby = canvas.height / 2 + 140;
    ctx.fillStyle = '#1a8a3a';
    roundRect(sbx, sby, 180, 44, 8);
    ctx.fill();
    ctx.strokeStyle = '#44cc66';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('DÉMARRER', canvas.width / 2, sby + 28);

    ctx.textAlign = 'left';
  }

  function drawScoring(result, currentEnd, scores) {
    const lines = [];
    if (result.scorer === -1) {
      lines.push({ text: 'End blanc — aucun point', color: '#aaa' });
    } else {
      lines.push({
        text: `${CONFIG.TEAM_NAMES[result.scorer]} marque ${result.points} point${result.points > 1 ? 's' : ''}!`,
        color: CONFIG.TEAM_COLORS[result.scorer],
      });
    }
    lines.push({ text: `Score: ${CONFIG.TEAM_NAMES[0]} ${scores[0]} — ${scores[1]} ${CONFIG.TEAM_NAMES[1]}`, color: '#ddf' });
    lines.push({ text: 'Cliquez pour continuer…', color: '#778' });
    drawOverlay(`Fin du End ${currentEnd}`, lines, null);
  }

  function drawGameOver(scores) {
    const winner = scores[0] > scores[1] ? 0 : scores[0] < scores[1] ? 1 : -1;
    const title = winner === -1 ? 'ÉGALITÉ !' : `${CONFIG.TEAM_NAMES[winner]} GAGNE !`;
    const lines = [
      { text: `${CONFIG.TEAM_NAMES[0]}: ${scores[0]} pts`, color: CONFIG.TEAM_COLORS[0] },
      { text: `${CONFIG.TEAM_NAMES[1]}: ${scores[1]} pts`, color: CONFIG.TEAM_COLORS[1] },
      { text: 'Cliquez pour rejouer', color: '#778' },
    ];
    drawOverlay(title, lines, null);
  }

  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return {
    init, resize, clear,
    drawRink, drawStones, drawStone, drawAimLine, drawPowerBar,
    drawHUD, drawThrowerLabel, drawSweepIndicator,
    drawMenu, drawScoring, drawGameOver,
  };
})();
