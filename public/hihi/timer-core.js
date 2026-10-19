const TOTAL_MS = 20 * 1000;

function fmt(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function bootTimer({ onTick, totalMs = TOTAL_MS, lockOnEnd = false } = {}) {
  let remaining = totalMs;
  let running = true;
  let ended = false;
  let locked = false;
  let last = performance.now();

  const emit = () =>
    onTick({
      remaining,
      total: totalMs,
      running,
      ended,
      locked,
    });

  function finish() {
    ended = true;
    running = false;
    remaining = 0;
    if (lockOnEnd) locked = true;
    emit();
  }

  function frame(now) {
    if (running && !ended && !locked) {
      remaining -= now - last;
      if (remaining <= 0) finish();
      else emit();
    }
    last = now;
    requestAnimationFrame(frame);
  }

  const toggle = document.getElementById("toggle");
  const reset = document.getElementById("reset");

  if (toggle) {
    toggle.addEventListener("click", () => {
      if (locked) return;
      if (ended) {
        remaining = totalMs;
        ended = false;
        running = true;
        emit();
        return;
      }
      running = !running;
      emit();
    });
  }

  if (reset) {
    reset.addEventListener("click", () => {
      remaining = totalMs;
      ended = false;
      running = true;
      locked = false;
      emit();
    });
  }

  emit();
  requestAnimationFrame((t) => {
    last = t;
    requestAnimationFrame(frame);
  });
}
