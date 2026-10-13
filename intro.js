/* PreRoute AI — opening intro (side view)
   A container ship sails across a light sea, its bow cutting the water and
   leaving a foam wake. Once it has passed, the scene parts along the waterline
   to reveal the page underneath. */
(function () {
  "use strict";

  const root = document.documentElement;
  const intro = document.getElementById("intro");
  if (!intro || !root.classList.contains("intro-on")) return;

  const canvas = document.getElementById("introCanvas");
  const ctx = canvas.getContext("2d");
  const SHIP_MS = 4800;   // ship crossing
  const SPLIT_MS = 1100;  // water parting

  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = intro.clientWidth; H = intro.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener("resize", resize);

  const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const rand = (a, b) => a + Math.random() * (b - a);

  // deterministic container colours: light, mostly cool, a few amber
  function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
  const PALETTE = ["#E2E8F0", "#CBD5E1", "#DBEAFE", "#BFDBFE", "#F1F5F9", "#93C5FD", "#E2E8F0", "#FFFFFF", "#CBD5E1", "#DBEAFE"];
  const containerColors = (() => {
    const r = rng(7), out = [];
    for (let i = 0; i < 200; i++) out.push(r() < 0.06 ? "#FCD34D" : PALETTE[Math.floor(r() * PALETTE.length)]);
    return out;
  })();

  const FONT = 'NanumSquareNeo, "Malgun Gothic", sans-serif';

  /* ---------- Scene layers ---------- */
  const waterline = () => H * 0.64;
  const wave = (x, t, amp, len, speed, ph) =>
    Math.sin(x / len + t * speed + ph) * amp + Math.sin(x / (len * 0.43) - t * speed * 1.3 + ph * 2) * amp * 0.35;

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, waterline());
    g.addColorStop(0, "#FFFFFF");
    g.addColorStop(1, "#F2F7FF");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, waterline() + 20);
  }

  function drawBrand(alpha) {
    const fs = Math.max(26, Math.min(54, W * 0.042));
    const y = H * 0.22;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textBaseline = "middle";
    ctx.font = `800 ${fs}px ${FONT}`;
    const a = "PreRoute ", wa = ctx.measureText(a).width;
    ctx.font = `400 ${fs}px ${FONT}`;
    const wb = ctx.measureText("AI").width;
    const x0 = W / 2 - (wa + wb) / 2;
    ctx.textAlign = "left";
    ctx.font = `800 ${fs}px ${FONT}`;
    ctx.fillStyle = "#0F172A";
    ctx.fillText(a, x0, y);
    ctx.font = `400 ${fs}px ${FONT}`;
    ctx.fillStyle = "#2563EB";
    ctx.fillText("AI", x0 + wa, y);
    ctx.textAlign = "center";
    ctx.font = `700 ${Math.round(fs * 0.32)}px ${FONT}`;
    ctx.fillStyle = "#64748B";
    ctx.fillText("보이지 않던 위기까지, 한 눈에 우회합니다", W / 2, y + fs * 0.95);
    ctx.restore();
  }

  function drawWaterBack(t) {
    const wl = waterline();
    const g = ctx.createLinearGradient(0, wl, 0, H);
    g.addColorStop(0, "#E6F0FF");
    g.addColorStop(1, "#D3E3FD");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, wl - 6 + wave(x, t, 3, 90, 0.0012, 1));
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(37, 99, 235, 0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W + 20; x += 20) {
      const y = wl - 6 + wave(x, t, 3, 90, 0.0012, 1);
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }

  function drawWaterFront(t) {
    const wl = waterline();
    // translucent front water hides the hull below the waterline
    const g = ctx.createLinearGradient(0, wl, 0, H);
    g.addColorStop(0, "rgba(222, 235, 255, 0.94)");
    g.addColorStop(1, "rgba(206, 224, 253, 0.98)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + 16; x += 16) ctx.lineTo(x, wl + 2 + wave(x, t, 2.4, 60, 0.002, 0));
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // soft swell lines below
    for (let i = 0; i < 6; i++) {
      const y0 = wl + 26 + i * Math.max(22, (H - wl) / 7);
      if (y0 > H) break;
      ctx.strokeStyle = `rgba(37, 99, 235, ${0.07 - i * 0.008})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = 0; x <= W + 24; x += 24) {
        const y = y0 + wave(x, t, 2.5 + i * 0.4, 70 + i * 10, 0.0016, i);
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }

  /* ---------- Ship (side profile, bow to the right) ---------- */
  function drawShip(x, wl, L, tilt) {
    ctx.save();
    ctx.translate(x, wl);
    ctx.rotate(tilt);

    const hull = new Path2D();
    hull.moveTo(0.015 * L, -0.078 * L);
    hull.lineTo(0.03 * L, -0.012 * L);
    hull.quadraticCurveTo(0.04 * L, 0.035 * L, 0.09 * L, 0.04 * L);
    hull.lineTo(0.9 * L, 0.04 * L);
    hull.quadraticCurveTo(0.985 * L, 0.04 * L, 0.99 * L, 0.016 * L);
    hull.quadraticCurveTo(0.992 * L, -0.002 * L, 0.966 * L, -0.004 * L);
    hull.quadraticCurveTo(0.99 * L, -0.05 * L, 1.0 * L, -0.096 * L);
    hull.lineTo(0.93 * L, -0.092 * L);
    hull.lineTo(0.905 * L, -0.079 * L);
    hull.lineTo(0.015 * L, -0.078 * L);
    hull.closePath();

    ctx.shadowColor = "rgba(30, 64, 175, 0.18)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    const hg = ctx.createLinearGradient(0, -0.096 * L, 0, 0);
    hg.addColorStop(0, "#3B82F6");
    hg.addColorStop(1, "#2563EB");
    ctx.fillStyle = hg;
    ctx.fill(hull);
    ctx.shadowColor = "transparent";

    // underwater body + boot stripe
    ctx.save();
    ctx.clip(hull);
    ctx.fillStyle = "#A9C7F8";
    ctx.fillRect(0, -0.006 * L, L * 1.05, 0.06 * L);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, -0.011 * L, L * 1.05, 0.006 * L);
    ctx.restore();

    // deck highlight + hull name
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0.02 * L, -0.077 * L);
    ctx.lineTo(0.905 * L, -0.078 * L);
    ctx.lineTo(0.93 * L, -0.091 * L);
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.font = `800 ${Math.max(9, 0.021 * L)}px ${FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${0.004 * L}px`;
    ctx.fillText("PREROUTE AI", 0.7 * L, -0.044 * L);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

    // container stacks
    const x0 = 0.165 * L, x1 = 0.9 * L, bays = 17;
    const bw = (x1 - x0) / bays, ch = 0.0225 * L, deck = -0.078 * L;
    const gap = Math.max(1, L * 0.0018);
    let ci = 0;
    for (let b = 0; b < bays; b++) {
      const tiers = b >= bays - 1 ? 2 : b >= bays - 2 ? 3 : b >= bays - 3 ? 4 : 5;
      for (let k = 0; k < tiers; k++) {
        const cx = x0 + b * bw, cy = deck - (k + 1) * ch;
        ctx.fillStyle = containerColors[ci++ % containerColors.length];
        ctx.fillRect(cx + gap / 2, cy + gap / 2, bw - gap, ch - gap);
        ctx.fillStyle = "rgba(15, 23, 42, 0.05)";
        ctx.fillRect(cx + gap / 2, cy + ch - gap * 1.5, bw - gap, gap);
      }
    }

    // superstructure (bridge)
    const sx = 0.05 * L, sw = 0.095 * L, top = -0.215 * L;
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 1;
    ctx.fillRect(sx, top, sw, deck - top);
    ctx.strokeRect(sx, top, sw, deck - top);
    const floors = 5, fh = (deck - top) / floors;
    for (let f = 0; f < floors; f++) {
      const fy = top + f * fh;
      ctx.fillStyle = f === 0 ? "#1E40AF" : "#BFDBFE";
      ctx.fillRect(sx + sw * 0.08, fy + fh * 0.3, sw * 0.84, f === 0 ? fh * 0.38 : fh * 0.26);
    }
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(sx - 0.012 * L, top, sw + 0.024 * L, fh * 0.22);
    ctx.strokeRect(sx - 0.012 * L, top, sw + 0.024 * L, fh * 0.22);

    // funnel with amber band
    const fx = sx + sw * 0.25, fw = sw * 0.38, ftop = top - 0.04 * L;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(fx, ftop, fw, top - ftop);
    ctx.strokeRect(fx, ftop, fw, top - ftop);
    ctx.fillStyle = "#F59E0B";
    ctx.fillRect(fx, ftop + (top - ftop) * 0.3, fw, (top - ftop) * 0.28);
    ctx.fillStyle = "#475569";
    ctx.fillRect(fx, ftop, fw, (top - ftop) * 0.12);

    // fore mast
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = Math.max(1.5, L * 0.0025);
    ctx.beginPath();
    ctx.moveTo(0.955 * L, -0.093 * L);
    ctx.lineTo(0.955 * L, -0.16 * L);
    ctx.stroke();
    ctx.fillStyle = "#F59E0B";
    ctx.beginPath();
    ctx.arc(0.955 * L, -0.163 * L, Math.max(2, L * 0.004), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /* ---------- Water particles ---------- */
  const spray = [];  // bow spray (ballistic)
  const foam = [];   // wake foam on the surface

  function emit(bowX, sternX, wl, L, speed, dt) {
    const s = L / 700;
    const nSpray = Math.round(dt * 0.14 * Math.min(1, speed / 300));
    for (let i = 0; i < nSpray; i++) {
      spray.push({ x: bowX + rand(0.005, 0.04) * L, y: wl - rand(0.015, 0.045) * L,
        vx: speed * rand(0.95, 1.2) + rand(10, 70) * s, vy: -rand(50, 170) * s, r: rand(1, 2.6) * s, age: 0, life: rand(400, 750) });
    }
    const nFoam = Math.round(dt * 0.6);
    for (let i = 0; i < nFoam; i++) {
      const atStern = Math.random() < 0.55;
      const fx = atStern ? sternX + rand(-0.06, 0.04) * L : rand(sternX, bowX - 0.1 * L);
      foam.push({ x: fx, y: wl + (atStern ? rand(-3, 9) : rand(-1, 4)) * s, vx: rand(-30, 0) * s,
        r: rand(2, atStern ? 8 : 4) * s, age: 0, life: rand(2200, 4000) });
    }
    if (spray.length > 500) spray.splice(0, spray.length - 500);
    if (foam.length > 1400) foam.splice(0, foam.length - 1400);
  }

  function stepParticles(dt, wl) {
    for (let i = spray.length - 1; i >= 0; i--) {
      const p = spray[i];
      p.age += dt;
      p.vy += 520 * dt / 1000;            // gravity
      p.x += p.vx * dt / 1000;
      p.y += p.vy * dt / 1000;
      if (p.age > p.life || p.y > wl + 4) spray.splice(i, 1);
    }
    for (let i = foam.length - 1; i >= 0; i--) {
      const p = foam[i];
      p.age += dt;
      p.x += p.vx * dt / 1000;
      if (p.age > p.life) foam.splice(i, 1);
    }
  }

  function drawFoam() {
    for (const p of foam) {
      const k = 1 - p.age / p.life;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * k})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r * (2.2 + (1 - k) * 1.5), p.r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSpray() {
    ctx.lineWidth = 1;
    for (const p of spray) {
      const k = 1 - p.age / p.life;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * k})`;
      ctx.strokeStyle = `rgba(147, 197, 253, ${0.7 * k})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawBowWave(bowX, wl, L, t, power) {
    const h = 0.05 * L * power * (1 + 0.1 * Math.sin(t / 110));
    const g = ctx.createLinearGradient(0, wl - h, 0, wl + 4);
    g.addColorStop(0, "rgba(255, 255, 255, 0.98)");
    g.addColorStop(1, "rgba(219, 234, 254, 0.95)");

    // water climbing the stem and curling forward
    ctx.fillStyle = g;
    ctx.strokeStyle = "rgba(147, 197, 253, 0.85)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(bowX - 0.17 * L, wl + 3);
    ctx.bezierCurveTo(bowX - 0.1 * L, wl - h * 0.25, bowX - 0.03 * L, wl - h * 0.7, bowX - 0.004 * L, wl - h);
    ctx.bezierCurveTo(bowX + 0.02 * L, wl - h * 1.05, bowX + 0.045 * L, wl - h * 0.75, bowX + 0.05 * L, wl - h * 0.4);
    ctx.bezierCurveTo(bowX + 0.06 * L, wl - h * 0.1, bowX + 0.09 * L, wl + 1, bowX + 0.13 * L, wl + 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // inner streaks of moving water
    ctx.strokeStyle = "rgba(147, 197, 253, 0.55)";
    ctx.lineWidth = 1.1;
    for (let i = 1; i <= 3; i++) {
      const k = i / 4;
      ctx.beginPath();
      ctx.moveTo(bowX - (0.14 - k * 0.05) * L, wl + 1);
      ctx.quadraticCurveTo(bowX - 0.02 * L, wl - h * (0.9 - k * 0.5), bowX + (0.03 + k * 0.03) * L, wl - h * (0.35 - k * 0.25));
      ctx.stroke();
    }

    // secondary crest further aft along the hull
    ctx.fillStyle = g;
    ctx.strokeStyle = "rgba(147, 197, 253, 0.7)";
    ctx.beginPath();
    ctx.moveTo(bowX - 0.42 * L, wl + 3);
    ctx.quadraticCurveTo(bowX - 0.3 * L, wl - h * 0.32, bowX - 0.19 * L, wl + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawSternWash(sternX, wl, L, t, power) {
    // churned white water trailing the stern, fading out behind the ship
    const len = 0.45 * L, s = L / 700;
    const g = ctx.createLinearGradient(sternX - len, 0, sternX + 0.02 * L, 0);
    g.addColorStop(0, "rgba(255, 255, 255, 0)");
    g.addColorStop(1, `rgba(255, 255, 255, ${0.9 * power})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sternX + 0.02 * L, wl + 6 * s);
    for (let i = 0; i <= 24; i++) {
      const x = sternX + 0.02 * L - (i / 24) * len;
      const bump = (Math.sin(i * 1.7 + t / 140) * 0.5 + 0.5) * 7 * s * (1 - i / 30);
      ctx.lineTo(x, wl - 2 * s - bump);
    }
    ctx.lineTo(sternX - len, wl + 9 * s);
    ctx.closePath();
    ctx.fill();
  }

  /* ---------- Timeline ---------- */
  let t0 = 0, last = 0, raf = 0, finished = false, splitShot = null, splitStart = 0;

  function drawScene(el, dt) {
    const wl = waterline();
    const L = Math.max(340, Math.min(860, W * 0.56));
    const travel = W + L * 1.1;
    const p = easeInOutSine(Math.min(1, el / SHIP_MS));
    const x = -L * 1.05 + travel * p;   // stern x
    const speed = travel * (Math.PI / 2) * Math.sin(Math.PI * Math.min(1, el / SHIP_MS)) / SHIP_MS * 1000; // px/s
    const bob = Math.sin(el / 520) * 0.004;
    const heave = Math.sin(el / 610) * 1.6;

    if (dt > 0) {
      emit(x + L * 0.975, x + 0.03 * L, wl, L, speed, dt);
      stepParticles(dt, wl);
    }

    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawBrand(Math.min(1, el / 600));
    drawWaterBack(el);
    drawShip(x, wl + heave + 0.022 * L, L, bob);
    drawWaterFront(el);
    const power = Math.min(1, 0.35 + speed / 700);
    drawSternWash(x + 0.03 * L, wl, L, el, power);
    drawFoam();
    drawBowWave(x + L * 0.975, wl, L, el, power);
    drawSpray();
  }

  function frame(now) {
    if (!t0) { t0 = now; last = now; }
    const dt = Math.min(48, now - last);
    last = now;
    const el = now - t0;

    if (el < SHIP_MS) {
      drawScene(el, dt);
      intro.classList.add("is-painted");
      raf = requestAnimationFrame(frame);
      return;
    }

    // Part the scene along the waterline
    if (!splitShot) {
      splitShot = document.createElement("canvas");
      splitShot.width = canvas.width; splitShot.height = canvas.height;
      splitShot.getContext("2d").drawImage(canvas, 0, 0);
      splitStart = now;
    }
    const k = Math.min(1, (now - splitStart) / SPLIT_MS);
    const e = easeInOutCubic(k);
    const wl = waterline();
    const upOff = e * (wl + 10), downOff = e * (H - wl + 10);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(splitShot, 0, 0, W * dpr, wl * dpr, 0, -upOff, W, wl);
    ctx.drawImage(splitShot, 0, wl * dpr, W * dpr, (H - wl) * dpr, 0, wl + downOff, W, H - wl);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * (1 - e)})`;
    ctx.fillRect(0, wl - upOff - 2, W, 3);
    ctx.fillRect(0, wl + downOff - 1, W, 3);

    if (k < 1) raf = requestAnimationFrame(frame);
    else finish();
  }

  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    intro.classList.add("is-done");
    if (!root.classList.contains("intro-end")) {
      root.classList.add("intro-end");
      document.dispatchEvent(new Event("intro:end"));
    }
    setTimeout(() => intro.remove(), 500);
  }

  const skip = document.getElementById("introSkip");
  if (skip) skip.addEventListener("click", finish);
  addEventListener("keydown", (e) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish(); });
  addEventListener("wheel", finish, { once: true, passive: true });

  // Wait briefly for the brand font so the wordmark renders correctly
  const go = () => { raf = requestAnimationFrame(frame); };
  if (document.fonts && document.fonts.load) {
    Promise.race([
      document.fonts.load("800 40px NanumSquareNeo"),
      new Promise((r) => setTimeout(r, 400)),
    ]).then(go, go);
  } else {
    go();
  }
})();
