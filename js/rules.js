// Game rules: FGZ enforcement, hog line, scoring, end/hammer management
const Rules = (() => {

  // Whose turn is it given how many stones have been thrown this end?
  // Throws alternate: non-hammer team throws even-indexed throws (0,2,4…),
  // hammer team throws odd-indexed throws (1,3,5…).
  function currentThrower(stonesThrown, hammerTeam) {
    const nonHammer = 1 - hammerTeam;
    return stonesThrown % 2 === 0 ? nonHammer : hammerTeam;
  }

  // FGZ rule: first 5 stones thrown cannot have FGZ stones removed.
  // stonesThrown = number already delivered BEFORE this shot (0-indexed).
  // FGZ protection applies when stonesThrown < 5 (i.e., for shots 0–4).
  function fgzProtectionActive(stonesThrown) {
    return stonesThrown < 5;
  }

  // Snapshot positions of stones currently in FGZ (called before each throw)
  function snapshotFGZ(stones) {
    const snapshots = [];
    for (const s of stones) {
      if (s.inPlay && !s.wasRemoved && Physics.isInFGZ(s)) {
        snapshots.push({ stone: s, x: s.x, y: s.y });
      }
    }
    return snapshots;
  }

  // After a throw resolves: check if any FGZ stone was illegally removed.
  // If so: restore the FGZ stone and remove the thrown stone.
  // Returns true if a violation was corrected.
  function enforceFGZ(fgzSnapshots, thrownStone, stonesThrown) {
    if (!fgzProtectionActive(stonesThrown)) return false;

    let violated = false;
    for (const snap of fgzSnapshots) {
      const s = snap.stone;
      // Violation: the stone was in FGZ before throw and is now removed or moved out of FGZ into non-house area behind boards
      if (s.wasRemoved) {
        // Restore the FGZ stone
        s.x = snap.x;
        s.y = snap.y;
        s.vx = 0;
        s.vy = 0;
        s.isMoving = false;
        s.wasRemoved = false;
        s.inPlay = true;
        violated = true;
      }
    }

    if (violated && thrownStone) {
      // Remove the offending thrown stone
      thrownStone.wasRemoved = true;
      thrownStone.inPlay = false;
      thrownStone.isMoving = false;
    }
    return violated;
  }

  // Calculate score for an end.
  // Returns { scorer: 0|1|-1, points: number }
  // scorer = -1 means blank end (no points).
  function scoreEnd(stones) {
    const inPlay = stones.filter(s => s.inPlay && !s.wasRemoved);
    const inHouse = inPlay.filter(s => Physics.isInHouse(s));

    if (inHouse.length === 0) return { scorer: -1, points: 0 };

    // Sort by distance to button
    inHouse.sort((a, b) => Physics.distToButton(a) - Physics.distToButton(b));

    const winner = inHouse[0].team;

    // Find distance of closest opponent stone in the house
    const opponentInHouse = inHouse.find(s => s.team !== winner);
    const opponentDist = opponentInHouse
      ? Physics.distToButton(opponentInHouse)
      : Infinity;

    // Count winner's stones closer than opponent's nearest
    const points = inHouse.filter(
      s => s.team === winner && Physics.distToButton(s) < opponentDist
    ).length;

    return { scorer: winner, points };
  }

  // Determine hammer for next end given who scored (or -1 for blank)
  function nextHammer(currentHammer, scorer) {
    if (scorer === -1) return currentHammer; // blank end: hammer unchanged
    return 1 - scorer; // scoring team loses hammer
  }

  return { currentThrower, fgzProtectionActive, snapshotFGZ, enforceFGZ, scoreEnd, nextHammer };
})();
