const API_URL = "http://127.0.0.1:8000";  // change when you deploy
const $ = (id) => document.getElementById(id);

const fileInput = $("file"), dropzone = $("dropzone"), analyzeBtn = $("analyze");
const statusEl = $("status"), results = $("results");
const spinner = analyzeBtn.querySelector(".spinner"), label = $("analyze-label");
let mode = "photo", currentFile = null;

const POSE_ICONS = {
  "walking": "🚶", "sitting": "🪑", "leaning": "🧱", "twirling": "💃",
  "hand-in-pocket": "🧥", "collar-adjust": "👔",
  "over-the-shoulder-glance": "👀", "crouching": "🧎",
};

// backend connection indicator
function setConn(ok) {
  $("conn").className = "conn " + (ok ? "ok" : "bad");
  $("conn").querySelector("span").textContent = ok ? "Backend connected" : "Backend offline: run uvicorn";
}
fetch(API_URL + "/").then((r) => setConn(r.ok)).catch(() => setConn(false));

// tabs
document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => {
  mode = tab.dataset.mode;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
  $("photo-panel").hidden = mode !== "photo";
  $("text-panel").hidden = mode !== "text";
  updateButton();
}));

// file selection: Browse button, click on the box, drag & drop, paste
$("browse").addEventListener("click", (e) => { e.stopPropagation(); fileInput.click(); });
dropzone.addEventListener("click", () => { if (!currentFile) fileInput.click(); });
fileInput.addEventListener("change", () => setFile(fileInput.files[0]));

["dragenter", "dragover"].forEach((ev) => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add("drag"); }));
["dragleave", "drop"].forEach((ev) => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove("drag"); }));
dropzone.addEventListener("drop", (e) => setFile(e.dataTransfer.files[0]));

document.addEventListener("paste", (e) => {
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
  if (item) { document.querySelector('[data-mode="photo"]').click(); setFile(item.getAsFile()); }
});

$("remove").addEventListener("click", (e) => {
  e.stopPropagation();
  currentFile = null; fileInput.value = "";
  $("drop-filled").hidden = true; $("drop-empty").hidden = false;
  updateButton();
});

function setFile(file) {
  if (!file) return;
  if (!["image/jpeg", "image/png"].includes(file.type)) { toast("Please use a JPG or PNG image"); return; }
  currentFile = file;
  $("preview").src = URL.createObjectURL(file);
  $("drop-empty").hidden = true; $("drop-filled").hidden = false;
  updateButton();
}

$("desc").addEventListener("input", updateButton);
function updateButton() {
  analyzeBtn.disabled = mode === "photo" ? !currentFile : $("desc").value.trim().length < 3;
}

// analyze
const MESSAGES = ["Studying your outfit… ", "Picking out poses… ", "Mixing your palette… ", "Writing captions… "];

analyzeBtn.addEventListener("click", async () => {
  analyzeBtn.disabled = true; spinner.hidden = false; label.textContent = "Analyzing…";
  results.hidden = true;
  let i = 0;
  statusEl.textContent = MESSAGES[0];
  const timer = setInterval(() => { statusEl.textContent = MESSAGES[++i % MESSAGES.length]; }, 1800);

  try {
    const form = new FormData();
    let path;
    if (mode === "photo") { form.append("file", currentFile); path = "/analyze/image"; }
    else { form.append("description", $("desc").value.trim()); path = "/analyze/text"; }

    const res = await fetch(API_URL + path, { method: "POST", body: form });
    if (!res.ok) throw new Error(`Server error (${res.status})`);
    render(await res.json());
    setConn(true);
    statusEl.textContent = "";
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    const offline = err.message === "Failed to fetch";
    if (offline) setConn(false);
    statusEl.textContent = offline ? "Can't reach the backend. Is uvicorn running?" : "Something went wrong: " + err.message;
  } finally {
    clearInterval(timer);
    spinner.hidden = true; label.textContent = "✨ Analyze outfit"; updateButton();
  }
});

// rendering (textContent only, so model output can't inject HTML)
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
}
function textColorFor(hex) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150 ? "#111" : "#fff";
}

function render(d) {
  $("description").textContent = d.visible_description;
  $("vibe").textContent = d.style_vibe;
  $("season").textContent = d.season;

  const hasPalette = Array.isArray(d.palette) && d.palette.length > 0;
  $("palette-card").hidden = !hasPalette;
  const pal = $("palette"); pal.replaceChildren();
  if (hasPalette) d.palette.forEach((hex) => {
    const sw = el("div", "swatch", hex);
    sw.style.background = hex; sw.style.color = textColorFor(hex);
    sw.addEventListener("click", () => copy(hex));
    pal.appendChild(sw);
  });

  const g = $("garments"); g.replaceChildren();
  d.garments.forEach((x) => g.appendChild(el("span", "chip", x)));

  const poses = $("poses"); poses.replaceChildren();
  d.pose_types.forEach((p) => {
    const card = el("div", "pose");
    card.appendChild(el("div", "icon", POSE_ICONS[p] || "📸"));
    card.appendChild(el("div", "name", p.replaceAll("-", " ")));
    poses.appendChild(card);
  });

  const s = $("settings"); s.replaceChildren();
  d.best_settings.forEach((x) => s.appendChild(el("li", "", x)));

  const c = $("captions"); c.replaceChildren();
  d.caption_ideas.forEach((x) => {
    const li = el("li", "", x);
    li.addEventListener("click", () => copy(x));
    c.appendChild(li);
  });

  $("pinterest").href = d.pinterest_url;
  results.hidden = false;
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast("Copied: " + text); }
  catch { toast("Couldn't copy"); }
}
let toastTimer;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}