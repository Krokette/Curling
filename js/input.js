// Input manager: translates DOM events to game callbacks
// No game logic here — only event wiring.
const Input = (() => {
  const callbacks = {};

  function on(event, fn) { callbacks[event] = fn; }
  function fire(event, data) { if (callbacks[event]) callbacks[event](data); }

  function init(canvas) {
    // Mouse position in canvas space
    function canvasPos(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top)  * scaleY,
      };
    }

    canvas.addEventListener('mousemove', e => fire('mousemove', canvasPos(e)));
    canvas.addEventListener('mousedown', e => {
      if (e.button === 0) fire('mousedown', canvasPos(e));
    });
    canvas.addEventListener('mouseup', e => {
      if (e.button === 0) fire('mouseup', canvasPos(e));
    });
    canvas.addEventListener('click', e => fire('click', canvasPos(e)));

    // Touch support (mobile)
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      fire('mousedown', { x: (t.clientX - rect.left) * canvas.width / rect.width,
                           y: (t.clientY - rect.top)  * canvas.height / rect.height });
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const pos = { x: (t.clientX - rect.left) * canvas.width / rect.width,
                    y: (t.clientY - rect.top)  * canvas.height / rect.height };
      fire('mouseup', pos);
      fire('click', pos);
    }, { passive: false });

    // Keyboard
    const keys = new Set();
    window.addEventListener('keydown', e => {
      if (keys.has(e.code)) return;
      keys.add(e.code);
      fire('keydown', e.code);
    });
    window.addEventListener('keyup', e => {
      keys.delete(e.code);
      fire('keyup', e.code);
    });
  }

  // Hit-test helper: is canvas point inside a rectangle?
  function hitRect(pos, x, y, w, h) {
    return pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h;
  }

  return { init, on, hitRect };
})();
