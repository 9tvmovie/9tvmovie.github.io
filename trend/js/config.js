(function () {
  const isLocal =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname === "::1";

  const BACKEND_URL = isLocal
    ? "http://127.0.0.1:8787"
    : "https://trend.salsabiladepi31.workers.dev";

  window.API_BASE_URL = BACKEND_URL;
})();