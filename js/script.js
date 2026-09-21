const POINTS_PER_RAND = 10;
let clientPromise;

document.addEventListener("DOMContentLoaded", async () => {
  initialiseAuthPages();
  await protectRiderPages();
  initialiseRefillPage();
  initialiseDashboard();
  enableAccessibleNavigation();
});

function loadPublicConfig() {
  if (window.TSHWANE_CONFIG) return Promise.resolve(window.TSHWANE_CONFIG);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "js/app-config.js";
    script.onload = () => resolve(window.TSHWANE_CONFIG);
    script.onerror = () => reject(new Error("Unable to load application configuration."));
    document.head.appendChild(script);
  });
}

async function getAuthClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const config = await loadPublicConfig();
      if (!config?.supabaseUrl || !config?.supabasePublishableKey) {
        throw new Error("Authentication is not configured for this deployment.");
      }
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.1");
      return createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    })();
  }
  return clientPromise;
}

async function currentUser() {
  const client = await getAuthClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

async function riderApi(path, options = {}) {
  const config = await loadPublicConfig();
  if (!config?.apiBaseUrl) throw new Error("The rider API is not configured for this deployment.");
  const client = await getAuthClient();
  const { data: { session } } = await client.auth.getSession();
  if (!session) throw new Error("Your session has expired. Please sign in again.");

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${session.access_token}`,
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Request failed.");
  return body;
}

function formatPoints(points) {
  return `${Number(points).toLocaleString("en-ZA")} pts`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency", currency: "ZAR", minimumFractionDigits: 2
  }).format(amount);
}

async function protectRiderPages() {
  const protectedPages = ["dashboard.html", "PointsRefill.html"];
  const currentPage = window.location.pathname.split("/").pop();
  if (!protectedPages.includes(currentPage)) return;
  try {
    if (!await currentUser()) window.location.replace("login.html");
  } catch {
    window.location.replace("login.html");
  }
}

function initialiseAuthPages() {
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const password = document.getElementById("registerPassword");
      const confirmation = document.getElementById("confirmPassword");
      const error = document.getElementById("registerError");
      if (!registerForm.checkValidity()) return registerForm.classList.add("was-validated");
      if (password.value !== confirmation.value) {
        error.textContent = "Passwords must match.";
        return error.classList.remove("d-none");
      }
      try {
        const client = await getAuthClient();
        const { error: signUpError } = await client.auth.signUp({
          email: document.getElementById("registerEmail").value,
          password: password.value,
          options: { emailRedirectTo: `${window.location.origin}/login.html` }
        });
        if (signUpError) throw signUpError;
        error.className = "alert alert-success";
        error.textContent = "Check your email to confirm your account, then sign in.";
      } catch (failure) {
        error.className = "alert alert-danger";
        error.textContent = failure.message;
      }
    });
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const error = document.getElementById("loginError");
      if (!loginForm.checkValidity()) return loginForm.classList.add("was-validated");
      try {
        const client = await getAuthClient();
        const { error: signInError } = await client.auth.signInWithPassword({
          email: document.getElementById("loginEmail").value,
          password: document.getElementById("loginPassword").value
        });
        if (signInError) throw signInError;
        window.location.assign("dashboard.html");
      } catch (failure) {
        error.textContent = failure.message;
        error.classList.remove("d-none");
      }
    });
  }
}

function initialiseRefillPage() {
  const form = document.getElementById("refillForm");
  if (!form) return;

  const customAmount = document.getElementById("customAmount");
  const amountChoices = [...document.querySelectorAll('input[name="amount"]')];
  const paymentChoices = [...document.querySelectorAll('input[name="paymentMethod"]')];
  const error = document.getElementById("formError");
  const modalElement = document.getElementById("confirmModal");
  const confirmModal = window.bootstrap ? new bootstrap.Modal(modalElement) : null;

  const selectedAmount = () => {
    const custom = Number(customAmount.value);
    return customAmount.value !== "" && Number.isFinite(custom)
      ? custom : Number(amountChoices.find((choice) => choice.checked)?.value || 0);
  };
  const selectedMethod = () => paymentChoices.find((choice) => choice.checked)?.value || "Ozow";

  const refreshSummary = () => {
    const amount = selectedAmount();
    document.getElementById("amountDisplay").textContent = formatCurrency(amount);
    document.getElementById("pointsDisplay").textContent = formatPoints(Math.round(amount * POINTS_PER_RAND));
    document.getElementById("methodDisplay").textContent = `Ozow · ${selectedMethod()}`;
  };

  amountChoices.forEach((choice) => choice.addEventListener("change", () => {
    customAmount.value = ""; refreshSummary();
  }));
  paymentChoices.forEach((choice) => choice.addEventListener("change", refreshSummary));
  customAmount.addEventListener("input", () => {
    if (customAmount.value !== "") amountChoices.forEach((choice) => { choice.checked = false; });
    refreshSummary();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = selectedAmount();
    if (!Number.isFinite(amount) || amount < 10 || amount > 1000) {
      error.textContent = "Please choose an amount between R10 and R1,000.";
      return error.classList.remove("d-none");
    }
    error.classList.add("d-none");
    document.getElementById("confirmAmount").textContent = formatCurrency(amount);
    document.getElementById("confirmPoints").textContent = formatPoints(Math.round(amount * POINTS_PER_RAND));
    document.getElementById("confirmMethod").textContent = `Ozow · ${selectedMethod()}`;
    confirmModal?.show();
  });

  document.getElementById("completeRefill").addEventListener("click", async () => {
    const button = document.getElementById("completeRefill");
    button.disabled = true;
    try {
      const amountCents = Math.round(selectedAmount() * 100);
      const order = await riderApi("/refill-orders", {
        method: "POST",
        headers: { "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ amountCents })
      });
      if (!order.checkoutUrl) throw new Error("This refill order is already being processed.");
      window.location.assign(order.checkoutUrl);
    } catch (failure) {
      error.textContent = failure.message;
      error.classList.remove("d-none");
      button.disabled = false;
    }
  });

  riderApi("/me/points").then(({ accounts }) => {
    const total = accounts.reduce((sum, account) => sum + account.availablePoints, 0);
    document.getElementById("currentBalance").textContent = formatPoints(total);
  }).catch(() => {});
  refreshSummary();
}

function initialiseDashboard() {
  const balanceElement = document.getElementById("dashboardBalance");
  if (!balanceElement) return;

  Promise.all([riderApi("/me/points"), riderApi("/me/ledger")]).then(([points, ledger]) => {
    const total = points.accounts.reduce((sum, account) => sum + account.availablePoints, 0);
    balanceElement.textContent = formatPoints(total);
    const list = document.getElementById("transactionList");
    const empty = document.getElementById("emptyTransactions");
    if (!ledger.entries.length) return empty.classList.remove("d-none");
    ledger.entries.forEach((entry) => {
      const row = document.createElement("tr");
      [new Date(entry.created_at).toLocaleDateString("en-ZA"), entry.entry_type,
        `${entry.points_delta > 0 ? "+" : ""}${formatPoints(entry.points_delta)}`, entry.reference]
        .forEach((value) => {
          const cell = document.createElement("td"); cell.textContent = value; row.appendChild(cell);
        });
      list.appendChild(row);
    });
  }).catch((failure) => {
    document.getElementById("emptyTransactions").textContent = failure.message;
    document.getElementById("emptyTransactions").classList.remove("d-none");
  });
}

function enableAccessibleNavigation() {
  const navigation = document.querySelector(".navbar-nav");
  if (!navigation || document.querySelector("[data-auth-navigation]")) return;
  const item = document.createElement("li");
  item.className = "nav-item"; item.dataset.authNavigation = "true";
  const link = document.createElement("a");
  link.className = "nav-link"; link.href = "#"; link.textContent = "Sign out";
  link.addEventListener("click", async (event) => {
    event.preventDefault();
    try { (await getAuthClient()).auth.signOut(); } finally { window.location.assign("index.html"); }
  });
  item.appendChild(link); navigation.appendChild(item);
}
