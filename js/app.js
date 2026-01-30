import { Store } from './store.js';

// --- App State & Initialization ---
const App = {
    chart: null,

    init: () => {
        Store.init();
        App.setupEventListeners();
        App.renderDashboard();
    },

    setupEventListeners: () => {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const viewId = item.getAttribute('data-view');
                App.navigateTo(viewId);
            });
        });

        // Modal
        const modal = document.getElementById('add-modal');
        document.getElementById('add-expense-btn').addEventListener('click', () => {
            document.getElementById('date').valueAsDate = new Date(); // Default today
            modal.classList.add('open');
        });
        document.getElementById('close-modal').addEventListener('click', () => modal.classList.remove('open'));
        document.getElementById('cancel-modal').addEventListener('click', () => modal.classList.remove('open'));

        // Form Submit
        document.getElementById('add-expense-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('amount').value);
            const purpose = document.getElementById('purpose').value;
            const date = document.getElementById('date').value;
            const category = document.getElementById('category').value;
            const pm = document.getElementById('payment-mode').value;

            Store.addTransaction({ amount, purpose, date, category, paymentMode: pm });

            modal.classList.remove('open');
            e.target.reset();
            App.renderDashboard(); // Refresh all views
            if (document.getElementById('transactions-view').classList.contains('active-view')) {
                App.renderTransactions();
            }
        });

        // Budget Update
        document.getElementById('save-budget-btn')?.addEventListener('click', () => {
            const val = document.getElementById('budget-input').value;
            if (val) {
                Store.updateBudget(val);
                alert('Budget updated!');
                App.renderDashboard();
            }
        });

        // Filters
        document.querySelectorAll('input[name="location"]').forEach(radio => {
            radio.addEventListener('change', () => {
                App.renderTransactions();
            });
        });
    },

    navigateTo: (viewName) => {
        // Sidebar active state
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.querySelector(`.nav-item[data-view="${viewName}"]`).classList.add('active');

        // View Visibility
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active-view'));
        document.getElementById(`${viewName}-view`).classList.add('active-view');

        // Update Header Title
        document.getElementById('page-title').textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);

        // Render specific view data
        if (viewName === 'dashboard') App.renderDashboard();
        if (viewName === 'transactions') App.renderTransactions();
        if (viewName === 'budgets') {
            const data = Store.getData();
            document.getElementById('budget-input').value = data.budget;
        }
    },

    renderDashboard: () => {
        const data = Store.getData();
        const { budget, transactions } = data;

        // Calculate Totals
        const currentMonth = new Date().getMonth();
        const monthlyTransactions = transactions.filter(t => new Date(t.date).getMonth() === currentMonth);
        const totalSpent = monthlyTransactions.reduce((acc, t) => acc + t.amount, 0);
        const remaining = budget - totalSpent;

        // Update Cards
        document.getElementById('dash-budget-amount').textContent = App.formatCurrency(budget);
        document.getElementById('dash-spent-amount').textContent = App.formatCurrency(totalSpent);
        const remEl = document.getElementById('dash-remaining-amount');
        remEl.textContent = App.formatCurrency(remaining);

        // Visual warning for budget
        if (remaining < 0) remEl.style.color = 'var(--danger-color)';
        else if (remaining < (budget * 0.2)) remEl.style.color = 'var(--warning-color)';
        else remEl.style.color = '#2979ff';

        // Update Recent Transactions List (Top 5)
        const recentList = document.getElementById('dash-recent-list');
        recentList.innerHTML = '';
        transactions.slice(0, 5).forEach(t => {
            const li = document.createElement('li');
            li.className = 'transaction-item';
            li.innerHTML = `
                <div class="t-info">
                    <div class="t-icon">
                        <span class="material-icons-round">${App.getIconForCategory(t.category)}</span>
                    </div>
                    <div class="t-details">
                        <h4>${t.purpose}</h4>
                        <small>${t.date} • ${t.category}</small>
                    </div>
                </div>
                <div class="t-amount">-$${t.amount.toFixed(2)}</div>
            `;
            recentList.appendChild(li);
        });

        // Update Chart
        App.renderChart(transactions);
    },

    renderTransactions: () => {
        const filter = document.querySelector('input[name="location"]:checked').value;
        const data = Store.getData();

        let filtered = data.transactions;
        if (filter !== 'all') {
            filtered = filtered.filter(t => t.category === filter);
        }

        const tbody = document.getElementById('transactions-list-body');
        tbody.innerHTML = '';

        filtered.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${t.date}</td>
                <td>${t.purpose}</td>
                <td><span class="badge ${t.category}">${t.category}</span></td>
                <td>${t.paymentMode}</td>
                <td>$${t.amount.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderChart: (transactions) => {
        const ctx = document.getElementById('spendingChart').getContext('2d');

        // Process data for last 7 days or month
        // Simple implementation: Last 7 defined days
        const labels = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        const dataPoints = labels.map(dateStr => {
            return transactions
                .filter(t => t.date === dateStr)
                .reduce((acc, t) => acc + t.amount, 0);
        });

        if (App.chart) App.chart.destroy();

        App.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(l => l.slice(5)), // MM-DD
                datasets: [{
                    label: 'Daily Spending',
                    data: dataPoints,
                    borderColor: '#00e676',
                    backgroundColor: 'rgba(0, 230, 118, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#8b949e' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#8b949e' }
                    }
                }
            }
        });
    },

    formatCurrency: (num) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    },

    getIconForCategory: (cat) => {
        return cat === 'college' ? 'school' : 'local_activity';
    }
};

window.app = App; // For global access if needed
document.addEventListener('DOMContentLoaded', App.init);
