(() => {
  "use strict";

  const STORAGE_KEY = "multitimer.timers.v1";
  const RADIUS = 78;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const COLORS = [
    { name: "green", value: "#34d399" },
    { name: "yellow", value: "#fbbf24" },
    { name: "mint", value: "#12e0ae" },
    { name: "red", value: "#f4415e" },
    { name: "blue", value: "#3d8bfd" },
    { name: "lime", value: "#a3e635" },
    { name: "purple", value: "#a78bfa" },
    { name: "orange", value: "#fb923c" },
  ];

  /** @typedef {{id:string, label:string, emoji:string, color:string, mode:'countdown'|'stopwatch',
   *  durationMs:number, remainingMs:number, running:boolean, endAt:number|null, done:boolean}} TimerState */

  /** @type {TimerState[]} */
  let timers = loadTimers();
  let selectedColor = COLORS[0].value;

  const grid = document.getElementById("grid");
  const emptyState = document.getElementById("emptyState");
  const cardTemplate = document.getElementById("cardTemplate");

  const dialog = document.getElementById("timerDialog");
  const form = document.getElementById("timerForm");
  const addBtn = document.getElementById("addBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const colorPicker = document.getElementById("colorPicker");
  const durationFields = document.getElementById("durationFields");
  const modeCountdownBtn = document.getElementById("modeCountdown");
  const modeStopwatchBtn = document.getElementById("modeStopwatch");

  let currentMode = "countdown";

  // ---------- persistence ----------

  function loadTimers() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      /** @type {TimerState[]} */
      const parsed = JSON.parse(raw);
      // Resume running timers based on wall-clock time already elapsed.
      return parsed.map((t) => {
        if (t.running && t.mode === "countdown" && t.endAt) {
          t.remainingMs = Math.max(0, t.endAt - Date.now());
          if (t.remainingMs === 0) { t.running = false; t.done = true; }
        }
        if (t.running && t.mode === "stopwatch" && t.endAt) {
          t.remainingMs = Date.now() - t.endAt; // endAt holds start time for stopwatch
        }
        return t;
      });
    } catch {
      return [];
    }
  }

  function saveTimers() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
  }

  // ---------- helpers ----------

  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function formatTime(ms, mode) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      o.start();
      o.stop(ctx.currentTime + 0.42);
      setTimeout(() => ctx.close(), 500);
    } catch {
      /* audio unavailable — ignore */
    }
  }

  // ---------- rendering ----------

  function render() {
    grid.innerHTML = "";
    emptyState.hidden = timers.length > 0;

    for (const t of timers) {
      const node = cardTemplate.content.firstElementChild.cloneNode(true);
      node.dataset.id = t.id;
      node.style.setProperty("--ring-color", t.color);

      const progressCircle = node.querySelector(".ring-progress");
      progressCircle.style.strokeDasharray = `${CIRCUMFERENCE}`;

      node.querySelector(".ring-emoji").textContent = t.emoji || "";
      node.querySelector(".ring-label").textContent = t.label;

      node.querySelector(".ring-btn").addEventListener("click", () => toggleRun(t.id));
      node.querySelector(".card-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteTimer(t.id);
      });
      node.querySelector(".ctrl.reset").addEventListener("click", (e) => {
        e.stopPropagation();
        resetTimer(t.id);
      });

      grid.appendChild(node);
      updateCard(t);
    }
  }

  function updateCard(t) {
    const node = grid.querySelector(`.card[data-id="${t.id}"]`);
    if (!node) return;

    node.classList.toggle("running", t.running);
    node.classList.toggle("done", !!t.done);

    const timeEl = node.querySelector(".ring-time");
    const progressCircle = node.querySelector(".ring-progress");

    if (t.mode === "countdown") {
      timeEl.textContent = t.done ? "Done" : formatTime(t.remainingMs, t.mode);
      const frac = t.durationMs > 0 ? t.remainingMs / t.durationMs : 0;
      progressCircle.style.strokeDashoffset = `${CIRCUMFERENCE * (1 - frac)}`;
    } else {
      timeEl.textContent = formatTime(t.remainingMs, t.mode);
      // Stopwatch ring sweeps once per minute as a simple activity indicator.
      const frac = (t.remainingMs % 60000) / 60000;
      progressCircle.style.strokeDashoffset = `${CIRCUMFERENCE * (1 - frac)}`;
    }
  }

  // ---------- timer logic ----------

  function toggleRun(id) {
    const t = timers.find((x) => x.id === id);
    if (!t || t.done) return;

    if (t.running) {
      // pause
      if (t.mode === "countdown") {
        t.remainingMs = Math.max(0, t.endAt - Date.now());
      } else {
        t.remainingMs = Date.now() - t.endAt;
      }
      t.running = false;
      t.endAt = null;
    } else {
      // start / resume
      if (t.mode === "countdown") {
        t.endAt = Date.now() + t.remainingMs;
      } else {
        t.endAt = Date.now() - t.remainingMs;
      }
      t.running = true;
    }
    saveTimers();
    updateCard(t);
  }

  function resetTimer(id) {
    const t = timers.find((x) => x.id === id);
    if (!t) return;
    t.running = false;
    t.done = false;
    t.endAt = null;
    t.remainingMs = t.mode === "countdown" ? t.durationMs : 0;
    saveTimers();
    updateCard(t);
  }

  function deleteTimer(id) {
    timers = timers.filter((x) => x.id !== id);
    saveTimers();
    render();
  }

  function tick() {
    let changed = false;
    for (const t of timers) {
      if (!t.running) continue;
      changed = true;
      if (t.mode === "countdown") {
        t.remainingMs = Math.max(0, t.endAt - Date.now());
        if (t.remainingMs === 0) {
          t.running = false;
          t.done = true;
          t.endAt = null;
          beep();
        }
      } else {
        t.remainingMs = Date.now() - t.endAt;
      }
      updateCard(t);
    }
    if (changed) saveTimers();
    requestAnimationFrame(() => setTimeout(tick, 200));
  }

  // ---------- dialog ----------

  function buildColorPicker() {
    colorPicker.innerHTML = "";
    for (const c of COLORS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "color-swatch";
      btn.style.background = c.value;
      btn.setAttribute("aria-label", c.name);
      btn.setAttribute("aria-pressed", String(c.value === selectedColor));
      btn.addEventListener("click", () => {
        selectedColor = c.value;
        colorPicker.querySelectorAll(".color-swatch").forEach((el) =>
          el.setAttribute("aria-pressed", "false")
        );
        btn.setAttribute("aria-pressed", "true");
      });
      colorPicker.appendChild(btn);
    }
  }

  function setMode(mode) {
    currentMode = mode;
    modeCountdownBtn.setAttribute("aria-pressed", String(mode === "countdown"));
    modeStopwatchBtn.setAttribute("aria-pressed", String(mode === "stopwatch"));
    durationFields.hidden = mode !== "countdown";
  }

  function openDialog() {
    form.reset();
    document.getElementById("f-h").value = 0;
    document.getElementById("f-m").value = 5;
    document.getElementById("f-s").value = 0;
    selectedColor = COLORS[timers.length % COLORS.length].value;
    buildColorPicker();
    setMode("countdown");
    dialog.showModal();
    document.getElementById("f-label").focus();
  }

  addBtn.addEventListener("click", openDialog);
  cancelBtn.addEventListener("click", () => dialog.close());
  modeCountdownBtn.addEventListener("click", () => setMode("countdown"));
  modeStopwatchBtn.addEventListener("click", () => setMode("stopwatch"));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const label = document.getElementById("f-label").value.trim() || "Timer";
    const emoji = document.getElementById("f-emoji").value.trim();
    const h = Number(document.getElementById("f-h").value) || 0;
    const m = Number(document.getElementById("f-m").value) || 0;
    const s = Number(document.getElementById("f-s").value) || 0;
    const durationMs = ((h * 3600) + (m * 60) + s) * 1000;

    if (currentMode === "countdown" && durationMs <= 0) {
      document.getElementById("f-m").focus();
      return;
    }

    /** @type {TimerState} */
    const t = {
      id: uid(),
      label,
      emoji,
      color: selectedColor,
      mode: currentMode,
      durationMs,
      remainingMs: currentMode === "countdown" ? durationMs : 0,
      running: false,
      endAt: null,
      done: false,
    };
    timers.push(t);
    saveTimers();
    render();
    dialog.close();
  });

  // ---------- init ----------

  render();
  requestAnimationFrame(() => setTimeout(tick, 200));
})();
