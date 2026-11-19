import { initializeAnalytics } from "./analytics.js";

initializeAnalytics();

const projects = [
  {
    id: "showreel",
    title: "Toby Yu Showreel",
    category: "Showreel",
    meta: "Portfolio",
    video: "https://player.vimeo.com/video/1165378554",
    tone: "amber",
  },
  {
    id: "commercial-03",
    title: "Commercial Reel 3",
    category: "Commercial",
    meta: "Commercial",
    video: "https://player.vimeo.com/video/1195101228",
    tone: "field",
  },
  {
    id: "commercial-02",
    title: "Commercial Reel 2",
    category: "Commercial",
    meta: "Campaign Edit",
    video: "https://player.vimeo.com/video/1191103532",
    tone: "mono",
  },
  {
    id: "commercial-01",
    title: "Commercial Reel",
    category: "Commercial",
    meta: "Brand Film",
    video: "https://player.vimeo.com/video/1180459302",
    tone: "amber",
  },
  {
    id: "short-01",
    title: "Reel 01",
    category: "Shorts & Reels",
    meta: "Vertical Edit",
    video: "https://player.vimeo.com/video/1165586227",
    tone: "street",
  },
  {
    id: "short-02",
    title: "Reel 02",
    category: "Shorts & Reels",
    meta: "Social Content",
    video: "https://player.vimeo.com/video/1165590282",
    tone: "type",
  },
  {
    id: "short-03",
    title: "Reel 03",
    category: "Shorts & Reels",
    meta: "Motion Design",
    video: "https://player.vimeo.com/video/1167277734",
    tone: "warm",
  },
  {
    id: "short-04",
    title: "Reel 04",
    category: "Shorts & Reels",
    meta: "Vertical Edit",
    video: "https://vimeo.com/1234598390",
    tone: "street",
  },
  {
    id: "short-05",
    title: "Reel 05",
    category: "Shorts & Reels",
    meta: "Vertical Edit",
    video: "https://www.youtube.com/shorts/DPhvVgVLi04",
    tone: "type",
  },
  {
    id: "documentary-01",
    title: "Film 01",
    category: "Documentary",
    meta: "Long Form",
    video: "https://www.youtube.com/watch?v=NnY4RRX-n_0",
    tone: "cinema",
  },
  {
    id: "documentary-02",
    title: "Film 02",
    category: "Documentary",
    meta: "Story Edit",
    video: "https://vimeo.com/1194363662?fl=ip&fe=ec",
    tone: "field",
  },
  {
    id: "documentary-03",
    title: "Film 03",
    category: "Documentary",
    meta: "Long Form",
    video: "https://www.youtube.com/watch?v=ivhIMTe7Mu8",
    tone: "cinema",
  },
];

const youtubeDebugProject = {
  id: "youtube-debug-test",
  title: "YouTube Debug Test",
  video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
};

const youtubeIframeAttributes = {
  allow:
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
  referrerpolicy: "strict-origin-when-cross-origin",
  allowfullscreen: true,
};

const modal = document.querySelector(".video-modal");
const player = document.querySelector("[data-player]");
const closeButton = document.querySelector(".modal-close");
const modalAudioToggle = document.querySelector("[data-modal-audio]");
const hero = document.querySelector(".hero");
const heroMedia = document.querySelector(".hero-media");
const heroPlayCursor = document.querySelector(".hero-play-cursor");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const thumbnailCache = new Map();

if (window.location.protocol === "file:") {
  console.warn(
    "YouTube embeds may fail when index.html is opened through file:// because the page has no valid web origin. Test through a local server or deployed URL instead."
  );
}

function getVimeoVideoId(videoUrl) {
  return videoUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
}

function getYouTubeVideoId(videoUrl) {
  try {
    const url = new URL(videoUrl);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0];
    return url.searchParams.get("v") ?? url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1];
  } catch {
    return null;
  }
}

function getVideoProvider(videoUrl) {
  return getYouTubeVideoId(videoUrl) ? "youtube" : "vimeo";
}

function getVimeoThumbnail(videoUrl) {
  const videoId = getVimeoVideoId(videoUrl);
  if (!videoId) return Promise.reject(new Error("Invalid Vimeo video URL"));
  if (thumbnailCache.has(videoId)) return thumbnailCache.get(videoId);

  const vimeoPageUrl = `https://vimeo.com/${videoId}`;
  const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(vimeoPageUrl)}&width=1280`;
  const thumbnailRequest = fetch(oEmbedUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`Vimeo oEmbed request failed: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      if (!data.thumbnail_url) throw new Error("Vimeo thumbnail is unavailable");
      return data.thumbnail_url;
    });

  thumbnailCache.set(videoId, thumbnailRequest);
  return thumbnailRequest;
}

function getProjectThumbnail(videoUrl) {
  if (getVideoProvider(videoUrl) === "youtube") {
    const videoId = getYouTubeVideoId(videoUrl);
    return Promise.resolve({
      url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      fallback: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    });
  }

  return getVimeoThumbnail(videoUrl).then((url) => ({ url }));
}

function getVideoEmbedUrl(videoUrl) {
  if (getVideoProvider(videoUrl) === "youtube") {
    const videoId = getYouTubeVideoId(videoUrl);
    const parameters = new URLSearchParams({
      autoplay: "1",
      playsinline: "1",
      rel: "0",
    });
    const pageOrigin = window.location.origin;
    if (pageOrigin && pageOrigin !== "null") parameters.set("origin", pageOrigin);
    return `https://www.youtube-nocookie.com/embed/${videoId}?${parameters.toString()}`;
  }

  const videoId = getVimeoVideoId(videoUrl);
  return `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0`;
}

function getEnvironmentType() {
  if (window.location.protocol === "file:") return "file://";
  if (["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) {
    return "localhost";
  }
  return "deployed URL";
}

function logEnvironmentDebug() {
  console.group("[YouTube Debug] Current environment");
  console.log("window.location.href:", window.location.href);
  console.log("window.location.protocol:", window.location.protocol);
  console.log("window.location.origin:", window.location.origin);
  console.log("environment type:", getEnvironmentType());
  console.groupEnd();
}

function logYouTubeDebug(label, videoUrl) {
  const provider = getVideoProvider(videoUrl);
  const videoId = getYouTubeVideoId(videoUrl);
  const embedUrl = getVideoEmbedUrl(videoUrl);

  console.group(`[YouTube Debug] ${label}`);
  console.log("original project.video:", videoUrl);
  console.log("detected provider:", provider);
  console.log("detected YouTube video ID:", videoId);
  console.log("final iframe src:", embedUrl);
  console.log("iframe attributes:", youtubeIframeAttributes);
  console.groupEnd();
}

logEnvironmentDebug();
logYouTubeDebug(
  "Film 01",
  projects.find((project) => project.id === "documentary-01").video
);
logYouTubeDebug("Known public test video", youtubeDebugProject.video);

function projectCard(project) {
  const button = document.createElement("button");
  button.className = `project-card tone-${project.tone}`;
  button.type = "button";
  button.dataset.video = project.id;
  button.setAttribute("aria-label", `Play ${project.title}`);
  button.innerHTML = `
    <span class="project-visual" aria-hidden="true">
      <img class="project-thumbnail" alt="" loading="lazy" decoding="async" />
      <svg class="project-play-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5 20 12 8 19Z"></path>
      </svg>
    </span>
  `;

  const thumbnail = button.querySelector(".project-thumbnail");
  getProjectThumbnail(project.video)
    .then(({ url, fallback }) => {
      if (fallback) {
        thumbnail.addEventListener(
          "error",
          () => {
            thumbnail.src = fallback;
          },
          { once: true }
        );
      }
      thumbnail.src = url;
    })
    .catch(() => {
      thumbnail.remove();
    });

  return button;
}

/* ---------------------------------------------------------------------------
   Unified video showcase
   Every work category renders the same component: one ambient featured player
   with an audio toggle, plus a finite click-to-play rail of the remaining
   videos. Categories differ only in markup modifiers and CSS, never here.
   --------------------------------------------------------------------------- */

// Both providers are driven the same way: an autoplaying, looping, chrome-less
// embed whose src is rebuilt to flip the mute flag. Reloading the src keeps the
// providers' own reliable autoplay path instead of layering a player SDK on top.
function getFeatureEmbedUrl(videoUrl, isMuted) {
  if (getVideoProvider(videoUrl) === "youtube") {
    const videoId = getYouTubeVideoId(videoUrl);
    const parameters = new URLSearchParams({
      autoplay: "1",
      mute: isMuted ? "1" : "0",
      // YouTube only loops a single video when it is its own one-item playlist.
      loop: "1",
      playlist: videoId,
      controls: "0",
      disablekb: "1",
      modestbranding: "1",
      iv_load_policy: "3",
      playsinline: "1",
      rel: "0",
    });
    const pageOrigin = window.location.origin;
    if (pageOrigin && pageOrigin !== "null") parameters.set("origin", pageOrigin);
    return `https://www.youtube-nocookie.com/embed/${videoId}?${parameters.toString()}`;
  }

  const videoId = getVimeoVideoId(videoUrl);
  const parameters = new URLSearchParams({
    background: "1",
    autoplay: "1",
    loop: "1",
    muted: isMuted ? "1" : "0",
    autopause: "0",
    playsinline: "1",
    quality: "1080p",
    title: "0",
    byline: "0",
    portrait: "0",
  });
  return `https://player.vimeo.com/video/${videoId}?${parameters.toString()}`;
}

function initializeFeature(featureElement) {
  const project = projects.find((item) => item.id === featureElement.dataset.feature);
  if (!project) return;

  const isYouTube = getVideoProvider(project.video) === "youtube";
  const frame = document.createElement("iframe");
  frame.title = project.title;
  frame.allow = isYouTube
    ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    : "autoplay; encrypted-media; fullscreen; picture-in-picture";
  if (isYouTube) frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.setAttribute("allowfullscreen", "");
  frame.setAttribute("tabindex", "-1");
  frame.src = getFeatureEmbedUrl(project.video, true);
  featureElement.prepend(frame);

  const expandTrigger = document.createElement("button");
  expandTrigger.className = "video-expand-trigger";
  expandTrigger.type = "button";
  expandTrigger.setAttribute("aria-label", `Expand ${project.title}`);
  expandTrigger.addEventListener("click", () => openLoopingVideo(project, featureElement));
  featureElement.append(expandTrigger);
  featureElement.dataset.muted = "true";

  const toggle = featureElement.querySelector(".feature-audio-toggle");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    const isMuted = featureElement.dataset.muted !== "false";
    updateAmbientVideoSource(featureElement, project, !isMuted);
  });
}

document.querySelectorAll(".showcase-feature").forEach(initializeFeature);

function shortVideoCard(project) {
  const card = document.createElement("div");
  card.className = `project-card short-video-card tone-${project.tone}`;

  const frame = document.createElement("iframe");
  frame.title = project.title;
  const isYouTube = getVideoProvider(project.video) === "youtube";
  frame.allow = isYouTube
    ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    : "autoplay; encrypted-media; fullscreen; picture-in-picture";
  if (isYouTube) frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.setAttribute("allowfullscreen", "");
  frame.setAttribute("tabindex", "-1");
  // The Vimeo background embed is muted, inline, autoplaying, and looping.
  // autopause=0 is required so every Short can play at the same time.
  frame.src = getFeatureEmbedUrl(project.video, true);

  const controls = document.createElement("div");
  controls.className = "showcase-feature-controls";
  const toggle = document.createElement("button");
  toggle.className = "feature-audio-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-pressed", "false");
  toggle.setAttribute("aria-label", `Turn ${project.title} audio on`);
  toggle.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10v4h4l5 4V6l-5 4H4Z"></path>
      <path d="m17 9 4 6M21 9l-4 6"></path>
    </svg>
    <span>Audio Off</span>
  `;

  toggle.addEventListener("click", () => {
    const isMuted = card.dataset.muted !== "false";
    updateAmbientVideoSource(card, project, !isMuted);
  });

  const expandTrigger = document.createElement("button");
  expandTrigger.className = "video-expand-trigger";
  expandTrigger.type = "button";
  expandTrigger.setAttribute("aria-label", `Expand ${project.title}`);
  expandTrigger.addEventListener("click", () => openLoopingVideo(project, card));
  card.dataset.muted = "true";
  controls.append(toggle);
  card.append(frame, expandTrigger, controls);

  return card;
}

const shortProjectOrder = ["short-01", "short-04", "short-02", "short-03", "short-05"];

document.querySelectorAll(".shorts-video-list").forEach((list) => {
  shortProjectOrder
    .map((projectId) => projects.find((project) => project.id === projectId))
    .filter(Boolean)
    .forEach((project) => list.append(shortVideoCard(project)));
});

// Desktop only (matches the min-width: 581px CSS block): vertical mouse-wheel
// movement scrolls the Shorts row sideways. The row is row-reverse, so the
// first Short sits on the right and wheeling down moves left toward later
// Shorts. At either end the wheel falls through to normal page scrolling.
// Phones keep their native touch rail; this handler never runs there.
const desktopShorts = window.matchMedia("(min-width: 581px)");

document.querySelectorAll(".shorts-video-list").forEach((list) => {
  list.addEventListener(
    "wheel",
    (event) => {
      if (!desktopShorts.matches) return;
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const maxScroll = list.scrollWidth - list.clientWidth;
      if (maxScroll <= 1) return;

      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? list.clientWidth : 1;
      const delta = -event.deltaY * unit;
      // row-reverse overflow: scrollLeft runs from 0 (right end) to -maxScroll.
      const position = list.scrollLeft;
      const atStart = position >= -1 && delta > 0;
      const atEnd = position <= -maxScroll + 1 && delta < 0;
      if (atStart || atEnd) return;

      event.preventDefault();
      list.scrollLeft = Math.max(-maxScroll, Math.min(0, position + delta));
    },
    { passive: false }
  );
});

// The rails are deliberately finite click-to-play strips rather than looping
// carousels: each holds only the two videos left over after the featured one,
// a count at which a cloned infinite loop reads as broken.
document.querySelectorAll(".showcase-secondary").forEach((rail) => {
  const excludedProjectId = rail.dataset.exclude;
  projects
    .filter(
      (project) =>
        project.category === rail.dataset.category && project.id !== excludedProjectId
    )
    .forEach((project) => rail.append(projectCard(project)));
});

document.querySelectorAll(".showcase-secondary-shell").forEach((shell) => {
  const rail = shell.querySelector(".showcase-secondary");
  const previousButton = shell.querySelector(".carousel-arrow--previous");
  const nextButton = shell.querySelector(".carousel-arrow--next");

  function updateArrowState() {
    previousButton.disabled = rail.scrollLeft <= 1;
    nextButton.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 1;
  }

  function scrollRail(direction) {
    const card = rail.querySelector(".project-card");
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    const distance = (card?.getBoundingClientRect().width || rail.clientWidth) + gap;
    rail.scrollBy({
      left: direction * distance,
      behavior: reducedMotion.matches ? "auto" : "smooth",
    });
  }

  previousButton.addEventListener("click", () => scrollRail(-1));
  nextButton.addEventListener("click", () => scrollRail(1));
  rail.addEventListener("scroll", updateArrowState, { passive: true });
  new ResizeObserver(updateArrowState).observe(rail);
  requestAnimationFrame(updateArrowState);
});

let activeLoopingVideo = null;

function updateAudioToggle(toggle, project, isMuted) {
  toggle.setAttribute("aria-pressed", String(!isMuted));
  toggle.setAttribute(
    "aria-label",
    `Turn ${project.title} audio ${isMuted ? "on" : "off"}`
  );
  toggle.querySelector("span").textContent = isMuted ? "Audio Off" : "Audio On";
  toggle.classList.toggle("is-audio-on", !isMuted);
}

function updateAmbientVideoSource(sourceElement, project, isMuted) {
  const frame = sourceElement.querySelector("iframe");
  const nextSource = getFeatureEmbedUrl(project.video, isMuted);
  if (frame.src !== nextSource) frame.src = nextSource;
  sourceElement.dataset.muted = String(isMuted);
  updateAudioToggle(sourceElement.querySelector(".feature-audio-toggle"), project, isMuted);
}

function updateModalAudio(project, isMuted) {
  const frame = player.querySelector("iframe");
  const nextSource = getFeatureEmbedUrl(project.video, isMuted);
  if (frame && frame.src !== nextSource) frame.src = nextSource;
  updateAudioToggle(modalAudioToggle, project, isMuted);
}

function openLoopingVideo(project, sourceElement) {
  const isMuted = sourceElement.dataset.muted !== "false";
  activeLoopingVideo = { project, sourceElement, isMuted };

  // Keep one audible instance only. The original is restored after the modal
  // iframe is removed, so closing never leaves overlapping audio behind.
  if (!isMuted) updateAmbientVideoSource(sourceElement, project, true);
  openVideo(project.id, { looping: true, isMuted });
}

function openVideo(projectId, options = {}) {
  const { looping = false, isMuted = true } = options;
  const project =
    projects.find((item) => item.id === projectId) ??
    (projectId === youtubeDebugProject.id ? youtubeDebugProject : projects[0]);
  const isYouTube = getVideoProvider(project.video) === "youtube";
  const embedUrl = looping
    ? getFeatureEmbedUrl(project.video, isMuted)
    : getVideoEmbedUrl(project.video);
  if (isYouTube) {
    logEnvironmentDebug();
    logYouTubeDebug(project.title, project.video);
  }
  const playerAttributes = isYouTube
    ? `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerpolicy="strict-origin-when-cross-origin"`
    : `allow="autoplay; encrypted-media; fullscreen; picture-in-picture"`;
  player.innerHTML = `
    <iframe
      title="${project.title}"
      src="${embedUrl}"
      ${playerAttributes}
      allowfullscreen
    ></iframe>
  `;
  modal.classList.toggle("is-portrait", project.category === "Shorts & Reels");
  modalAudioToggle.hidden = !looping;
  if (looping) updateAudioToggle(modalAudioToggle, project, isMuted);
  modal.classList.remove("is-visible", "is-closing");
  modal.classList.add("is-opening");
  modal.showModal();
  document.body.classList.add("modal-open");

  if (reducedMotion.matches) {
    modal.classList.add("is-visible");
    modal.classList.remove("is-opening");
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!modal.open || modal.classList.contains("is-closing")) return;
      modal.classList.add("is-visible");
      modal.classList.remove("is-opening");
    });
  });
}

modalAudioToggle.addEventListener("click", () => {
  if (!activeLoopingVideo) return;
  activeLoopingVideo.isMuted = !activeLoopingVideo.isMuted;
  updateModalAudio(activeLoopingVideo.project, activeLoopingVideo.isMuted);
});

window.testYouTubeEmbed = () => openVideo(youtubeDebugProject.id);

const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
let cursorTargetX = 0;
let cursorTargetY = 0;
let cursorCurrentX = 0;
let cursorCurrentY = 0;
let cursorFrame = null;

function renderPlayCursor() {
  const ease = reducedMotion.matches ? 1 : 0.16;
  cursorCurrentX += (cursorTargetX - cursorCurrentX) * ease;
  cursorCurrentY += (cursorTargetY - cursorCurrentY) * ease;
  heroPlayCursor.style.transform = `translate3d(${cursorCurrentX}px, ${cursorCurrentY}px, 0)`;

  const movingX = Math.abs(cursorTargetX - cursorCurrentX) > 0.1;
  const movingY = Math.abs(cursorTargetY - cursorCurrentY) > 0.1;
  cursorFrame = movingX || movingY ? requestAnimationFrame(renderPlayCursor) : null;
}

function queuePlayCursorFrame() {
  if (cursorFrame === null) cursorFrame = requestAnimationFrame(renderPlayCursor);
}

hero.addEventListener("pointerenter", (event) => {
  if (!finePointer.matches) return;
  cursorTargetX = event.clientX;
  cursorTargetY = event.clientY;
  cursorCurrentX = event.clientX;
  cursorCurrentY = event.clientY;
  heroPlayCursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
  hero.classList.add("is-play-cursor-visible");
});

hero.addEventListener("pointermove", (event) => {
  if (!finePointer.matches) return;
  cursorTargetX = event.clientX;
  cursorTargetY = event.clientY;
  queuePlayCursorFrame();
});

hero.addEventListener("pointerleave", () => {
  hero.classList.remove("is-play-cursor-visible");
});

let parallaxTargetX = 0;
let parallaxTargetY = 0;
let parallaxCurrentX = 0;
let parallaxCurrentY = 0;
let parallaxFrame = null;

function renderHeroParallax() {
  if (!finePointer.matches || reducedMotion.matches) {
    parallaxFrame = null;
    return;
  }

  parallaxCurrentX += (parallaxTargetX - parallaxCurrentX) * 0.07;
  parallaxCurrentY += (parallaxTargetY - parallaxCurrentY) * 0.07;
  heroMedia.style.setProperty("--hero-parallax-x", `${parallaxCurrentX}px`);
  heroMedia.style.setProperty("--hero-parallax-y", `${parallaxCurrentY}px`);

  const movingX = Math.abs(parallaxTargetX - parallaxCurrentX) > 0.01;
  const movingY = Math.abs(parallaxTargetY - parallaxCurrentY) > 0.01;
  parallaxFrame = movingX || movingY ? requestAnimationFrame(renderHeroParallax) : null;
}

function queueHeroParallaxFrame() {
  if (parallaxFrame === null) parallaxFrame = requestAnimationFrame(renderHeroParallax);
}

hero.addEventListener("pointermove", (event) => {
  if (!finePointer.matches || reducedMotion.matches) return;
  const bounds = hero.getBoundingClientRect();
  const relativeX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  const relativeY = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
  parallaxTargetX = -relativeX * 18;
  parallaxTargetY = -relativeY * 14;
  queueHeroParallaxFrame();
});

hero.addEventListener("pointerleave", () => {
  if (!finePointer.matches || reducedMotion.matches) return;
  parallaxTargetX = 0;
  parallaxTargetY = 0;
  queueHeroParallaxFrame();
});

hero.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  openVideo("showreel");
});

function closeVideo() {
  if (!modal.open || modal.classList.contains("is-closing")) return;

  function finishClose() {
    modal.classList.remove("is-visible", "is-opening", "is-closing");
    modal.close();
    player.innerHTML = "";
    modalAudioToggle.hidden = true;
    modal.classList.remove("is-portrait");
    if (activeLoopingVideo) {
      const { project, sourceElement, isMuted } = activeLoopingVideo;
      updateAmbientVideoSource(sourceElement, project, isMuted);
      activeLoopingVideo = null;
    }
    document.body.classList.remove("modal-open");
  }

  if (reducedMotion.matches) {
    finishClose();
    return;
  }

  modal.classList.remove("is-visible", "is-opening");
  modal.classList.add("is-closing");
  window.setTimeout(finishClose, 320);
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-video]");
  if (!trigger) return;
  openVideo(trigger.dataset.video);
});

closeButton.addEventListener("click", closeVideo);
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeVideo();
});
modal.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeVideo();
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

document
  .querySelectorAll(".reveal:not(.about-copy):not(.workflow)")
  .forEach((element) => observer.observe(element));

const aboutRevealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      aboutRevealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.35, rootMargin: "0px 0px -25% 0px" }
);

document
  .querySelectorAll(".about-copy.reveal, .workflow.reveal")
  .forEach((element) => aboutRevealObserver.observe(element));

const navigationLinks = [...document.querySelectorAll('.site-header nav a[href^="#"]')];
const navigationSections = navigationLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

function setActiveNavigation(sectionId) {
  navigationLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${sectionId}`;
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function updateActiveNavigation() {
  const viewportAnchor = window.innerHeight * 0.4;
  const activeSection = navigationSections.find((section) => {
    const bounds = section.getBoundingClientRect();
    return bounds.top <= viewportAnchor && bounds.bottom > viewportAnchor;
  });
  setActiveNavigation(activeSection?.id);
}

const navigationObserver = new IntersectionObserver(updateActiveNavigation, {
  rootMargin: "-35% 0px -55% 0px",
  threshold: 0,
});

navigationSections.forEach((section) => navigationObserver.observe(section));
navigationLinks.forEach((link) => {
  link.addEventListener("click", () => {
    setActiveNavigation(link.getAttribute("href").slice(1));
  });
});
updateActiveNavigation();

const stats = document.querySelector(".stats");
const statCounters = [...document.querySelectorAll("[data-counter]")];

function formatStatValue(element, value, isFinal = false) {
  if (element.dataset.format === "views") {
    if (isFinal) return "3M";
    if (value < 1000000) {
      const thousands = Math.min(990, Math.round(value / 10000) * 10);
      return `${thousands}K`;
    }
    return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  return `${Math.floor(value)}${element.dataset.suffix ?? ""}`;
}

function showFinalStats() {
  statCounters.forEach((element) => {
    element.textContent = formatStatValue(element, Number(element.dataset.target), true);
  });
}

function animateStats() {
  if (reducedMotion.matches) {
    showFinalStats();
    return;
  }

  const duration = 1400;
  const staggerDelay = 150;
  const startTime = performance.now();

  function updateStats(now) {
    const elapsed = now - startTime;

    statCounters.forEach((element, index) => {
      const progress = Math.min(
        Math.max((elapsed - index * staggerDelay) / duration, 0),
        1
      );
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const start = Number(element.dataset.start);
      const target = Number(element.dataset.target);
      const value = start + (target - start) * easedProgress;
      element.textContent = formatStatValue(element, value, progress === 1);
    });

    const totalDuration = duration + (statCounters.length - 1) * staggerDelay;
    if (elapsed < totalDuration) requestAnimationFrame(updateStats);
  }

  requestAnimationFrame(updateStats);
}

if (reducedMotion.matches) {
  showFinalStats();
} else {
  statCounters.forEach((element) => {
    element.textContent = formatStatValue(element, Number(element.dataset.start));
  });

  const statsObserver = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      statsObserver.unobserve(stats);
      animateStats();
    },
    { threshold: 0.45, rootMargin: "0px 0px -25% 0px" }
  );
  statsObserver.observe(stats);
}

const workflow = document.querySelector(".workflow");

if (!reducedMotion.matches) {
  workflow.classList.add("has-card-stagger");

  const workflowObserver = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      workflowObserver.unobserve(workflow);
      workflow.classList.add("is-card-staggered");

      window.setTimeout(() => {
        workflow.classList.remove("has-card-stagger", "is-card-staggered");
      }, 800);
    },
    { threshold: 0.35, rootMargin: "0px 0px -25% 0px" }
  );

  workflowObserver.observe(workflow);
}

const contactToggle = document.querySelector(".contact-toggle");
const contactSwitcher = document.querySelector(".contact-switcher");
const contactSocials = document.querySelector(".contact-socials");
const contactForm = document.querySelector(".contact-form");
const formStatus = document.querySelector(".form-status");
const formSubmitButton = contactForm.querySelector(".form-submit");
const formSubmitLabel = formSubmitButton.querySelector("span");
const successTitle = contactForm.querySelector("[data-success-title]");
const successCopy = contactForm.querySelector("[data-success-copy]");
let successResetTimer = null;

function sizeContactPanel() {
  const activePanel = contactSwitcher.classList.contains("is-form")
    ? contactForm
    : contactSocials;
  const panelHeight = Math.ceil(activePanel.getBoundingClientRect().height);
  contactSwitcher.style.setProperty("--contact-panel-height", `${panelHeight}px`);
}

contactToggle.addEventListener("click", () => {
  const showForm = !contactSwitcher.classList.contains("is-form");
  contactSwitcher.classList.toggle("is-form", showForm);
  contactToggle.setAttribute("aria-expanded", String(showForm));
  contactSocials.setAttribute("aria-hidden", String(showForm));
  contactForm.setAttribute("aria-hidden", String(!showForm));
  contactToggle.querySelector("span").textContent = showForm ? "Back to Socials" : "Get in Touch";
  requestAnimationFrame(sizeContactPanel);

  if (showForm) contactForm.querySelector("input").focus({ preventScroll: true });
});

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!contactForm.reportValidity()) return;

  const data = new FormData(contactForm);
  const templateParams = {
    from_name: String(data.get("from_name") ?? "").trim(),
    from_email: String(data.get("from_email") ?? "").trim(),
    budget: String(data.get("budget") ?? "").trim(),
    message: String(data.get("message") ?? "").trim(),
  };

  formStatus.textContent = "Sending...";
  formSubmitLabel.textContent = "Sending...";
  formSubmitButton.disabled = true;
  formSubmitButton.setAttribute("aria-busy", "true");

  try {
    if (!window.emailjs) throw new Error("EmailJS SDK failed to load");
    await window.emailjs.send("service_portfolio", "template_pm58y13", templateParams);
    contactForm.reset();
    formStatus.textContent = "";
    successTitle.textContent = `Thanks, ${templateParams.from_name}.`;
    successCopy.textContent = "Your message has been sent successfully.";
    contactForm.classList.add("is-success");

    window.clearTimeout(successResetTimer);
    successResetTimer = window.setTimeout(() => {
      contactForm.classList.remove("is-success");
      window.setTimeout(() => {
        successTitle.textContent = "";
        successCopy.textContent = "";
      }, 360);
    }, 5000);
  } catch (error) {
    console.error("EmailJS send failed:", error);
    formStatus.textContent = "Something went wrong. Please try again or email me directly.";
  } finally {
    formSubmitButton.disabled = false;
    formSubmitLabel.textContent = "Send Message";
    formSubmitButton.removeAttribute("aria-busy");
    requestAnimationFrame(sizeContactPanel);
  }
});

const contactPanelObserver = new ResizeObserver(() => sizeContactPanel());
contactPanelObserver.observe(contactSocials);
contactPanelObserver.observe(contactForm);

window.addEventListener("resize", () => requestAnimationFrame(sizeContactPanel));
requestAnimationFrame(sizeContactPanel);
