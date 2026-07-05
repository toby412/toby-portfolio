const GA_MEASUREMENT_ID = "G-ZWM4MR7ZGT";

let lastTrackedLocation;

function getPageLocation() {
  return window.location.href;
}

export function trackPageView() {
  const pageLocation = getPageLocation();

  if (!window.gtag || pageLocation === lastTrackedLocation) return;

  lastTrackedLocation = pageLocation;
  window.gtag("event", "page_view", {
    page_title: document.title,
    page_location: pageLocation,
    page_path: `${window.location.pathname}${window.location.search}${window.location.hash}`,
  });
}

function observeClientSideNavigation() {
  const notifyAfterNavigation = (methodName) => {
    const originalMethod = window.history[methodName];

    window.history[methodName] = function (...args) {
      const result = originalMethod.apply(this, args);
      queueMicrotask(trackPageView);
      return result;
    };
  };

  notifyAfterNavigation("pushState");
  notifyAfterNavigation("replaceState");
  window.addEventListener("popstate", trackPageView);
  window.addEventListener("hashchange", trackPageView);
}

export function initializeAnalytics() {
  if (window.gtag) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.append(script);

  observeClientSideNavigation();
  trackPageView();
}
