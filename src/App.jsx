import "./App.css";

import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function App() {
  const [page, setPage] = useState("auth"); // navigation state
  const [refreshDashboard, setRefreshDashboard] = useState(false);

  // Auth state
  const [email, setEmail] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get initial user if already signed in
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      },
    );

    return () => listener?.subscription?.unsubscribe();
  }, []);

  // Transactions
  const [transactions, setTransactions] = useState([]);
  const [totals, setTotals] = useState({ income: 0, expense: 0, net: 0 });

  useEffect(() => {
    fetchTransactions();
  }, [refreshDashboard, user]);

  const fetchTransactions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTransactions(data || []);

    const income =
      data
        ?.filter((t) => t.amount > 0)
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const expense =
      data
        ?.filter((t) => t.amount < 0)
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    setTotals({ income, expense, net: income + expense });
  };

  // Sign in / Sign up with magic link (works for new and existing users)
  const signInOrSignUp = async () => {
    if (!email) return alert("Please enter your email");

    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      alert(error.message);
    } else {
      alert("Check your email for the login link!");
    }
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Add Transaction
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!user) return alert("You must be logged in.");
    await supabase.from("transactions").insert([
      {
        user_id: user.id,
        vendor,
        amount: Number(amount),
        created_at: new Date(),
      },
    ]);
    setVendor("");
    setAmount("");
    setRefreshDashboard((prev) => !prev);
    setPage("dashboard");
  };

  // Profile state
  const [profile, setProfile] = useState(null);
  const [income, setIncome] = useState("");
  const [debt, setDebt] = useState("");
  const [savingsGoal, setSavingsGoal] = useState("");

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("financial_profile")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (data) setProfile(data);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!user) return alert("You must be logged in.");
    await supabase.from("financial_profile").upsert({
      user_id: user.id,
      income: Number(income),
      debt: Number(debt),
      savings_goal: Number(savingsGoal),
    });
    alert("Profile saved!");
    fetchProfile();
    setPage("planner");
  };

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  // Planner logic
  const recommendPlan = (income, debt, savingsGoal) => {
    const debtPayment = Math.min(debt, income * 0.3); // up to 30% income
    const savings = Math.min(savingsGoal, income * 0.2); // up to 20% income
    const expenses = income - (debtPayment + savings);
    return { debtPayment, savings, expenses };
  };

  // ----------- UI Renders ------------

  const renderAuth = () => (
    <div>
      {user ? (
        <>
          <p>Signed in as: {user.email}</p>
          <button onClick={signOut}>Logout</button>
        </>
      ) : (
        <>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button onClick={signInOrSignUp}>Login / Sign Up</button>
          <p style={{ fontSize: "0.9em", marginTop: "10px" }}>
            Enter your email. A magic link will be sent to sign in or create a
            new account.
          </p>
        </>
      )}
    </div>
  );

  const renderDashboard = () => (
    <div>
      <h2>Dashboard</h2>
      <div className="card-container">
        <div className="card">
          <h3>Total Income</h3>
          <p>${totals.income}</p>
        </div>
        <div className="card">
          <h3>Total Expense</h3>
          <p>${totals.expense}</p>
        </div>
        <div className="card">
          <h3>Net Balance</h3>
          <p>${totals.net}</p>
        </div>
      </div>

      <h3>Transactions</h3>
      <table>
        <thead>
          <tr>
            <th>Vendor</th>
            <th>Amount</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td>{t.vendor}</td>
              <td
                className={t.amount > 0 ? "amount-positive" : "amount-negative"}
              >
                {t.amount}
              </td>
              <td>{new Date(t.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Spending Chart</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={transactions}>
          <XAxis dataKey="vendor" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="amount" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const renderAddTransaction = () => (
    <form onSubmit={handleAddTransaction}>
      <input
        placeholder="Vendor"
        value={vendor}
        onChange={(e) => setVendor(e.target.value)}
        required
      />
      <input
        placeholder="Amount"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <button type="submit">Add Transaction</button>
    </form>
  );

  const renderProfile = () => (
    <form onSubmit={saveProfile}>
      <h2>Financial Profile</h2>
      <input
        placeholder="Monthly Income"
        type="number"
        value={income}
        onChange={(e) => setIncome(e.target.value)}
        required
      />
      <input
        placeholder="Total Debt"
        type="number"
        value={debt}
        onChange={(e) => setDebt(e.target.value)}
        required
      />
      <input
        placeholder="Savings Goal"
        type="number"
        value={savingsGoal}
        onChange={(e) => setSavingsGoal(e.target.value)}
        required
      />
      <button type="submit">Save Profile</button>
    </form>
  );

  const renderPlanner = () => {
    if (!profile) return <p>No profile found. Please set one up first.</p>;
    const plan = recommendPlan(
      profile.income,
      profile.debt,
      profile.savings_goal,
    );

    return (
      <div>
        <h2>AI Debt & Savings Planner</h2>
        <div className="card-container">
          <div className="card">
            <h3>Debt Payment</h3>
            <p>${plan.debtPayment}</p>
          </div>
          <div className="card">
            <h3>Savings</h3>
            <p>${plan.savings}</p>
          </div>
          <div className="card">
            <h3>Expenses</h3>
            <p>${plan.expenses}</p>
          </div>
        </div>
        <p>
          At this rate, your debt could be gone in{" "}
          <b>{Math.ceil(profile.debt / plan.debtPayment)} months</b> 🎉
        </p>
      </div>
    );
  };

  const renderAbout = () => (
    <div>
      <h2>About</h2>
      <p>App published by Sheena Buwemi</p>
      <p>
        Vibe Fintech Demo — an AI-assisted personal finance helper that
        organizes transactions, teaches budgeting, and helps students learn
        finance.
      </p>
      <h3>How it could make money</h3>
      <ul>
        <li>
          Freemium: basic features free, premium AI insights subscription.
        </li>
        <li>
          Affiliate/referral for financial products (student accounts, savings
          tools).
        </li>
      </ul>
    </div>
  );

  // ----------- Return -----------

  return (
    <div className="container">
      <nav>
        <button onClick={() => setPage("dashboard")}>Dashboard</button>
        <button onClick={() => setPage("add")}>Add Transaction</button>
        <button onClick={() => setPage("planner")}>Planner</button>
        <button onClick={() => setPage("profile")}>Profile</button>
        <button onClick={() => setPage("about")}>About</button>
        <button onClick={() => setPage("auth")}>Login/Logout</button>
      </nav>

      {page === "auth" && renderAuth()}
      {page === "dashboard" && renderDashboard()}
      {page === "add" && renderAddTransaction()}
      {page === "profile" && renderProfile()}
      {page === "planner" && renderPlanner()}
      {page === "about" && renderAbout()}
    </div>
  );
}
