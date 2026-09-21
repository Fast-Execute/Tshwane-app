// Presentation prototype: no account, payment, or personal data leaves this browser.
const STORAGE_KEY = "tshwaneBusPointsDemo";
const AUTH_SESSION_KEY = "tshwaneBusPointsDemoSession";
const POINTS_PER_RAND = 10;
const DEFAULT_BALANCE = 2450;

document.addEventListener("DOMContentLoaded", () => {
  initialiseAuthPages();
  protectRiderPages();
  initialiseDashboard();
  initialiseRefillPage();
  enableNavigation();
});

function readAccount() {
  try {
    const account = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (account && Number.isFinite(account.balance) && Array.isArray(account.transactions)) return account;
  } catch (_) {}
  return { balance: DEFAULT_BALANCE, transactions: [] };
}

function saveAccount(account) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
}

function hasSession() {
  return sessionStorage.getItem(AUTH_SESSION_KEY) === "active";
}

function formatPoints(points) {
  return `${Number(points).toLocaleString("en-ZA")} pts`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency", currency: "ZAR", minimumFractionDigits: 2
  }).format(amount);
}

function protectRiderPages() {
  const page = window.location.pathname.split("/").pop();
  if (["dashboard.html", "PointsRefill.html"].includes(page) && !hasSession()) {
    window.location.replace("login.html");
  }
}

function initialiseAuthPages() {
  const register = document.getElementById("registerForm");
  if (register) register.addEventListener("submit", (event) => {
    event.preventDefault();
    const password = document.getElementById("registerPassword");
    const confirmation = document.getElementById("confirmPassword");
    const error = document.getElementById("registerError");
    if (!register.checkValidity()) return register.classList.add("was-validated");
    if (password.value !== confirmation.value) {
      error.textContent = "Passwords must match.";
      return error.classList.remove("d-none");
    }
    sessionStorage.setItem(AUTH_SESSION_KEY, "active");
    window.location.assign("dashboard.html");
  });

  const login = document.getElementById("loginForm");
  if (login) login.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!login.checkValidity()) return login.classList.add("was-validated");
    sessionStorage.setItem(AUTH_SESSION_KEY, "active");
    window.location.assign("dashboard.html");
  });
}

function initialiseDashboard() {
  const balance = document.getElementById("dashboardBalance");
  if (!balance) return;
  const account = readAccount();
  balance.textContent = formatPoints(account.balance);

  const latest = account.transactions[0];
  if (latest) {
    document.getElementById("latestRefill").textContent = formatCurrency(latest.amount);
    document.getElementById("latestRefillDetail").textContent =
      `${formatPoints(latest.points)} added on ${new Date(latest.date).toLocaleDateString("en-ZA")}`;
  }

  const list = document.getElementById("transactionList");
  const empty = document.getElementById("emptyTransactions");
  if (!account.transactions.length) return empty.classList.remove("d-none");

  account.transactions.forEach((transaction) => {
    const row = document.createElement("tr");
    [
      new Date(transaction.date).toLocaleDateString("en-ZA"),
      formatCurrency(transaction.amount),
      `+${formatPoints(transaction.points)}`,
      transaction.method,
      transaction.reference
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    list.appendChild(row);
  });

  document.getElementById("resetDemo").addEventListener("click", () => {
    if (!window.confirm("Reset this browser's demo balance and refill history?")) return;
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  });
}

function initialiseRefillPage() {
  const form = document.getElementById("refillForm");
  if (!form) return;

  const customAmount = document.getElementById("customAmount");
  const amounts = [...document.querySelectorAll('input[name="amount"]')];
  const methods = [...document.querySelectorAll('input[name="paymentMethod"]')];
  const error = document.getElementById("formError");
  const modal = window.bootstrap ? new bootstrap.Modal(document.getElementById("confirmModal")) : null;

  const selectedAmount = () => {
    const custom = Number(customAmount.value);
    return customAmount.value !== "" && Number.isFinite(custom)
      ? custom : Number(amounts.find((item) => item.checked)?.value || 0);
  };
  const selectedMethod = () => methods.find((item) => item.checked)?.value || "Mobile payment";
  const refresh = () => {
    const amount = selectedAmount();
    document.getElementById("amountDisplay").textContent = formatCurrency(amount);
    document.getElementById("pointsDisplay").textContent = formatPoints(Math.round(amount * POINTS_PER_RAND));
    document.getElementById("methodDisplay").textContent = selectedMethod();
  };

  amounts.forEach((item) => item.addEventListener("change", () => { customAmount.value = ""; refresh(); }));
  methods.forEach((item) => item.addEventListener("change", refresh));
  customAmount.addEventListener("input", () => {
    if (customAmount.value !== "") amounts.forEach((item) => { item.checked = false; });
    refresh();
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
    document.getElementById("confirmMethod").textContent = selectedMethod();
    modal?.show();
  });

  document.getElementById("completeRefill").addEventListener("click", () => {
    const amount = selectedAmount();
    const points = Math.round(amount * POINTS_PER_RAND);
    const account = readAccount();
    account.balance += points;
    account.transactions.unshift({
      reference: `DEMO-${Date.now().toString(36).toUpperCase()}`,
      amount, points, method: selectedMethod(), date: new Date().toISOString()
    });
    saveAccount(account);
    window.location.assign("dashboard.html");
  });

  document.getElementById("currentBalance").textContent = formatPoints(readAccount().balance);
  refresh();
}

function enableNavigation() {
  const navigation = document.querySelector(".navbar-nav");
  if (!navigation || document.querySelector("[data-demo-navigation]")) return;
  const item = document.createElement("li");
  item.className = "nav-item";
  item.dataset.demoNavigation = "true";
  const link = document.createElement("a");
  link.className = "nav-link";
  if (hasSession()) {
    link.href = "#";
    link.textContent = "Sign out";
    link.addEventListener("click", (event) => {
      event.preventDefault();
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      localStorage.removeItem(STORAGE_KEY);
      window.location.assign("index.html");
    });
  } else {
    link.href = "login.html";
    link.textContent = "Sign in";
  }
  item.appendChild(link);
  navigation.appendChild(item);
}
