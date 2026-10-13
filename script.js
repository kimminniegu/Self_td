/* PreRoute AI — product site interactions */
(function () {
  "use strict";

  /* ---------- Map projection (lon -30..160, lat 70..-45) ---------- */
  const SVG_NS = "http://www.w3.org/2000/svg";
  const px = (lon) => (lon + 30) * 4;
  const py = (lat) => (70 - lat) * 4;
  const pt = ([lon, lat]) => [px(lon), py(lat)];

  // Simplified land mask: latitude row -> [lonStart, lonEnd] spans
  const LAND = {
    70: [[-30, -20], [18, 160]],
    65: [[-30, -20], [-22, -14], [12, 160]],
    60: [[5, 10], [12, 28], [30, 160]],
    55: [[-6, -1], [9, 14], [21, 137], [156, 160]],
    50: [[-5, 1], [2, 140], [142, 143]],
    45: [[-1, 13], [19, 29], [37, 47], [53, 135], [141, 145]],
    40: [[-9, 3], [12, 17], [20, 23], [27, 49], [53, 118], [122, 125], [126, 129], [140, 142]],
    35: [[-6, 11], [24, 26], [33, 121], [127, 129], [132, 140]],
    30: [[-10, 48], [50, 122], [130, 131]],
    25: [[-15, 35], [38, 56], [61, 120], [120, 122]],
    20: [[-17, 37], [40, 58], [72, 87], [92, 108], [109, 111]],
    15: [[-17, 39], [43, 51], [74, 80], [97, 109], [120, 122]],
    10: [[-15, 51], [76, 80], [98, 107], [122, 126]],
    5: [[-8, 47], [80, 82], [100, 104], [114, 119], [124, 126]],
    0: [[9, 42], [98, 104], [109, 118], [120, 125]],
    "-5": [[12, 39], [102, 106], [106, 114], [132, 150]],
    "-10": [[13, 40], [142, 143]],
    "-15": [[12, 40], [44, 50], [125, 145]],
    "-20": [[13, 35], [44, 48], [115, 149]],
    "-25": [[15, 33], [45, 47], [113, 153]],
    "-30": [[17, 31], [115, 153]],
    "-35": [[18, 26], [116, 123], [135, 150]],
    "-40": [[145, 148]],
  };
  const isLand = (lon, lat) => {
    const row = LAND[String(Math.round(lat / 5) * 5)];
    return !!row && row.some(([a, b]) => lon >= a && lon <= b);
  };

  /* ---------- Route geometry ---------- */
  const BUSAN = [129, 35], SINGAPORE = [104, 1.3], COLOMBO = [80, 5.5], ROTTERDAM = [4.3, 51.9];
  const ASIA = [BUSAN, [127, 30], [120, 20], [110, 10], SINGAPORE];
  const INDIAN = [SINGAPORE, [97, 6], [88, 6], COLOMBO];
  const REDSEA = [COLOMBO, [65, 12], [51, 12.5], [43.4, 12.6], [40, 16], [37, 21], [34, 27], [32.5, 30], [32.3, 31.3]];
  const MED = [[32.3, 31.3], [25, 33.5], [15, 36], [5, 37.5], [-5.6, 36], [-10, 38], [-10, 44], [-6, 48], [-3, 49.8], [2, 51]];
  const NORTHSEA = [[2, 51], ROTTERDAM];
  const BASE = [...ASIA, ...INDIAN.slice(1), ...REDSEA.slice(1), ...MED.slice(1), ...NORTHSEA.slice(1)];

  /* ---------- Scenario data (amounts in 억 원) ---------- */
  const SCENARIOS = {
    redsea: {
      title: "홍해 · 수에즈 통항 정체 리스크 감지",
      when: "D-2 · 48시간 전 감지",
      ships: 12, delay: 9, base: 8.4,
      lane: "부산 → 로테르담",
      risk: { at: [38, 19], label: "홍해 통항 정체", path: REDSEA.slice(2), side: "right" },
      alt: { path: [COLOMBO, [70, -5], [55, -20], [40, -30], [25, -36], [18.5, -34.6], [12, -25], [8, -10], [0, 0], [-20, 10], [-20, 20], [-18, 30], [-12, 38], [-10, 44], [-6, 48], [-3, 49.8], [2, 51], ROTTERDAM],
             label: "희망봉", labelAt: [18.5, -34.6], labelDx: 10, labelDy: 18 },
      routes: [
        { name: "희망봉 우회", sub: "포워더 A · 계약 요율 적용", delay: 4, extra: 0.9, net: 1.3 },
        { name: "Sea-Air 두바이 환적", sub: "포워더 C · 항공 구간 포함", delay: 1, extra: 3.8, net: 4.0 },
        { name: "수에즈 대기 후 통항", sub: "포워더 B · 대기 선복", delay: 9, extra: 0.2, net: 6.1 },
      ],
    },
    typhoon: {
      title: "남중국해 태풍 북상 · 항로 영향 예상",
      when: "D-2 · 44시간 전 감지",
      ships: 8, delay: 5, base: 5.2,
      lane: "부산 → 로테르담",
      risk: { at: [117, 18], label: "태풍 진로", path: ASIA.slice(1, 4), side: "left" },
      alt: { path: [BUSAN, [131, 28], [129, 15], [127, 3], [123, -4], [116, -9.5], [105, -10], [92, -2], COLOMBO],
             label: "롬복 해협", labelAt: [116, -9.5], labelDx: 10, labelDy: 18 },
      routes: [
        { name: "롬복 해협 우회", sub: "포워더 A · 선복 확보 가능", delay: 2, extra: 0.6, net: 0.9 },
        { name: "상하이 환적 변경", sub: "포워더 B · 환적 수수료 포함", delay: 3, extra: 1.1, net: 2.6 },
        { name: "출항 연기", sub: "현 선사 유지", delay: 5, extra: 0, net: 4.6 },
      ],
    },
    strike: {
      title: "로테르담항 파업 예고 · 하역 중단 가능성",
      when: "D-2 · 48시간 전 감지",
      ships: 15, delay: 7, base: 11.6,
      lane: "부산 → 북유럽 양하항",
      risk: { at: ROTTERDAM, label: "로테르담 파업", path: NORTHSEA, side: "below" },
      alt: { path: [[-6, 48], [-3, 49.8], [2, 51], [5, 53.6], [8.5, 54], [9.9, 53.5]],
             label: "함부르크", labelAt: [9.9, 53.5], labelDx: 8, labelDy: -12 },
      routes: [
        { name: "함부르크 양하 + 내륙 운송", sub: "포워더 B · 트럭 연계", delay: 1, extra: 1.4, net: 1.8 },
        { name: "앤트워프 양하", sub: "포워더 A · 항만 혼잡도 보통", delay: 2, extra: 1.9, net: 2.9 },
        { name: "르아브르 양하 + 철송", sub: "포워더 C · 철도 연계", delay: 3, extra: 2.2, net: 4.1 },
      ],
    },
  };

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const won = (v) => "₩" + v.toFixed(1) + "억";
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  /* ---------- SVG helpers ---------- */
  function el(name, attrs, parent) {
    const n = document.createElementNS(SVG_NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  const d = (path) => path.map((p, i) => (i ? "L" : "M") + pt(p).join(",")).join(" ");

  const map = $("#map");
  const land = el("g", {}, map);
  const layer = el("g", {}, map);

  // Draw dot-matrix land once
  for (let lat = 70; lat >= -45; lat -= 2.5) {
    for (let lon = -30; lon <= 160; lon += 2.5) {
      if (isLand(lon, lat)) el("circle", { class: "land", cx: px(lon), cy: py(lat), r: 3.4 }, land);
    }
  }

  function port(p, label, dx, dy, cls) {
    const [x, y] = pt(p);
    el("circle", { class: "port", cx: x, cy: y, r: 5 }, layer);
    const t = el("text", { class: "port-lbl " + (cls || ""), x: x + dx, y: y + dy }, layer);
    t.textContent = label;
    return t;
  }

  let shipRaf = 0;
  function drawScenario(sc) {
    cancelAnimationFrame(shipRaf);
    layer.innerHTML = "";

    el("path", { class: "route-base", d: d(BASE) }, layer);
    el("path", { class: "route-risk", d: d(sc.risk.path) }, layer);

    const alt = el("path", { class: "route-alt", d: d(sc.alt.path) }, layer);
    const len = alt.getTotalLength();
    if (!reduceMotion) {
      alt.style.strokeDasharray = len;
      alt.style.strokeDashoffset = len;
      void alt.getBoundingClientRect();
      alt.classList.add("draw");
    }

    port(BUSAN, "부산", 10, 4);
    port(SINGAPORE, "싱가포르", -78, 22);
    port(ROTTERDAM, "로테르담", -80, -10);
    port(sc.alt.labelAt, sc.alt.label, sc.alt.labelDx, sc.alt.labelDy, "alt");

    // Risk marker + label
    const [rx, ry] = pt(sc.risk.at);
    el("circle", { class: "risk-ring", cx: rx, cy: ry, r: 16 }, layer);
    el("circle", { class: "risk-core", cx: rx, cy: ry, r: 7 }, layer);
    const g = el("g", { class: "risk-lbl" }, layer);
    const w = sc.risk.label.length * 15 + 46;
    let lx = rx + 16, ly = ry - 14;
    if (sc.risk.side === "left") lx = rx - w - 16;
    if (sc.risk.side === "below") { lx = rx + 6; ly = ry + 16; }
    el("rect", { x: lx, y: ly, width: w, height: 32, rx: 16 }, g);
    const t = el("text", { x: lx + 14, y: ly + 21.5 }, g);
    t.textContent = "⚠ " + sc.risk.label;

    // Ship travelling along the recommended route
    if (reduceMotion) return;
    const ship = el("circle", { class: "ship", r: 6 }, layer);
    const start = performance.now() + 1500;
    const loop = (now) => {
      const k = Math.max(0, ((now - start) / 6000) % 1);
      const p = alt.getPointAtLength(k * len);
      ship.setAttribute("cx", p.x);
      ship.setAttribute("cy", p.y);
      shipRaf = requestAnimationFrame(loop);
    };
    shipRaf = requestAnimationFrame(loop);
  }

  /* ---------- Dashboard state ---------- */
  function render(key) {
    const sc = SCENARIOS[key];
    const best = sc.routes[0];
    const save = sc.base - best.net;
    const rate = Math.round((save / sc.base) * 100);
    const remainingPenalty = Math.max(0, best.net - best.extra);

    const alert = $("#alert");
    alert.classList.remove("flash");
    void alert.offsetWidth;
    alert.classList.add("flash");

    $("#alertTitle").textContent = sc.title;
    $("#alertDesc").textContent = `영향 선적 ${sc.ships}건 · 예상 지연 ${sc.delay}일 · 지연 시 예상 위약금 ${won(sc.base)}`;
    $("#alertTime").textContent = sc.when;
    $("#sideAlert").textContent = sc.ships;
    $("#kRisk").textContent = sc.ships;
    $("#kLoss").textContent = won(sc.base);
    $("#kSave").textContent = won(save);
    $("#kRate").textContent = rate + "%";
    $("#routeLane").textContent = sc.lane;

    $("#routes").innerHTML = sc.routes.map((r, i) => `
      <li class="route ${i === 0 ? "best" : ""}">
        <span class="rk">${i + 1}</span>
        <span class="rn">${r.name}${i === 0 ? '<span class="rec">추천</span>' : ""}<small>${r.sub}</small></span>
        <span class="rv"><b>${won(r.net)}</b><small>예상 순손실</small></span>
        <span class="rmeta"><span>도착 +${r.delay}일</span><span>추가 운임 ${won(r.extra)}</span></span>
      </li>`).join("");

    $("#vBase").textContent = won(sc.base);
    $("#vAlt").textContent = won(best.net);
    $("#barBase").style.width = "0";
    $("#barAlt").style.width = "0";
    requestAnimationFrame(() => setTimeout(() => {
      $("#barBase").style.width = "100%";
      $("#barAlt").style.width = Math.max(4, (best.net / sc.base) * 100) + "%";
    }, 60));
    $("#cmpNote").innerHTML = `추가 운임 ${won(best.extra)}을 쓰고 위약금 ${won(sc.base - remainingPenalty)}을 피합니다. <b>${won(save)} (${rate}%) 방어</b>`;

    resetConfirm();
    drawScenario(sc);
  }

  /* ---------- One-click confirm ---------- */
  const confirmBtn = $("#confirmBtn");
  function resetConfirm() {
    confirmBtn.classList.remove("done");
    confirmBtn.textContent = "추천 경로 원클릭 확정";
    $$("[data-doc]").forEach((s) => { s.textContent = "대기"; s.classList.remove("ok"); });
  }
  confirmBtn.addEventListener("click", () => {
    if (confirmBtn.classList.contains("done")) return;
    confirmBtn.textContent = "문서 생성 중…";
    const docs = $$("[data-doc]");
    docs.forEach((s, i) => setTimeout(() => { s.textContent = "생성 완료"; s.classList.add("ok"); }, 450 + i * 350));
    setTimeout(() => {
      confirmBtn.classList.add("done");
      confirmBtn.textContent = "✓ 확정됨 · 문서 2건 발행";
      toast("보고서와 바이어 안내문이 생성되었습니다.");
    }, 450 + docs.length * 350);
  });

  /* ---------- Scenario tabs ---------- */
  $$(".sc-tab").forEach((tab) => tab.addEventListener("click", () => {
    $$(".sc-tab").forEach((t) => { t.classList.toggle("is-active", t === tab); t.setAttribute("aria-selected", t === tab); });
    render(tab.dataset.sc);
    lastUpdate = Date.now();
  }));

  /* ---------- "updated n seconds ago" ---------- */
  let lastUpdate = Date.now();
  setInterval(() => {
    const s = Math.floor((Date.now() - lastUpdate) / 1000);
    $("#updated").textContent = s < 5 ? "방금 업데이트" : `${s}초 전 업데이트`;
    if (s >= 30) lastUpdate = Date.now();
  }, 1000);

  /* ---------- Feature doc tabs ---------- */
  $$("[data-doc-tab]").forEach((b) => b.addEventListener("click", () => {
    $$("[data-doc-tab]").forEach((x) => x.classList.toggle("is-active", x === b));
    $$("[data-doc-panel]").forEach((p) => { p.hidden = p.dataset.docPanel !== b.dataset.docTab; });
  }));

  /* ---------- Hero counters (start after the intro) ---------- */
  const startCounters = () => $$("[data-count]").forEach((n) => {
    const target = +n.dataset.count, suffix = n.dataset.suffix || "";
    if (reduceMotion) { n.textContent = target + suffix; return; }
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 1200);
      n.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + suffix;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  const root = document.documentElement;
  if (root.classList.contains("intro-on") && !root.classList.contains("intro-end")) {
    document.addEventListener("intro:end", startCounters, { once: true });
  } else {
    startCounters();
  }

  /* ---------- Reveal on scroll ---------- */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: 0.15 });
    $$(".reveal").forEach((r) => io.observe(r));
  } else {
    $$(".reveal").forEach((r) => r.classList.add("in"));
  }

  /* ---------- Nav border + CTA ---------- */
  const nav = $("#nav");
  addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 8), { passive: true });

  $("#ctaForm").addEventListener("submit", (e) => {
    e.preventDefault();
    $("#ctaMsg").textContent = "신청이 접수되었습니다. 영업일 기준 1일 내 연락드리겠습니다.";
    e.target.reset();
  });

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  // Optional deep link: index.html?sc=typhoon | strike
  const initial = new URLSearchParams(location.search).get("sc");
  const initialTab = SCENARIOS[initial] && $(`.sc-tab[data-sc="${initial}"]`);
  if (initialTab) initialTab.click(); else render("redsea");
})();
