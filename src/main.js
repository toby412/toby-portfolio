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
    return url.searchParams.get("v") ?? url.pathname.match(/\/embed\/([^/?]+)/)?.[1];
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

function projectCard(project, isClone = false) {
  const button = document.createElement("button");
  button.className = `project-card tone-${project.tone}`;
  button.type = "button";
  button.dataset.video = project.id;
  button.setAttribute("aria-label", `Play ${project.title}`);
  if (isClone) {
    button.classList.add("project-card-clone");
    button.tabIndex = -1;
    button.setAttribute("aria-hidden", "true");
  }
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

document.querySelectorAll("[data-category]").forEach((container) => {
  const categoryProjects = projects.filter(
    (project) => project.category === container.dataset.category
  );
  container.dataset.originalCount = String(categoryProjects.length);

  for (let setIndex = 0; setIndex < 3; setIndex += 1) {
    categoryProjects.forEach((project) => {
      container.append(projectCard(project, setIndex !== 1));
    });
  }
});

document.querySelectorAll(".carousel-shell").forEach((carousel) => {
  const row = carousel.querySelector(".project-grid");
  const previousButton = carousel.querySelector(".carousel-arrow--previous");
  const nextButton = carousel.querySelector(".carousel-arrow--next");
  const originalCount = Number(row.dataset.originalCount);
  let originalStart = 0;
  let setSpan = 0;
  let targetScrollLeft = row.scrollLeft;
  let arrowFrame = null;

  function measureLoop() {
    const cards = row.querySelectorAll(".project-card");
    const firstOriginal = cards[originalCount];
    const firstTrailingClone = cards[originalCount * 2];
    if (!firstOriginal || !firstTrailingClone) return;

    const rowLeft = row.getBoundingClientRect().left;
    originalStart =
      row.scrollLeft + firstOriginal.getBoundingClientRect().left - rowLeft;
    setSpan =
      firstTrailingClone.getBoundingClientRect().left -
      firstOriginal.getBoundingClientRect().left;
  }

  function updateArrowState() {
    const unavailable = originalCount <= 1;
    previousButton.disabled = unavailable;
    nextButton.disabled = unavailable;
  }

  function normalizeLoopPosition() {
    if (!setSpan) return;
    const lowerBoundary = originalStart - setSpan * 0.5;
    const upperBoundary = originalStart + setSpan * 0.5;

    if (row.scrollLeft < lowerBoundary) {
      row.scrollLeft += setSpan;
      targetScrollLeft += setSpan;
    } else if (row.scrollLeft > upperBoundary) {
      row.scrollLeft -= setSpan;
      targetScrollLeft -= setSpan;
    }
  }

  function animateArrowScroll() {
    const distance = targetScrollLeft - row.scrollLeft;
    if (Math.abs(distance) < 0.5) {
      row.scrollLeft = targetScrollLeft;
      normalizeLoopPosition();
      arrowFrame = null;
      return;
    }

    row.scrollLeft += distance * 0.16;
    normalizeLoopPosition();
    arrowFrame = requestAnimationFrame(animateArrowScroll);
  }

  function scrollToPosition(position) {
    targetScrollLeft = position;
    if (reducedMotion.matches) {
      row.scrollLeft = targetScrollLeft;
      normalizeLoopPosition();
      return;
    }
    if (arrowFrame === null) arrowFrame = requestAnimationFrame(animateArrowScroll);
  }

  function cancelAnimatedScroll() {
    if (arrowFrame !== null) cancelAnimationFrame(arrowFrame);
    arrowFrame = null;
    targetScrollLeft = row.scrollLeft;
  }

  function cardScrollDistance() {
    const card = row.querySelector(".project-card");
    if (!card) return row.clientWidth;
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    return card.getBoundingClientRect().width + gap;
  }

  row.addEventListener(
    "wheel",
    (event) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      if (arrowFrame !== null) cancelAnimatedScroll();
    },
    { passive: true }
  );

  row.addEventListener("scroll", normalizeLoopPosition, { passive: true });
  row.addEventListener("pointerdown", cancelAnimatedScroll, { passive: true });

  previousButton.addEventListener("click", () => {
    const start = arrowFrame === null ? row.scrollLeft : targetScrollLeft;
    scrollToPosition(start - cardScrollDistance());
  });

  nextButton.addEventListener("click", () => {
    const start = arrowFrame === null ? row.scrollLeft : targetScrollLeft;
    scrollToPosition(start + cardScrollDistance());
  });

  new ResizeObserver(() => {
    cancelAnimatedScroll();
    measureLoop();
    row.scrollLeft = originalStart;
    targetScrollLeft = originalStart;
    updateArrowState();
  }).observe(row);

  requestAnimationFrame(() => {
    measureLoop();
    row.scrollLeft = originalStart;
    targetScrollLeft = originalStart;
    updateArrowState();
  });
});

function openVideo(projectId) {
  const project =
    projects.find((item) => item.id === projectId) ??
    (projectId === youtubeDebugProject.id ? youtubeDebugProject : projects[0]);
  const isYouTube = getVideoProvider(project.video) === "youtube";
  const embedUrl = getVideoEmbedUrl(project.video);
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
  modal.showModal();
  document.body.classList.add("modal-open");
}

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
  parallaxTargetX = -relativeX * 8;
  parallaxTargetY = -relativeY * 6;
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
  modal.close();
  player.innerHTML = "";
  document.body.classList.remove("modal-open");
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
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.open) closeVideo();
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

document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

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
  const startTime = performance.now();

  function updateStats(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);

    statCounters.forEach((element) => {
      const start = Number(element.dataset.start);
      const target = Number(element.dataset.target);
      const value = start + (target - start) * easedProgress;
      element.textContent = formatStatValue(element, value, progress === 1);
    });

    if (progress < 1) requestAnimationFrame(updateStats);
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
    { threshold: 0.35 }
  );
  statsObserver.observe(stats);
}

const contactToggle = document.querySelector(".contact-toggle");
const contactSwitcher = document.querySelector(".contact-switcher");
const contactSocials = document.querySelector(".contact-socials");
const contactForm = document.querySelector(".contact-form");
const formStatus = document.querySelector(".form-status");

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

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(contactForm);
  const name = data.get("name");
  const email = data.get("email");
  const message = data.get("message");
  const subject = encodeURIComponent(`Portfolio enquiry from ${name}`);
  const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);

  formStatus.textContent = "Opening your email app...";
  window.location.href = `mailto:hoger963852@gmail.com?subject=${subject}&body=${body}`;
});

const contactPanelObserver = new ResizeObserver(() => sizeContactPanel());
contactPanelObserver.observe(contactSocials);
contactPanelObserver.observe(contactForm);

window.addEventListener("resize", () => requestAnimationFrame(sizeContactPanel));
requestAnimationFrame(sizeContactPanel);
