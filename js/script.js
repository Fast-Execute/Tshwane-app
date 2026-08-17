const STORAGE_KEY = "tshwaneBusPointsDemo";
const POINTS_PER_RAND = 10;
const DEFAULT_BALANCE = 2450;

document.addEventListener("DOMContentLoaded", () => {
  initialiseRefillPage();
  initialiseDashboard();
});

function readAccount() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Number.isFinite(saved.balance) && Array.isArray(saved.transactions)) return saved;
  } catch (_) {
    // Start a fresh demo account if the saved value is invalid.
  }
  return { balance: DEFAULT_BALANCE, transactions: [] };
}

function saveAccount(account) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
}

function formatPoints(points) {
  return `${Number(points).toLocaleString("en-ZA")} pts`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2
  }).format(amount);
}

function initialiseRefillPage() {
  const form = document.getElementById("refillForm");
  if (!form) return;

  const customAmount = document.getElementById("customAmount");
  const amountChoices = [...document.querySelectorAll('input[name="amount"]')];
  const paymentChoices = [...document.querySelectorAll('input[name="paymentMethod"]')];
  const modalElement = document.getElementById("confirmModal");
  const error = document.getElementById("formError");
  const confirmModal = window.bootstrap ? new bootstrap.Modal(modalElement) : null;

  function selectedAmount() {
    const custom = Number(customAmount.value);
    if (customAmount.value !== "" && Number.isFinite(custom)) return custom;
    return Number(amountChoices.find((choice) => choice.checked)?.value || 0);
  }

  function selectedMethod() {
    return paymentChoices.find((choice) => choice.checked)?.value || "";
  }

  function refreshSummary() {
    const amount = selectedAmount();
    const points = Math.round(amount * POINTS_PER_RAND);
    document.getElementById("amountDisplay").textContent = formatCurrency(amount);
    document.getElementById("pointsDisplay").textContent = formatPoints(points);
    document.getElementById("methodDisplay").textContent = selectedMethod();
  }

  amountChoices.forEach((choice) => choice.addEventListener("change", () => {
    customAmount.value = "";
    refreshSummary();
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
      error.classList.remove("d-none");
      return;
    }

    error.classList.add("d-none");
    document.getElementById("confirmAmount").textContent = formatCurrency(amount);
    document.getElementById("confirmPoints").textContent = formatPoints(Math.round(amount * POINTS_PER_RAND));
    document.getElementById("confirmMethod").textContent = selectedMethod();
    confirmModal?.show();
  });

  document.getElementById("completeRefill").addEventListener("click", () => {
    const amount = selectedAmount();
    const points = Math.round(amount * POINTS_PER_RAND);
    const account = readAccount();
    const reference = `DEMO-${Date.now().toString(36).toUpperCase()}`;

    account.balance += points;
    account.transactions.unshift({
      reference,
      amount,
      points,
      method: selectedMethod(),
      date: new Date().toISOString()
    });
    saveAccount(account);
    window.location.href = "dashboard.html";
  });

  document.getElementById("currentBalance").textContent = formatPoints(readAccount().balance);
  refreshSummary();
}

function initialiseDashboard() {
  const balanceElement = document.getElementById("dashboardBalance");
  if (!balanceElement) return;

  const account = readAccount();
  balanceElement.textContent = formatPoints(account.balance);

  const latest = account.transactions[0];
  const latestRefill = document.getElementById("latestRefill");
  const latestDetail = document.getElementById("latestRefillDetail");
  if (latest) {
    latestRefill.textContent = formatCurrency(latest.amount);
    latestDetail.textContent = `${formatPoints(latest.points)} added on ${new Date(latest.date).toLocaleDateString("en-ZA")}`;
  }

  const list = document.getElementById("transactionList");
  const empty = document.getElementById("emptyTransactions");
  if (!account.transactions.length) {
    empty.classList.remove("d-none");
  } else {
    account.transactions.forEach((transaction) => {
      const row = document.createElement("tr");
      const values = [
        new Date(transaction.date).toLocaleDateString("en-ZA"),
        formatCurrency(transaction.amount),
        `+${formatPoints(transaction.points)}`,
        transaction.method,
        transaction.reference
      ];
      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      list.appendChild(row);
    });
  }

  document.getElementById("resetDemo").addEventListener("click", () => {
    if (!window.confirm("Reset this browser's demo balance and refill history?")) return;
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  });
}