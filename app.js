const storageKey = "fluxo-financas-transactions";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const form = document.querySelector("#transactionForm");
const transactionList = document.querySelector("#transactionList");
const emptyState = document.querySelector("#emptyState");
const filter = document.querySelector("#filter");
const dateInput = document.querySelector("#date");
const balanceElement = document.querySelector("#balance");
const incomeElement = document.querySelector("#incomeTotal");
const expenseElement = document.querySelector("#expenseTotal");
const savingsElement = document.querySelector("#savingsRate");
const monthStatusElement = document.querySelector("#monthStatus");
const categoryList = document.querySelector("#categoryList");

let transactions = loadTransactions();

registerServiceWorker();

dateInput.valueAsDate = new Date();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const amount = Number(formData.get("amount"));

  if (!amount || amount <= 0) {
    return;
  }

  transactions = [
    {
      id: crypto.randomUUID(),
      description: formData.get("description").trim(),
      amount,
      date: formData.get("date"),
      type: formData.get("type"),
      category: formData.get("category"),
    },
    ...transactions,
  ];

  saveTransactions();
  form.reset();
  dateInput.valueAsDate = new Date();
  render();
});

filter.addEventListener("change", render);

transactionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete]");

  if (!button) {
    return;
  }

  transactions = transactions.filter((item) => item.id !== button.dataset.delete);
  saveTransactions();
  render();
});

function loadTransactions() {
  const savedTransactions = localStorage.getItem(storageKey);

  if (!savedTransactions) {
    return getStarterTransactions();
  }

  try {
    return JSON.parse(savedTransactions);
  } catch {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(storageKey, JSON.stringify(transactions));
}

function render() {
  const visibleTransactions =
    filter.value === "all"
      ? transactions
      : transactions.filter((item) => item.type === filter.value);

  renderSummary();
  renderTransactions(visibleTransactions);
  renderCategories();
}

function renderSummary() {
  const totals = transactions.reduce(
    (accumulator, transaction) => {
      accumulator[transaction.type] += transaction.amount;
      return accumulator;
    },
    { income: 0, expense: 0 },
  );

  const balance = totals.income - totals.expense;
  const savingsRate =
    totals.income > 0 ? Math.max((balance / totals.income) * 100, 0) : 0;

  balanceElement.textContent = formatCurrency(balance);
  incomeElement.textContent = formatCurrency(totals.income);
  expenseElement.textContent = formatCurrency(totals.expense);
  savingsElement.textContent = `${Math.round(savingsRate)}%`;

  monthStatusElement.textContent = transactions.length
    ? `${transactions.length} lançamento${transactions.length > 1 ? "s" : ""} registrado${transactions.length > 1 ? "s" : ""}`
    : "Nenhum lançamento ainda";
}

function renderTransactions(items) {
  emptyState.hidden = items.length > 0;
  transactionList.innerHTML = items
    .map(
      (transaction) => `
        <li class="transaction-item ${transaction.type}">
          <span class="transaction-icon">${transaction.type === "income" ? "+" : "-"}</span>
          <span class="transaction-meta">
            <strong>${escapeHtml(transaction.description)}</strong>
            <span>${escapeHtml(transaction.category)}</span>
          </span>
          <span class="transaction-date">${formatDate(transaction.date)}</span>
          <strong class="transaction-amount">
            ${transaction.type === "income" ? "+" : "-"} ${formatCurrency(transaction.amount)}
          </strong>
          <button class="delete-button" type="button" data-delete="${transaction.id}" aria-label="Excluir ${escapeHtml(transaction.description)}">
            x
          </button>
        </li>
      `,
    )
    .join("");
}

function renderCategories() {
  const expensesByCategory = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((accumulator, transaction) => {
      accumulator[transaction.category] =
        (accumulator[transaction.category] || 0) + transaction.amount;
      return accumulator;
    }, {});

  const entries = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);
  const highestExpense = entries[0]?.[1] || 0;

  if (!entries.length) {
    categoryList.innerHTML = `
      <div class="empty-state">
        <strong>Sem despesas para analisar.</strong>
        <span>Quando você registrar uma saída, ela aparece aqui por categoria.</span>
      </div>
    `;
    return;
  }

  categoryList.innerHTML = entries
    .map(([category, amount]) => {
      const width = highestExpense ? (amount / highestExpense) * 100 : 0;

      return `
        <div class="category-row">
          <strong>${escapeHtml(category)}</strong>
          <span class="bar-track" aria-hidden="true">
            <span class="bar-fill" style="width: ${width}%"></span>
          </span>
          <span>${formatCurrency(amount)}</span>
        </div>
      `;
    })
    .join("");
}

function formatCurrency(value) {
  return currencyFormatter.format(value);
}

function formatDate(date) {
  const parsedDate = new Date(`${date}T00:00:00`);
  return dateFormatter.format(parsedDate);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getStarterTransactions() {
  const today = new Date();
  const isoDate = today.toISOString().slice(0, 10);

  return [
    {
      id: crypto.randomUUID(),
      description: "Salário",
      amount: 4200,
      date: isoDate,
      type: "income",
      category: "Salário",
    },
    {
      id: crypto.randomUUID(),
      description: "Mercado",
      amount: 356.8,
      date: isoDate,
      type: "expense",
      category: "Alimentação",
    },
    {
      id: crypto.randomUUID(),
      description: "Transporte",
      amount: 128.5,
      date: isoDate,
      type: "expense",
      category: "Transporte",
    },
  ];
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      // The app still works normally if offline support is unavailable.
    });
  });
}

render();
