/* Hidden staff-entry gesture. This reveals the sign-in page; it does not grant privileges. */
(() => {
  "use strict";
  const target = document.getElementById("tshwaneAdminTap");
  if (!target) return;

  let taps = 0;
  let resetHandle;
  const requiredTaps = 7;
  const resetAfterMs = 1800;

  function registerTap(event) {
    if (event) event.preventDefault();
    taps += 1;
    target.setAttribute("aria-label", `Tshwane logo. ${taps} of ${requiredTaps} taps registered`);
    if (resetHandle) window.clearTimeout(resetHandle);

    if (taps >= requiredTaps) {
      taps = 0;
      target.setAttribute("aria-label", "Tshwane logo");
      window.location.assign("admin.html");
      return;
    }

    resetHandle = window.setTimeout(() => {
      taps = 0;
      target.setAttribute("aria-label", "Tshwane logo");
    }, resetAfterMs);
  }

  target.addEventListener("click", registerTap);
  target.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") registerTap(event);
  });
})();
