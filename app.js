<script type="module">
/* ===========================
   === Network Hints (auto) ===
   =========================== */
(function addNetworkHints(){
  const H = [
    { rel:"preconnect",   href:"https://animeazyapi.vercel.app", crossorigin:"" },
    { rel:"dns-prefetch", href:"//animeazyapi.vercel.app" },
    { rel:"preconnect",   href:"https://www.gstatic.com", crossorigin:"" },
    { rel:"preconnect",   href:"https://www.googleapis.com", crossorigin:"" }
  ];
  for (const h of H) {
    if (document.querySelector(`link[rel="${h.rel}"][href="${h.href}"]`)) continue;
    const l = document.createElement("link");
    l.rel = h.rel; l.href = h.href; if ("crossorigin" in h) l.crossOrigin = "";
    document.head.appendChild(l);
  }
})();

/* ===========================
   === Firebase imports    ===
   =========================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithCustomToken, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ===========================
   === INIT FIREBASE & UI  ===
   =========================== */
console.log("[Init] Initialisation de Firebase…");
const firebaseConfig = {
  apiKey: "AIzaSyBgjZdjmI6QQlDDENbNrxpX5yHDFzJ2f1k",
  authDomain: "animeazy-database.firebaseapp.com",
  projectId: "animeazy-database",
  storageBucket: "animeazy-database.appspot.com",
  messagingSenderId: "488332955948",
  appId: "1:488332955948:web:978c1f2d65de4bb9495c89"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loader = document.getElementById("global-loader");
const mainContent = document.getElementById("main-content");
if (loader && mainContent) { loader.style.display = "flex"; mainContent.style.display = "none"; }

const path = window.location.pathname;
const params = new URLSearchParams(window.location.search);
const token  = params.get("token");

function showMain() {
  console.log("[UI] showMain() → on affiche la page");
  if (loader && mainContent) { loader.style.display = "none"; mainContent.style.display = "block"; }
}

/* ===========================
   === LOADER MULTI-STEPS  ===
   =========================== */
const LOADER_STEPS = ["loading-step-1","loading-step-2","loading-step-3"];

function showLoaderStep(stepIndex){
  console.log(`[Loader] Step → ${stepIndex+1}`);
  LOADER_STEPS.forEach(id => {
    const node = document.getElementById(id);
    if (!node) { console.warn("[Loader] Élément step introuvable:", id); return; }
    if (!node.dataset.origDisplay) {
      let disp = getComputedStyle(node).display;
      if (disp === "none") disp = "flex";
      node.dataset.origDisplay = disp;
    }
    node.classList.remove("__show");
    node.style.display = "none";
  });

  const el = document.getElementById(LOADER_STEPS[stepIndex]);
  if (!el) return;
  el.style.display = el.dataset.origDisplay || "flex";
  void el.offsetWidth;
  el.classList.add("__show");
}

/* ===========================================================
   === PROGRESS BAR UTILS (padding-right 92% -> 8%)        ===
   =========================================================== */
function mapProgressToPaddingRight(p01){
  const clamped = Math.max(0, Math.min(1, p01));
  const pr = 92 - (clamped * 84);
  return Math.max(8, Math.min(92, pr));
}
function parseDurationToSeconds(d){
  if (d == null) return NaN;
  if (typeof d === "number") return d > 1e6 ? Math.round(d/1000) : Math.round(d);
  if (typeof d !== "string") return NaN;
  const s = d.trim();
  const mh = s.match(/^(\d+)\s*h\s*(\d{1,2})$/i);
  if (mh){ const h = parseInt(mh[1],10)||0; const m = parseInt(mh[2],10)||0; return h*3600 + m*60; }
  const parts = s.split(":").map(v=>v.trim());
  if (parts.length === 3){ const [hh,mm,ss]=parts.map(v=>parseInt(v,10)||0); return hh*3600+mm*60+ss; }
  if (parts.length === 2){ const [mm,ss]=parts.map(v=>parseInt(v,10)||0); return mm*60+ss; }
  const n = Number(s); return Number.isFinite(n) ? Math.round(n) : NaN;
}
function applyProgressPadding(cardEl, ratio01, ctxLog=""){
  const bar = cardEl.querySelector(".progress");
  if (!bar) { console.warn("[Progress] Aucune .progress trouvée.", ctxLog); return; }
  if (!bar.dataset._prInit) {
    bar.style.setProperty("width", "100%", "important");
    bar.style.setProperty("box-sizing", "border-box", "important");
    bar.style.setProperty("background-clip", "content-box", "important");
    bar.style.setProperty("padding-left", "0", "important");
    bar.style.setProperty("opacity", "1", "important");
    if (!bar.style.transition) bar.style.transition = "padding-right 160ms ease";
    bar.dataset._prInit = "1";
  }
  const pr = mapProgressToPaddingRight(ratio01);
  bar.style.setProperty("padding-right", pr + "%", "important");
}

/* ========= Helpers ========= */
const $ = (id) => document.getElementById(id);
function rememberDisplay(el, fallback = "inline-flex"){
  if (!el) return;
  if (!el.dataset.origDisplay) {
    let d = getComputedStyle(el).display;
    if (d === "none") d = fallback;
    el.dataset.origDisplay = d;
  }
}
function show(el){ if (!el) return; rememberDisplay(el); el.style.display = el.dataset.origDisplay || "inline-flex"; }
function hide(el){ if (!el) return; el.style.display = "none"; }

/* ======== Durée épisode (utilitaire existant) ======== */
function findEpisodeDurationSecondsFromApi(anime, saisonNum, episodeNum){
  if (!anime) return NaN;
  try {
    const saisonsObj = anime.Saisons || anime.saisons || anime.seasons;
    if (saisonsObj){
      const sKey = `Saison ${Number(saisonNum)}`;
      const saison = saisonsObj[sKey] || saisonsObj[String(saisonNum)];
      const epsObj = saison?.Episodes || saison?.episodes;
      if (epsObj){
        const eKey = `Épisode ${Number(episodeNum)}`;
        const ep = epsObj[eKey] || epsObj[String(episodeNum)];
        const sec = parseDurationToSeconds(ep?.duree ?? ep?.duration);
        if (Number.isFinite(sec)) return sec;
      }
    }
  } catch(e){}
  try {
    const saisonsArr = anime.saisons || anime.Saisons || anime.seasons;
    if (Array.isArray(saisonsArr)){
      const s = saisonsArr.find(x => Number(x.numero ?? x.num ?? x.saison) === Number(saisonNum));
      if (s && Array.isArray(s.episodes || s.Episodes)){
        const eps = s.episodes || s.Episodes;
        const e = eps.find(x => Number(x.numero ?? x.num ?? x.episode) === Number(episodeNum));
        const sec = parseDurationToSeconds(e?.duree ?? e?.duration);
        if (Number.isFinite(sec)) return sec;
      }
    }
  } catch(e){}
  return NaN;
}

/* ==============================
   === HERO + PRELOAD + BADGES ===
   ============================== */
function getFirstBgLayerUrl(el){
  const bg = getComputedStyle(el).backgroundImage;
  const urls = [...bg.matchAll(/url\((?:'|")?(.*?)(?:'|")?\)/g)].map(m => m[1]);
  return urls.length ? urls[0] : null;
}
function applyHeroBackground(heroEl, overlayUrl, posterUrl){
  const overlayPart = overlayUrl ? `url("${overlayUrl}")` : "none";
  const posterPart  = posterUrl  ? `url("${posterUrl}")`  : "none";
  heroEl.style.backgroundImage    = `${overlayPart}, ${posterPart}`;
  heroEl.style.backgroundSize     = "cover, cover";
  heroEl.style.backgroundRepeat   = "no-repeat, no-repeat";
  heroEl.style.backgroundPosition = "center, center";
}
function preloadImage(url, timeoutMs = 8000){
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    const img = new Image();
    const to  = setTimeout(() => { console.warn("[Preload] Timeout image", url); resolve(false); }, timeoutMs);
    img.onload  = () => { clearTimeout(to); console.log("[Preload] OK", url); resolve(true); };
    img.onerror = () => { clearTimeout(to); console.warn("[Preload] ERROR", url); resolve(false); };
    img.src = url;
  });
}

/* déduit le nombre de saisons depuis l’objet API */
function getSeasonCount(anime){
  const guess =
    anime?.nb_saisons ??
    anime?.saisons_count ??
    (Array.isArray(anime?.saisons) ? anime.saisons.length : undefined) ??
    (anime?.Saisons && !Array.isArray(anime.Saisons) ? Object.keys(anime.Saisons).length : undefined) ??
    (Array.isArray(anime?.seasons) ? anime.seasons.length : undefined);
  return Number.isFinite(guess) && guess > 0 ? guess : 1;
}

/* Applique les infos “badges + textes + liens” */
function populateHeroMeta(anime){
  console.groupCollapsed("[HeroMeta] Application des badges/textes/liens");
  console.log("[HeroMeta] Anime source:", anime);

  const logVis = (id, visible) => {
    const el = $(id);
    if (!el) { console.warn("[HeroMeta] Élément introuvable:", id); return; }
    visible ? show(el) : hide(el);
    console.log(`  • ${id} → ${visible ? "SHOW" : "HIDE"}`);
  };

  // Ages (tous cachés par défaut dans le DOM ; on montre ceux présents)
  logVis("anime-hero-10",  !!anime["10+"]);
  logVis("anime-hero-12",  !!anime["12+"]);
  logVis("anime-hero-14",  !!anime["14+"]);
  logVis("anime-hero-18",  !!anime["18+"]);

  // Langues
  logVis("anime-hero-vf",     !!anime?.vf);
  logVis("anime-hero-vostfr", !!anime?.vostfr);

  // Année
  const yearEl = $("anime-hero-date");
  if (anime?.annee && yearEl){
    yearEl.textContent = String(anime.annee);
    show(yearEl);
  } else if (yearEl) hide(yearEl);

  // Nb saisons
  const sCount = getSeasonCount(anime);
  const sEl = $("anime-hero-saisons");
  if (sEl) {
    sEl.textContent = `${sCount} ${sCount>1 ? "saisons" : "saison"}`;
    show(sEl);
  }

  // Liens boutons
  const baseId = anime?.id || anime?.animeID || "";
  const lecture = $("anime-hero-BTN-lecture");
  const info    = $("anime-hero-BTN-info");
  const hrefInfo = baseId ? `/anime?id=${encodeURIComponent(baseId)}` : "#";
  const hrefLecture = baseId ? `/anime?id=${encodeURIComponent(baseId)}&s=1&ep=1` : "#";
  if (lecture) lecture.href = hrefLecture;
  if (info)    info.href    = hrefInfo;

  console.groupEnd();
}

async function initHeroRandom({ waitForAssets = false } = {}){
  console.group("[Hero] initHeroRandom()");
  const t0 = performance.now();
  const hero   = $("hero-anime");
  const logoEl = $("logo-anime");
  if (!hero || !logoEl){
    console.warn("[Hero] #hero-anime ou #logo-anime introuvable.");
    console.groupEnd();
    return;
  }

  const overlayUrl = getFirstBgLayerUrl(hero);
  console.log("[Hero] Overlay (calque 1):", overlayUrl);

  try {
    console.log("[Hero] Fetch /api/animes…");
    const res = await fetch("https://animeazyapi.vercel.app/api/animes", { headers:{Accept:"application/json"} });
    console.log("[Hero] HTTP status:", res.status);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const list = await res.json();
    console.log("[Hero] Nb animes reçus:", Array.isArray(list)? list.length : "(pas un array)");

    if (!Array.isArray(list) || !list.length) {
      console.warn("[Hero] Liste vide → abort");
      console.groupEnd();
      return;
    }

    const pick = list[Math.floor(Math.random() * list.length)];
    console.log("[Hero] Anime choisi:", pick?.titre || pick?.id, pick);

    const poster = pick.url_poster || pick.url_affiche || "";
    const logo   = pick.url_logo    || "";
    console.log("[Hero] poster:", poster);
    console.log("[Hero] logo  :", logo);

    if (waitForAssets){
      populateHeroMeta(pick);
      console.log("[Hero] Preload images (poster+logo)…");
      const tPre = performance.now();
      const [okPoster, okLogo] = await Promise.race([
        Promise.all([preloadImage(poster), preloadImage(logo)]),
        new Promise(resolve => setTimeout(() => resolve([false,false]), 3000))
      ]);
      console.log(`[Hero] Preload terminé en ${(performance.now()-tPre).toFixed(0)}ms | posterOK=${okPoster} logoOK=${okLogo}`);
    } else {
      populateHeroMeta(pick);
    }

    console.log("[Hero] Application du background…");
    applyHeroBackground(hero, overlayUrl, poster);

    if (logo){
      console.log("[Hero] Pose du logo <img>…");
      logoEl.src = logo;
      logoEl.alt = pick.titre || "Logo anime";
      logoEl.decoding = "async";
      logoEl.loading  = "eager";
      logoEl.style.objectFit = "contain";
      logoEl.style.width     = "400px";
      logoEl.style.height    = "auto";
      logoEl.style.display   = "block";
      const parent = logoEl.parentElement;
      if (parent) parent.style.overflow = "visible";
    } else {
      console.warn("[Hero] Pas de logo fourni.");
    }

    console.log(`[Hero] Fini en ${(performance.now()-t0).toFixed(0)}ms`);
  } catch (e){
    console.error("[Hero] Erreur :", e);
  } finally {
    console.groupEnd();
  }
}

/* ======================================
   === SECTION "REPRENDRE" (Historique) ===
   ====================================== */
async function loadHistorique(userId) {
  console.group("[Reprendre] loadHistorique");
  const limitEpisodes = 5;
  const titreReprendre  = document.getElementById("titre-reprendre");
  const cartesReprendre = document.getElementById("cartes-reprendre");
  try {
    const historyRes = await fetch(`https://animeazyapi.vercel.app/api/utilisateurs/${userId}/historique`);
    let history = await historyRes.json();

    if (!history || history.length === 0) {
      if (titreReprendre)  titreReprendre.style.display = "none";
      if (cartesReprendre) cartesReprendre.style.display = "none";
      console.log("Aucun historique → section masquée.");
      console.groupEnd();
      return;
    } else {
      if (titreReprendre)  titreReprendre.style.display = "";
      if (cartesReprendre) cartesReprendre.style.display = "";
    }

    history.sort((a,b)=> new Date(b.datevisionnage) - new Date(a.datevisionnage));
    const seen = new Set();
    history = history.filter(e => !seen.has(e.animeID) && seen.add(e.animeID)).slice(0, limitEpisodes);

    const animesRes = await fetch("https://animeazyapi.vercel.app/api/animes");
    const animes    = await animesRes.json();

    const cards = document.querySelectorAll(".carousel-history .card-history");

    history.forEach((item, i) => {
      const anime = animes.find(a => a.animeID === item.animeID);
      if (!anime || !cards[i]) { console.warn("Manque anime ou carte", i, item); return; }

      const card = cards[i];
      const contenu  = card.querySelector(".card-contenu");
      const skeleton = contenu?.querySelector(".skeleton");

      const img = new Image();
      img.src = anime.url_affiche;
      img.onload = () => {
        const currentBg = getComputedStyle(contenu).backgroundImage;
        contenu.style.backgroundImage = currentBg ? currentBg.replace(/url\([^)]+\)/, `url(${anime.url_affiche})`) : `url(${anime.url_affiche})`;
        if (skeleton) skeleton.style.display = "none";
      };

      card.setAttribute("href", `/anime?id=${encodeURIComponent(anime.id)}&s=${item.saison}&ep=${item.episode}`);

      try {
        const timecodeSec = parseDurationToSeconds(item?.timecode);
        let dureeSec = findEpisodeDurationSecondsFromApi(anime, item.saison, item.episode);
        if (!Number.isFinite(dureeSec) || dureeSec <= 0) dureeSec = 1440;

        const ratio = (Number.isFinite(timecodeSec) && timecodeSec > 0) ? Math.max(0, Math.min(1, timecodeSec / dureeSec)) : 0;
        applyProgressPadding(card, ratio, `card#${i}`);
      } catch (e) {
        applyProgressPadding(card, 0, `card#${i} (exception)`);
      }
    });

    document.querySelectorAll(".carousel-history .card-history").forEach((card, i) => {
      card.style.display = i >= history.length ? "none" : "";
    });
  } catch (err) {
    console.error("[Reprendre] Erreur:", err);
  } finally {
    console.groupEnd();
  }
}

/* =========================
   === GUARD D'ACTIONS   ===
   ========================= */
function __storePendingAction(actionName, payload = {}) {
  try {
    const pending = { actionName, payload, href: location.href, ts: Date.now() };
    sessionStorage.setItem("aaz:pendingAction", JSON.stringify(pending));
    console.log("[Guard] pending action stored:", pending);
  } catch (e) {
    console.warn("[Guard] cannot store pending action", e);
  }
}
function __consumePendingAction() {
  try {
    const raw = sessionStorage.getItem("aaz:pendingAction");
    if (!raw) return null;
    sessionStorage.removeItem("aaz:pendingAction");
    return JSON.parse(raw);
  } catch (e) {
    console.warn("[Guard] consume error", e);
    return null;
  }
}
async function requireAuthRedirect(actionName, payload = {}) {
  if (auth.currentUser) return true;

  const waited = await new Promise((resolve) => {
    let resolved = false;
    const stop = onAuthStateChanged(auth, (u) => {
      if (!resolved) {
        resolved = true; stop(); resolve(!!u);
      }
    });
    setTimeout(() => { if (!resolved) { resolved = true; stop(); resolve(!!auth.currentUser); } }, 300);
  });

  if (waited) return true;

  __storePendingAction(actionName, payload);
  const returnTo = encodeURIComponent(location.href);
  location.assign(`/login?returnTo=${returnTo}`);
  return false;
}
function replayActionIfAny() {
  const p = __consumePendingAction();
  if (!p) return;
  console.log("[Replay] action:", p);
  if (p.actionName === "play" && p.payload?.epid) {
    location.href = `/watch?ep=${encodeURIComponent(p.payload.epid)}`;
  } else if (p.actionName === "addToList" && p.payload?.animeId) {
    fetch(`/api/list/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ animeId: p.payload.animeId })
    }).then(()=> console.log("[Replay] addToList OK"))
      .catch(()=> console.warn("[Replay] addToList KO"));
  }
}
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-require-auth]");
  if (!el) return;
  const actionName = el.getAttribute("data-action") || "custom";
  let payload = {};
  try { payload = el.dataset.payload ? JSON.parse(el.dataset.payload) : {}; } catch {}
  const can = await requireAuthRedirect(actionName, payload);
  if (!can) {
    e.preventDefault();
    e.stopPropagation();
  }
});

/* =========================
   === LOGIN via TOKEN   ===
   ========================= */
async function handleTokenLogin(t) {
  console.log("[Login] Connexion avec token…");
  try {
    const cred = await signInWithCustomToken(auth, t);
    window.history.replaceState({}, document.title, "/");
    const snap = await getDoc(doc(db, "Utilisateurs", cred.user.uid));
    setTimeout(() => {
      if (!snap.exists() || !snap.data().profil_name) { window.location.href = "/onboarding"; }
      else { window.location.href = "/home"; }
    }, 500);
  } catch (err) {
    console.error("[Login] Erreur:", err);
    window.history.replaceState({}, document.title, "/");
    showMain();
  }
}

/* =========================
   === ROUTES PROTÉGÉES  ===
   ========================= */
function requireAuth(user) {
  const isAnimePage = path.startsWith("/anime");
  const isHome      = path.startsWith("/home");
  const isOnboard   = path.startsWith("/onboarding");
  const isLogin     = path.startsWith("/login");

  if (isLogin) { showMain(); return; }

  if (isAnimePage) {
    showMain();
    replayActionIfAny();
    return;
  }

  if (!user) { window.location.href = "/"; return; }

  showLoaderStep(0);

  getDoc(doc(db, "Utilisateurs", user.uid)).then((snap) => {
    showLoaderStep(1);
    setTimeout(() => { showLoaderStep(2); }, 3000);

    const onboarded = snap.exists() && snap.data().profil_name;

    setTimeout(() => {
      if (isOnboard) {
        if (onboarded) window.location.href = "/home";
        else showMain();
      } else {
        if (!onboarded) {
          window.location.href = "/onboarding";
        } else {
          if (isHome) {
            console.log("[Flow] On attend le hero (images + badges + textes) AVANT showMain()");
            initHeroRandom({ waitForAssets:true })
              .then(() => {
                console.log("[Flow] Hero prêt → showMain() + loadHistorique");
                showMain();
                loadHistorique(user.uid);
              })
              .catch((e) => {
                console.warn("[Flow] Hero a échoué (fallback) :", e);
                showMain();
                loadHistorique(user.uid);
              });
          } else {
            showMain();
          }
        }
      }
    }, 300);
  });
}

/* ==================
   === LOGOUT BTN ===
   ================== */
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      signOut(auth).then(() => { window.location.href = "/"; })
                   .catch((error) => console.error("[Logout] Erreur:", error));
    });
  }
});

/* ============================
   === Prefetch intelligent ===
   ============================ */
(function setupAnimePrefetch(){
  const CATALOG_URL = "https://animeazyapi.vercel.app/api/animes";
  const CACHE_KEY_ALL = "aaz:animes:v1";
  const TTL_MS = 10 * 60 * 1000;

  const PREFETCHING = new Set();

  function setCache(key, value){ try{ sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value })); }catch{} }
  function getCacheRaw(key){
    try{
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj!=="object") return null;
      if (!obj.t || (Date.now()-obj.t)>TTL_MS) return null;
      return obj.v;
    }catch{ return null; }
  }

  async function ensureCatalog(){
    const c = getCacheRaw(CACHE_KEY_ALL);
    if (c) return c;
    const r = await fetch(CATALOG_URL, { headers:{Accept:"application/json"} });
    if (!r.ok) throw new Error("HTTP "+r.status);
    const list = await r.json();
    setCache(CACHE_KEY_ALL, list);
    return list;
  }

  async function prefetchAnimeAndPoster(id){
    if (PREFETCHING.has(id)) return;
    PREFETCHING.add(id);
    try{
      const singleKey = `aaz:anime:${id}`;
      if (!getCacheRaw(singleKey)) {
        const list = await ensureCatalog();
        const found = list.find(a => String(a.id ?? a.animeID) === String(id));
        if (found) setCache(singleKey, found);

        const poster = found?.url_poster || found?.url_affiche;
        if (poster && !document.querySelector(`link[rel="preload"][as="image"][href="${poster}"]`)) {
          const link = document.createElement("link");
          link.rel = "preload"; link.as = "image"; link.href = poster;
          document.head.appendChild(link);
        }
      }
    }catch(e){}
  }

  function onPrefetch(e){
    const a = e.target.closest('a[href^="/anime?id="]');
    if (!a) return;
    const u = new URL(a.href, location.origin);
    const id = u.searchParams.get("id");
    if (!id) return;
    prefetchAnimeAndPoster(id);
  }

  document.addEventListener("mouseover", onPrefetch, {passive:true});
  document.addEventListener("touchstart", onPrefetch, {passive:true});
})();

/* ==============
   === ROUTING ===
   ============== */
console.log("[Routing] Path:", path, "| Token présent :", !!token);
if (token) {
  handleTokenLogin(token);
} else {
  onAuthStateChanged(auth, (user) => {
    console.log("[Routing] Auth :", user ? "Connecté" : "Déconnecté");
    if (path === "/") {
      if (user) {
        getDoc(doc(db, "Utilisateurs", user.uid)).then((snap) => {
          const data = snap.data();
          setTimeout(() => {
            if (!snap.exists() || !data.profil_name) window.location.href = "/onboarding";
            else window.location.href = "/home";
          }, 500);
        });
      } else { setTimeout(showMain, 500); }
    } else { requireAuth(user); }
  });
}

/* =========================
   === PAGE /login (JS)  ===
   ========================= */
if (path.startsWith("/login")) {
  function getReturnTo() {
    const u = new URL(location.href);
    return u.searchParams.get("returnTo");
  }
  function goBack() {
    const target = getReturnTo() ? decodeURIComponent(getReturnTo()) : "/home";
    console.log("[Login] back to:", target);
    location.replace(target);
  }

  onAuthStateChanged(auth, (u) => {
    if (u) goBack();
  });

  document.getElementById("login-discord")?.addEventListener("click", async (e) => {
    e.preventDefault();
    alert("Brancher ici ton flux d’auth (Discord/custom-token/email).");
  });

  showMain();
}

/* =========================================
   === ONE-PAGE SEARCH (10 skeleton min) ===
   ========================================= */
(function initSearchDynamic(){
  const input      = document.getElementById("q");
  const section    = document.getElementById("search-section");
  const meta       = document.getElementById("search-meta");
  const emptyBox   = document.getElementById("search-empty");
  const errorBox   = document.getElementById("search-error");
  const container  = document.getElementById("Carousel-Result");
  const row        = container?.querySelector(".rowcontent-3") || container;
  const hero       = document.getElementById("hero-section");
  const searchClearBtn   = document.querySelector(".icon_delete");

  if (!input || !section || !meta || !emptyBox || !errorBox || !row) {
    console.warn("[Search] éléments manquants :", {input,section,meta,emptyBox,errorBox,container,row});
    return;
  }

  const setHidden = (el, hide)=> el && el.classList.toggle("is-hidden", !!hide);

  function resetToHero(){
    setHidden(hero, false);
    setHidden(section, true);
    setHidden(meta, true);
    setHidden(emptyBox, true);
  }
  resetToHero();

  function setQuotedText(block, q){
    const parts = block.querySelectorAll(".title-result");
    if (parts.length >= 3) parts[1].textContent = q;
  }

  function createSlot(idx){
    const wrap = document.createElement("div");
    wrap.className = "card-results";

    const link = document.createElement("a");
    link.className = "card-results-link-1 w-inline-block";
    link.id  = `card-results-link-${idx+1}`;
    link.href = "#";

    const imgDiv = document.createElement("div");
    imgDiv.className = "card-img-1";
    imgDiv.id = `card-img-${idx+1}`;
    imgDiv.style.position = "relative";

    const sk = document.createElement("div");
    sk.className = "skeleton";
    imgDiv.appendChild(sk);

    link.appendChild(imgDiv);
    wrap.appendChild(link);
    return wrap;
  }

  function initSlots(minSlots = 10){
    row.innerHTML = "";
    for (let i=0; i<minSlots; i++){ row.appendChild(createSlot(i)); }
  }

  function ensureSlotCount(n){
    while (row.children.length < n){
      row.appendChild(createSlot(row.children.length));
    }
  }

  function render(items, q){
    const typed = q && q.trim().length > 0;
    const needed = typed ? items.length : Math.max(items.length, 10);
    ensureSlotCount(needed);

    const slots = Array.from(row.querySelectorAll(".card-results"));

    for (let i = 0; i < items.length; i++) {
      const wrap   = slots[i];
      const link   = wrap.querySelector("a");
      const imgDiv = wrap.querySelector(".card-img-1");
      const sk     = wrap.querySelector(".skeleton");
      const data   = items[i];

      wrap.style.display = "";
      sk.style.display = "";

      link.href = `/anime?id=${encodeURIComponent(data.id || data.animeID || "")}`;
      link.setAttribute("aria-label", data.titre || "Voir l'animé");

      const url = data.url_affiche;
      if (url){
        const img = new Image();
        img.src = url;
        img.onload = ()=>{
          imgDiv.style.backgroundImage = `url(${url})`;
          const cs = getComputedStyle(imgDiv);
          if (!parseFloat(cs.width) || !parseFloat(cs.height)) {
            imgDiv.style.aspectRatio = "2 / 3";
            imgDiv.style.width = "180px";
            imgDiv.style.borderRadius = "12px";
            imgDiv.style.backgroundSize = "cover";
            imgDiv.style.backgroundPosition = "center";
          }
          sk.style.display = "none";
        };
      } else {
        imgDiv.style.backgroundImage = "";
        sk.style.display = "";
      }
    }

    for (let i = items.length; i < slots.length; i++) {
      const wrap   = slots[i];
      const link   = wrap.querySelector("a");
      const imgDiv = wrap.querySelector(".card-img-1");
      const sk     = wrap.querySelector(".skeleton");

      if (typed) {
        wrap.style.display = "none";
      } else {
        wrap.style.display = "";
        link.href = "#";
        link.removeAttribute("aria-label");
        imgDiv.style.backgroundImage = "";
        sk.style.display = "";
      }
    }

    if (items.length === 0){
      setQuotedText(emptyBox, q || "");
      setHidden(meta, true);
      setHidden(emptyBox, typed ? false : true);
    } else {
      if (typed){
        setQuotedText(meta, q);
        setHidden(meta, false);
        setHidden(emptyBox, true);
      } else {
        setHidden(meta, true);
        setHidden(emptyBox, true);
      }
    }
  }

  let allAnimes = [];
  let loaded = false;
  async function ensureData(){
    if (loaded) return;
    try{
      setHidden(errorBox, true);
      const res = await fetch("https://animeazyapi.vercel.app/api/animes", { headers:{Accept:"application/json"} });
      if(!res.ok) throw new Error("HTTP "+res.status);
      allAnimes = await res.json();
      loaded = true;
      allAnimes.sort((a,b)=> (a.titre||"").localeCompare(b.titre||"", "fr", {sensitivity:"base"}));
    }catch(e){
      console.error("[Search] réseau:", e);
      setHidden(errorBox, false);
    }
  }
  function filterAnimes(q){
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return allAnimes.filter(a=>{
      const title=(a.titre||a.title||"").toLowerCase();
      const syn  =(a.synopsis||a.description||"").toLowerCase();
      const tags =(a.genres||[]).join(" ").toLowerCase();
      return title.includes(t)||syn.includes(t)||tags.includes(t);
    });
  }

  let revealedOnce = false;
  function revealSectionOnce(){
    setHidden(section, false);
    setHidden(hero, true);
    if (!revealedOnce){
      revealedOnce = true;
      section.scrollIntoView({behavior:"smooth", block:"start"});
    }
  }

  initSlots(10);

  let tid;
  function onType(){
    clearTimeout(tid);
    tid = setTimeout(async ()=>{
      const q = input.value || "";
      if (q.trim().length < 1){ resetToHero(); return; }

      revealSectionOnce();
      await ensureData(); if (!loaded) return;
      const results = filterAnimes(q);
      render(results, q);
    }, 160);
  }

  input.addEventListener("input", onType);
  input.addEventListener("keydown", (e)=>{ if(e.key==="Enter"){ e.preventDefault(); onType(); } });

  function closeSearchBar({clear=true} = {}) {
    const headerSearchForm = document.getElementById("header-search");
    const toggleBtn        = document.getElementById("search-toggle");
    if (headerSearchForm) headerSearchForm.style.display = "none";
    if (toggleBtn) toggleBtn.style.display = "";
    if (clear) {
      input.value = "";
      resetToHero();
    }
   }
  if (searchClearBtn){
    searchClearBtn.addEventListener("click", (e)=>{
      e.preventDefault();
      closeSearchBar({clear:true});
      input.focus();
    });
  }

  try{
    const u = new URL(location.href);
    const preset = u.searchParams.get("q");
    if (preset){
      input.value = preset;
      revealSectionOnce();
      ensureData().then(()=>{ render(filterAnimes(preset), preset); });
    }
  }catch{}

  const headerSearchForm = document.getElementById("header-search");
  const toggleBtn        = document.getElementById("search-toggle");

  function openSearchBar() {
    if (!headerSearchForm) return;
    headerSearchForm.style.display = "block";
    if (toggleBtn) toggleBtn.style.display = "none";
    input.focus();
  }

  if (headerSearchForm && toggleBtn) {
    headerSearchForm.style.display = "none";
    toggleBtn.addEventListener("click", (e)=>{
      e.preventDefault();
      const visible = headerSearchForm.style.display !== "none";
      if (visible) closeSearchBar({clear:false});
      else openSearchBar();
    });

    const wfForm = headerSearchForm.querySelector("form");
    if (wfForm) wfForm.addEventListener("submit", (e)=> e.preventDefault());

    document.addEventListener("keydown", (e)=>{
      if (e.key === "Escape") closeSearchBar({clear:true});
    });

    document.addEventListener("click", (e)=>{
      if (!headerSearchForm.contains(e.target) && !toggleBtn.contains(e.target)) {
        if (headerSearchForm.style.display !== "none") closeSearchBar({clear:false});
      }
    });
  }
})();

/* =========================================
   === SECTION "DE A À Z" (A-Z catalogue) ===
   ========================================= */
(function initAtoZ(){
  const aazContainer =
    document.getElementById("carousel-aaz") ||
    document.querySelector(".carousel-aaz") ||
    document.querySelector(".Carousel-AAZ");
  if (!aazContainer) {
    console.warn("[A-Z] Container non trouvé (id=carousel-aaz / .carousel-aaz).");
    return;
  }

  const row =
    aazContainer.querySelector("#RowContent-AAZ") ||
    aazContainer.querySelector(".rowcontent-aaz") ||
    aazContainer.querySelector(".RowContent-AAZ") ||
    aazContainer.querySelector(".rowcontent-3") ||
    aazContainer;

  const MIN_SLOTS = 10;

  let template = row.querySelector(".cards-aaz, #Cards-AAZ, .Cards-AAZ");
  if (!template) {
    console.warn("[A-Z] Aucune carte trouvée (.cards-aaz / #Cards-AAZ). Laisse au moins 1 carte vide dans Webflow.");
    return;
  }

  const qLink     = (root)=> root.querySelector(".card-aaz, .card-AAZ");
  const qContent  = (root)=> root.querySelector(".card-contenu, .Card-contenu");
  const qSkeleton = (root)=> root.querySelector(".card-contenu .skeleton, .skeleton");

  function resetCard(slot){
    const content = qContent(slot);
    const sk = qSkeleton(slot);
    const link = qLink(slot);

    if (link){ link.href = "#"; link.removeAttribute("aria-label"); }
    if (content){
      content.style.removeProperty("background-image");
      content.style.backgroundSize     = "cover";
      content.style.backgroundPosition = "center";
      content.style.backgroundRepeat   = "no-repeat";
      const cs = getComputedStyle(content);
      if (!parseFloat(cs.width) || !parseFloat(cs.height)){
        content.style.aspectRatio = "2 / 3";
        content.style.width       = "180px";
      }
    }
    if (sk) sk.style.display = "";
  }

  function ensureSlots(n){
    const current = row.querySelectorAll(".cards-aaz, #Cards-AAZ, .Cards-AAZ").length;
    for (let i=current; i<n; i++){
      const clone = template.cloneNode(true);
      clone.removeAttribute("id");
      clone.querySelectorAll("[id]").forEach(el=> el.removeAttribute("id"));
      resetCard(clone);
      row.appendChild(clone);
    }
  }

  function setPosterOnCard(slot, url){
    const content = qContent(slot);
    const sk = qSkeleton(slot);
    if (!content){ console.warn("[A-Z] .card-contenu introuvable."); return; }
    if (!url){
      content.style.removeProperty("background-image");
      if (sk) sk.style.display = "";
      return;
    }
    const pre = new Image();
    pre.onload = ()=>{
      content.style.setProperty("background-image", `url("${url}")`, "important");
      content.style.backgroundSize     = "cover";
      content.style.backgroundPosition = "center";
      content.style.backgroundRepeat   = "no-repeat";
      if (sk) sk.style.display = "none";
    };
    pre.onerror = ()=>{ if (sk) sk.style.display = ""; };
    pre.src = url;
  }

  function renderAll(list){
    ensureSlots(Math.max(list.length, MIN_SLOTS));
    const slots = Array.from(row.querySelectorAll(".cards-aaz, #Cards-AAZ, .Cards-AAZ"));

    for (let i = 0; i < list.length; i++){
      const slot = slots[i]; if (!slot) break;
      slot.style.display = "";

      const data = list[i];
      const link = qLink(slot);
      if (link){
        link.href = `/anime?id=${encodeURIComponent(data.id || data.animeID || "")}`;
        link.setAttribute("aria-label", data.titre || "Voir l'animé");
      }

      setPosterOnCard(slot, data.url_affiche);
    }

    for (let i = list.length; i < slots.length; i++){
      slots[i].style.display = "none";
    }
  }

  ensureSlots(MIN_SLOTS);

  (async ()=>{
    try{
      const res = await fetch("https://animeazyapi.vercel.app/api/animes", { headers:{Accept:"application/json"} });
      if (!res.ok) throw new Error("HTTP "+res.status);
      const all = await res.json();
      all.sort((a,b)=> (a.titre||"").localeCompare(b.titre||"", "fr", {sensitivity:"base"}));
      renderAll(all);
      console.log(`[A-Z] Rendu de ${all.length} animés (BG sur .card-contenu).`);
    }catch(e){
      console.error("[A-Z] Erreur de chargement :", e);
    }
  })();
})();

/* ===========================================
   === PAGE /anime : cache + data binding  ===
   =========================================== */
if (path.startsWith("/anime")) {
  console.log("[AnimePage] boot");
  const url    = new URL(location.href);
  const animeId = url.searchParams.get("id");
  console.log("animeId:", animeId);
  if (!animeId) { showMain(); console.warn("[AnimePage] ?id manquant"); }

  // ---------- CONFIG ----------
  const CATALOG_URL = "https://animeazyapi.vercel.app/api/animes";
  const DETAIL_URL  = (id) => `https://animeazyapi.vercel.app/api/animes/${encodeURIComponent(id)}`;
  const CACHE_KEY_ALL = "aaz:animes:v1";
  const TTL_MS = 10 * 60 * 1000; // 10 min

  // ---------- DOM ----------
  const $hero       = document.getElementById("hero-anime");
  const $logo       = document.getElementById("logo-anime");
  const $btnLecture = document.getElementById("anime-hero-BTN-lecture");
  const $genres     = document.querySelector(".frame-81 .genres");
  const $annee      = document.getElementById("anime-hero-date");
  const $nbSais     = document.querySelector(".specifications-2 #anime-hero-saisons");
  const $titleHistory = document.querySelector(".div-block-10 .titlehistory");
  const $rowEp      = document.querySelector(".rowcontent-ep");
  const $tplCard    = document.querySelector(".rowcontent-ep .cards-ep");

  const safeText = (el, txt) => { if (el) el.textContent = txt ?? ""; };
  const overlayUrlForHero = $hero ? getFirstBgLayerUrl($hero) : null;

  function setHeroPosterWithOverlay(posterUrl) {
    if (!$hero) return;
    const overlayPart = overlayUrlForHero ? `url("${overlayUrlForHero}")` : "none";
    const posterPart  = posterUrl ? `url("${posterUrl}")` : "none";
    $hero.style.backgroundImage    = `${overlayPart}, ${posterPart}`;
    $hero.style.backgroundSize     = "cover, cover";
    $hero.style.backgroundRepeat   = "no-repeat, no-repeat";
    $hero.style.backgroundPosition = "center, center";
  }

  // ---------- CACHE HELPERS ----------
  function getCache(key) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") return null;
      if (!obj.t || (Date.now() - obj.t) > TTL_MS) return null;
      return obj.v;
    } catch { return null; }
  }
  function setCache(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value })); } catch {}
  }

  async function fetchJson(url) {
    const r = await fetch(url, { headers:{Accept:"application/json"} });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return r.json();
  }

  async function getAllAnimesCached() {
    const c = getCache(CACHE_KEY_ALL);
    if (c) return c;
    const list = await fetchJson(CATALOG_URL);
    setCache(CACHE_KEY_ALL, list);
    return list;
  }

  async function getAnimeById(animeId) {
    console.group("[getAnimeById]", animeId);
    const singleKey = `aaz:anime:${animeId}`;
    const c = getCache(singleKey);
    if (c) { console.log("→ single cache HIT:", c); console.groupEnd(); return c; }

    try {
      const one = await fetchJson(DETAIL_URL(animeId));
      if (one) { setCache(singleKey, one); console.log("→ detail endpoint OK"); console.groupEnd(); return one; }
    } catch (e) {
      console.debug("DETAIL_URL fallback:", e.message);
    }

    const list = await getAllAnimesCached();
    const found = list.find(a => String(a.id ?? a.animeID) === String(animeId)) || null;
    if (found) setCache(singleKey, found);
    console.groupEnd();
    return found;
  }

  // ---------- DATA SHAPERS ----------
  function extractSeasons(anime) {
    console.group("[Seasons] extractSeasons");
    const out = [];
    try {
      if (Array.isArray(anime?.saisons)) {
        console.log("shape: saisons[] (array)");
        anime.saisons.forEach(s => {
          const num = Number(s.numero ?? s.num ?? s.saison ?? 1);
          const eps = Array.isArray(s.episodes || s.Episodes) ? (s.episodes || s.Episodes) : [];
          out.push({ numero: num, episodes: eps });
        });
      } else if (anime?.Saisons && !Array.isArray(anime.Saisons)) {
        console.log("shape: Saisons{} (object)");
        for (const sKey of Object.keys(anime.Saisons)) {
          const num = Number(String(sKey).replace(/\D+/g, "")) || 1;
          const s   = anime.Saisons[sKey] || {};
          const epsObj = s.Episodes || s.episodes || {};
          const eps = Array.isArray(epsObj) ? epsObj
                    : Object.keys(epsObj).map(eKey => ({ ...(epsObj[eKey]||{}), numero: Number(String(eKey).replace(/\D+/g,""))||undefined }));
          out.push({ numero: num, episodes: eps });
        }
      } else if (Array.isArray(anime?.seasons)) {
        console.log("shape: seasons[] (array)");
        anime.seasons.forEach(s => out.push({ numero: Number(s.numero ?? s.num ?? s.saison ?? 1), episodes: s.episodes || [] }));
      }
    } catch(e){ console.warn("[Seasons] warn:", e); }
    out.sort((a,b)=> (a.numero||0)-(b.numero||0));
    console.log("→ saisons:", out);
    console.groupEnd();
    return out;
  }

  function minutesFrom(any) {
    if (typeof any === "number" && isFinite(any)) return Math.round(any);
    if (typeof any === "string") {
      const s = any.trim();
      const m1 = s.match(/^(\d+)\s*h\s*(\d{1,2})$/i);
      if (m1) return Number(m1[1])*60 + Number(m1[2]||0);
      const parts = s.split(":");
      if (parts.length===2) return Number(parts[0])*60 + Number(parts[1]||0);
      const n = Number(s); if (isFinite(n)) return Math.round(n);
    }
    return NaN;
  }

  // ---------- EPISODE IMAGE HELPERS ----------
  function pickEpisodeImage(ep){
    const candidates = [
      ep?.img_url, ep?.vignette, ep?.image, ep?.thumbnail, ep?.url_vignette, ep?.cover, ep?.poster
    ].filter(Boolean);
    const url = candidates[0] || "";
    if (url) console.log("[Ep IMG] choisi:", url);
    else console.warn("[Ep IMG] aucune image pour:", ep?.titre || ep?.title || ep);
    return url;
  }
  function preload(url, timeoutMs = 8000){
    return new Promise(res => {
      if (!url) return res(false);
      const img = new Image();
      const to  = setTimeout(() => res(false), timeoutMs);
      img.onload = () => { clearTimeout(to); res(true); };
      img.onerror = () => { clearTimeout(to); res(false); };
      img.src = url;
    });
  }

  // ---------- RENDER ----------
  function renderHero(anime) {
    console.group("[Hero] renderHero");
    const poster = anime.url_poster || anime.url_affiche || "";
    const logo   = anime.url_logo || "";
    console.log("poster:", poster);
    console.log("logo  :", logo);

    if (poster) {
      const img = new Image();
      img.onload  = () => { setHeroPosterWithOverlay(poster); console.log("poster preload OK"); };
      img.onerror = () => setHeroPosterWithOverlay("");
      img.src = poster;
    } else {
      setHeroPosterWithOverlay("");
    }

    if ($logo && logo) { $logo.src = logo; $logo.alt = anime.titre || anime.title || "Logo anime"; }

    const genres = Array.isArray(anime.genres) ? anime.genres.join(", ") : (anime.genres || "");
    safeText($genres, genres || "—");
    if ($annee) safeText($annee, anime.annee || anime.year || "");

    const seasons = extractSeasons(anime);
    const nbSaisons = seasons.length || (Number.isFinite(anime?.saisons_count) ? anime.saisons_count : 1);
    if ($nbSais) safeText($nbSais, `${nbSaisons} ${nbSaisons>1?"saisons":"saison"}`);

    if ($titleHistory) safeText($titleHistory, anime.titre || anime.title || "—");

    if ($btnLecture) {
      const firstS = seasons[0];
      const firstE = firstS?.episodes?.[0];
      const epParam = firstE?.id || firstE?.stream_id || `${animeId}-s${firstS?.numero||1}e${Number(firstE?.numero ?? firstE?.num ?? 1)}`;
      $btnLecture.href = `/watch?ep=${encodeURIComponent(epParam)}&anime=${encodeURIComponent(animeId)}`;
      $btnLecture.setAttribute("data-require-auth", "");
      $btnLecture.setAttribute("data-action", "play");
      $btnLecture.dataset.payload = JSON.stringify({ epid: epParam });
      console.log("BTN LECTURE → epid:", epParam);
    }
    console.groupEnd();
  }

  async function fillEpisodeCard(root, seasonNumber, ep, index) {
    console.log("  [fill] #"+(index+1), ep);

    const link = root.querySelector(".card-ep");
    const bg   = root.querySelector(".card-contenu");
    const t1   = root.querySelector(".anime-episode-titre");
    const tAll = root.querySelectorAll(".anime-episode-desc");

    // Titre : on n'ajoute plus de numéro — on affiche la string telle quelle
    const title = (ep?.title || ep?.titre || "Épisode").trim();
    if (t1) t1.textContent = title;

    // Durée
    const durationMin = minutesFrom(ep?.duree ?? ep?.duration);
    if (tAll[0]) tAll[0].textContent = isFinite(durationMin) ? `${durationMin} min` : (ep?.duree || ep?.duration || "");

    // Synopsis
    if (tAll[1]) tAll[1].textContent = ep?.synopsis || ep?.description || "";

    // Image d’épisode
    const imgUrl = pickEpisodeImage(ep);
    if (bg) {
      bg.style.removeProperty("background-image");
      bg.style.backgroundSize = "cover";
      bg.style.backgroundPosition = "center";
      bg.style.backgroundRepeat   = "no-repeat";
      const cs = getComputedStyle(bg);
      if (!parseFloat(cs.width) || !parseFloat(cs.height)){
        bg.style.aspectRatio = "16 / 9";
        bg.style.width       = "300px";
        bg.style.borderRadius = "12px";
      }

      if (imgUrl) {
        const ok = await preload(imgUrl, 8000);
        if (ok) {
          bg.style.setProperty("background-image", `url("${imgUrl}")`, "important");
          bg.classList.remove("is-img-missing");
        } else {
          console.warn("  [fill] preload FAIL:", imgUrl);
          bg.classList.add("is-img-missing");
        }
      } else {
        bg.classList.add("is-img-missing");
      }
    }

    // Lien / watch
    const epNum = Number(ep?.numero ?? ep?.num ?? index+1);
    const epid  = ep?.id || ep?.stream_id || `${animeId}-s${seasonNumber||1}e${epNum}`;
    if (link) {
      link.href = `/watch?ep=${encodeURIComponent(epid)}&anime=${encodeURIComponent(animeId)}`;
      link.setAttribute("data-require-auth", "");
      link.setAttribute("data-action", "play");
      link.dataset.payload = JSON.stringify({ epid });
    }
  }

  function clearEpisodesRow() {
    if (!$rowEp) return;
    const nodes = Array.from($rowEp.querySelectorAll(".cards-ep"));
    nodes.forEach((n) => {
      const bg = n.querySelector(".card-contenu");
      const t1 = n.querySelector(".anime-episode-titre");
      const t2 = n.querySelectorAll(".anime-episode-desc");
      if (bg) { bg.style.backgroundImage = ""; bg.classList.remove("is-img-missing"); }
      if (t1) t1.textContent = "";
      t2.forEach(x => x.textContent = "");
      const a = n.querySelector(".card-ep");
      if (a) { a.href = "#"; a.removeAttribute("data-require-auth"); a.removeAttribute("data-action"); a.removeAttribute("data-payload"); }
      n.removeAttribute("hidden");
      n.removeAttribute("aria-hidden");
      n.classList.remove("is-hidden-ep");
      n.style.removeProperty("display");
      n.style.removeProperty("visibility");
      n.style.removeProperty("height");
      n.style.removeProperty("margin");
      n.style.removeProperty("padding");
    });
    console.log("[Episodes] clearEpisodesRow → nb cards:", nodes.length);
  }

  async function renderEpisodes(anime) {
    console.group("[Episodes] renderEpisodes");
    if (!$rowEp || !$tplCard) { console.warn("  DOM manquant"); console.groupEnd(); return; }

    const cards = Array.from($rowEp.querySelectorAll(".cards-ep"));
    console.log("  placeholders trouvés (.cards-ep):", cards.length, cards);
    clearEpisodesRow();

    const seasons = extractSeasons(anime);
    const s = seasons[0];
    if (!s || !Array.isArray(s.episodes) || s.episodes.length===0) {
      console.log("  aucun épisode détecté");
      console.groupEnd();
      return;
    }

    const episodes = s.episodes.slice(0, cards.length);
    const count = episodes.length;
    console.log(`  episodes détectés (saison ${s?.numero??1}):`, count, episodes);
    console.log(`  → on remplit: ${count} cartes / ${cards.length}`);

    // Remplit les N premières cartes (await pour fiabilité du preload)
    for (let i=0; i<count; i++) {
      const card = cards[i];
      try {
        await fillEpisodeCard(card, s?.numero, episodes[i], i);
      } catch (err) {
        console.warn("  fillEpisodeCard error @", i, err);
      }
    }

    // Hard-hide le reste
    for (let i=count; i<cards.length; i++) {
      const c = cards[i];
      c.setAttribute("hidden", "true");
      c.setAttribute("aria-hidden", "true");
      c.classList.add("is-hidden-ep");
      c.style.setProperty("display", "none", "important");
      c.style.setProperty("visibility", "hidden", "important");
      c.style.setProperty("height", "0px", "important");
      c.style.setProperty("margin", "0px", "important");
      c.style.setProperty("padding", "0px", "important");
      console.log("  [hide] card index:", i, "→ hard-hidden");
    }

    console.log("  état final cartes:", cards);
    console.groupEnd();
  }

  // ---------- BOOT ----------
  (async function boot() {
    showMain(); // pas de gros loader sur /anime
    if (!animeId) return;

    try {
      const anime = await getAnimeById(animeId);
      console.log("[AnimePage] anime:", anime);
      if (!anime) {
        safeText($titleHistory, "Anime introuvable");
        console.warn("[AnimePage] introuvable:", animeId);
        return;
      }
      renderHero(anime);
      await renderEpisodes(anime);
    } catch (e) {
      console.error("[AnimePage] erreur:", e);
    }
  })();
}
</script>
