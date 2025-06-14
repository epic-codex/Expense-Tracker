let salary = 0;
let totalExpensesByDate = {};
let expensesWithCategory = {};
let authenticated = false;
const PASSWORD = "Money";

window.onload = function () {
  loadPasswordState();
  authenticated ? (showLogin(false), initApp()) : showLogin(true);
};

function showLogin(show) {
  document.getElementById("authSection").style.display = show ? "block" : "none";
  document.getElementById("mainApp").style.display = show ? "none" : "block";
}

function authenticate() {
  const input = document.getElementById("passwordInput").value;
  if (input === PASSWORD) {
    authenticated = true;
    localStorage.setItem("authenticated", "true");
    showLogin(false);
    initApp();
  } else {
    alert("Wrong password!");
  }
}

function logout() {
  localStorage.removeItem("authenticated");
  location.reload();
}

function loadPasswordState() {
  authenticated = localStorage.getItem("authenticated") === "true";
}

function initApp() {
  setTodayDate();
  loadSalary();
  loadExpenses();
  updateBalance();
  showHistory();
  drawChart();
}

function setTodayDate() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("dateInput").value = today;
}

function setSalary() {
  const input = document.getElementById("salaryInput").value;
  salary = parseFloat(input) || 0;
  if (salary <= 0) return;
  localStorage.setItem("monthlySalary", salary);
  updateBalance();
  showMessage("✅ Budget saved!");
}

function resetSalary() {
  salary = 0;
  localStorage.removeItem("monthlySalary");
  document.getElementById("salaryInput").value = "";
  updateBalance();
  showMessage("💼 Budget reset.");
}

function showMessage(msg) {
  const msgBox = document.getElementById("feedbackMessage");
  msgBox.innerText = msg;
  setTimeout(() => msgBox.innerText = "", 3000);
}

function loadSalary() {
  const storedSalary = localStorage.getItem("monthlySalary");
  if (storedSalary) {
    salary = parseFloat(storedSalary);
    document.getElementById("salaryInput").value = salary;
  }
}

function addDailyExpense() {
  const date = document.getElementById("dateInput").value;
  const expenseInputs = document.querySelectorAll(".expenseInput");

  let totalToday = 0;
  let anyExpense = false;

  if (!expensesWithCategory[date]) expensesWithCategory[date] = [];

  expenseInputs.forEach((input) => {
    const val = parseFloat(input.value);
    if (!isNaN(val) && val > 0) {
      const category = input.dataset.category;
      expensesWithCategory[date].push({ amount: val, category });
      totalToday += val;
      anyExpense = true;
    }
    input.value = "";
  });

  if (!anyExpense) return;

  totalExpensesByDate[date] = (totalExpensesByDate[date] || 0) + totalToday;
  saveExpenses();
  updateBalance();
  showHistory();
  drawChart();
  showMessage("📝 Expenses saved.");
}

function updateBalance() {
  let totalSpent = Object.values(totalExpensesByDate).reduce((a, b) => a + b, 0);
  document.getElementById("balanceDisplay").innerText =
    `Remaining Balance: ৳${(salary - totalSpent).toFixed(2)}`;
}

function saveExpenses() {
  localStorage.setItem("expenseData", JSON.stringify(totalExpensesByDate));
  localStorage.setItem("expenseWithCategoryData", JSON.stringify(expensesWithCategory));
}

function loadExpenses() {
  const totals = localStorage.getItem("expenseData");
  const withCat = localStorage.getItem("expenseWithCategoryData");
  if (totals) totalExpensesByDate = JSON.parse(totals);
  if (withCat) expensesWithCategory = JSON.parse(withCat);
}

function showHistory() {
  const container = document.getElementById("historyContainer");
  if (!Object.keys(totalExpensesByDate).length) {
    container.innerHTML = "<p>No history.</p>";
    return;
  }

  let table = `<table>
    <thead>
      <tr><th>Date</th><th>Categories (Amount)</th><th>Total</th><th>Download</th></tr>
    </thead><tbody>`;

  Object.keys(totalExpensesByDate).sort().forEach(date => {
    const catData = expensesWithCategory[date] || [];
    const catTotals = {};
    catData.forEach(e => catTotals[e.category] = (catTotals[e.category] || 0) + e.amount);
    let cats = Object.entries(catTotals)
      .map(([k, v]) => `${k}: ৳${v.toFixed(2)}`)
      .join(", ");
    table += `<tr>
      <td>${date}</td>
      <td>${cats}</td>
      <td>৳${totalExpensesByDate[date].toFixed(2)}</td>
      <td><button onclick="downloadSingleCSV('${date}')">⬇</button></td>
    </tr>`;
  });

  table += "</tbody></table>";
  container.innerHTML = table;
}

function downloadCSV() {
  if (!Object.keys(expensesWithCategory).length) return;
  let csv = "Date,Category,Amount\n";
  Object.keys(expensesWithCategory).forEach(date => {
    expensesWithCategory[date].forEach(e => {
      csv += `${date},${e.category},${e.amount.toFixed(2)}\n`;
    });
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "expense_statement.csv";
  a.click();
}

function downloadSingleCSV(date) {
  const data = expensesWithCategory[date];
  if (!data?.length) return;
  let csv = "Date,Category,Amount\n";
  data.forEach(e => csv += `${date},${e.category},${e.amount.toFixed(2)}\n`);
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `expense_${date}.csv`;
  a.click();
}

function clearHistory() {
  totalExpensesByDate = {};
  expensesWithCategory = {};
  localStorage.removeItem("expenseData");
  localStorage.removeItem("expenseWithCategoryData");
  updateBalance();
  showHistory();
  drawChart();
  showMessage("🗑️ History cleared.");
}

function drawChart() {
  const ctx = document.getElementById('expenseChart').getContext('2d');
  const dates = Object.keys(totalExpensesByDate).sort();
  const totals = dates.map(d => totalExpensesByDate[d]);

  if (window.chartInstance) window.chartInstance.destroy();

  window.chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'Daily Total Expenses',
        data: totals,
        borderColor: '#0077cc',
        backgroundColor: 'rgba(0, 119, 204, 0.2)',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          title: { display: true, text: 'Date' }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Expense (৳)' }
        }
      },
      plugins: {
        legend: { display: true, position: 'top' }
      }
    }
  });
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
}
