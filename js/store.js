export const Store = {
    get: (key) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },
    set: (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
    },
    init: () => {
        const existingup = Store.get('expenseTrackerData');
        if (!existingup) {
            const initialData = {
                budget: 5000,
                transactions: [
                    {
                        id: crypto.randomUUID(),
                        amount: 150,
                        date: new Date().toISOString().split('T')[0],
                        purpose: "Welcome Coffee",
                        category: "college",
                        paymentMode: "cash"
                    }
                ]
            };
            Store.set('expenseTrackerData', initialData);
        }
    },
    getData: () => {
        return Store.get('expenseTrackerData');
    },
    addTransaction: (transaction) => {
        const data = Store.getData();
        data.transactions.unshift({ ...transaction, id: crypto.randomUUID() });
        Store.set('expenseTrackerData', data);
    },
    updateBudget: (newBudget) => {
        const data = Store.getData();
        data.budget = parseFloat(newBudget);
        Store.set('expenseTrackerData', data);
    }
};
