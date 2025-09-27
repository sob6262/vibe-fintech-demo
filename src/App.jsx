import { useState } from "react";
import { supabase } from "./supabaseClient";
import "./App.css";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");

  // Login
  async function signIn() {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
    else {
      setUser(data.user);
      fetchTransactions(data.user.id);
    }
  }

  // Logout
  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setTransactions([]);
  }

  // Fetch transactions for logged-in user
  async function fetchTransactions(userId) {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId);
    if (error) console.error(error);
    else setTransactions(data);
  }

  // Add new transaction
  async function addTransaction() {
    if (!vendor || !amount) return alert("Fill in both vendor and amount");
    const { data, error } = await supabase
      .from("transactions")
      .insert([{ user_id: user.id, vendor, amount: parseFloat(amount) }]);
    if (error) console.error(error);
    else {
      setTransactions([...transactions, data[0]]);
      setVendor("");
      setAmount("");
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      {user ? (
        <div>
          <h2>Welcome, {user.email}</h2>
          <button onClick={signOut}>Logout</button>

          <h3>Your Transactions</h3>
          <ul>
            {transactions.map((tx) => (
              <li key={tx.id}>
                {tx.vendor} - ${tx.amount} on{" "}
                {new Date(tx.created_at).toLocaleDateString()}
              </li>
            ))}
          </ul>

          <h3>Add New Transaction</h3>
          <input
            type="text"
            placeholder="Vendor"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
          />
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button onClick={addTransaction}>Add Transaction</button>
        </div>
      ) : (
        <div>
          <h2>Login</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={signIn}>Login</button>
        </div>
      )}
    </div>
  );
}
