import {useState, useEffect} from 'react';
import axios from "axios"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const API = "https://ollive-llm-inference-logger-backend.onrender.com"

export default function App(){
    const [conversations, setConversations] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [tab, setTab] = useState("chat");
    const [provider, setProvider] = useState("groq-fast");

    useEffect(() => {
        fetchConversations();
    }, []);

    const fetchConversations = async () => {
        const res = await axios.get(`${API}/conversations/`);
        setConversations(res.data);
    };

    const fetchStats = async () => {
    const res = await axios.get(`${API}/stats`);
    setStats(res.data);
    };

    useEffect(() => {
        if (tab === "dashboard") {
        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }
    }, [tab]);

    const newConversation = async () => {
        const res = await axios.post(`${API}/conversation/new`);
        setSessionId(res.data.session_id);
        setMessages([]);
        fetchConversations();
    };

    const resumeConversation = async (id) => {
        setSessionId(id);
        const res = await axios.get(`${API}/conversation/${id}/messages`);
        setMessages(res.data);
    };

    const cancelConversation = async (id) => {
        await axios.delete(`${API}/conversation/${id}`);
        if (sessionId == id){
            setSessionId(null);
            setMessages([]);
        }
        fetchConversations();
    };

    const sendMessage = async () => {
        if (!input.trim() || !sessionId) return;
        const userMsg = input;
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        setLoading(true);

        const response = await fetch(`${API}/chat/stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId, message: userMsg, provider: provider })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMsg = "";

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            assistantMsg += decoder.decode(value);
            setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantMsg };
                return updated;
            });
        }
        setLoading(false);
    };

    return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", fontFamily: "sans-serif", background: "#f9fafb" }}>
      {/* Sidebar */}
      <div style={{ width: "280px", background: "#1e1e2e", color: "white", padding: "16px", overflowY: "auto" }}>
        <h2 style={{ marginBottom: "16px" }}>💬 Conversations</h2>

        {/* Tab Buttons */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button
            onClick={() => setTab("chat")}
            style={{ flex: 1, padding: "8px", background: tab === "chat" ? "#7c3aed" : "#2d2d3f", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
            Chat
          </button>
          <button
            onClick={() => { setTab("dashboard"); fetchStats(); }}
            style={{ flex: 1, padding: "8px", background: tab === "dashboard" ? "#7c3aed" : "#2d2d3f", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
            📊 Stats
          </button>
        </div>

        <button onClick={newConversation} style={{ width: "100%", padding: "10px", background: "#7c3aed", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", marginBottom: "16px" }}>
          + New Chat
        </button>
        {conversations.map((c) => (
          <div key={c.session_id} style={{ background: sessionId === c.session_id ? "#7c3aed" : "#2d2d3f", borderRadius: "8px", padding: "10px", marginBottom: "8px" }}>
            <div style={{ fontSize: "12px", marginBottom: "6px", wordBreak: "break-all" }}>
              Chat{conversations.indexOf(c)+1}
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={() => resumeConversation(c.session_id)} style={{ flex: 1, padding: "4px", background: "#4c1d95", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
                Resume
              </button>
              <button onClick={() => cancelConversation(c.session_id)} style={{ flex: 1, padding: "4px", background: "#dc2626", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f9fafb" }}>

        {/* Header */}
        <div style={{ padding: "16px", background: "white", borderBottom: "1px solid #e5e7eb" }}>
          <h2 style={{ margin: 0 }}>🤖 Ollive Chatbot</h2>
          {sessionId && <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Chat {conversations.findIndex(c => c.session_id === sessionId) + 1}</p>}
        </div>

        {/* Dashboard Tab */}
        {tab === "dashboard" && (
          <div style={{ padding: "24px" }}>
            <h2 style={{ marginBottom: "24px" }}>📊 Dashboard</h2>
            {!stats ? (
              <p>Loading stats...</p>
            ) : (
              <>
                <div style={{ display: "flex", gap: "16px", marginBottom: "32px" }}>
                  <div style={{ flex: 1, background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", textAlign: "center" }}>
                    <p style={{ color: "#6b7280", margin: 0 }}>Avg Latency</p>
                    <h3 style={{ margin: "8px 0", fontSize: "28px", color: "#7c3aed" }}>{stats.avg_latency_ms} ms</h3>
                  </div>
                  <div style={{ flex: 1, background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", textAlign: "center" }}>
                    <p style={{ color: "#6b7280", margin: 0 }}>Total Tokens</p>
                    <h3 style={{ margin: "8px 0", fontSize: "28px", color: "#7c3aed" }}>{stats.total_tokens}</h3>
                  </div>
                  <div style={{ flex: 1, background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", textAlign: "center" }}>
                    <p style={{ color: "#6b7280", margin: 0 }}>Total Requests</p>
                    <h3 style={{ margin: "8px 0", fontSize: "28px", color: "#7c3aed" }}>{stats.total_requests}</h3>
                  </div>
                  <div style={{ flex: 1, background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", textAlign: "center" }}>
                    <p style={{ color: "#6b7280", margin: 0 }}>Errors</p>
                    <h3 style={{ margin: "8px 0", fontSize: "28px", color: "#dc2626" }}>{stats.error_count}</h3>
                  </div>
                </div>

                <div style={{ background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                  <h3 style={{ marginBottom: "16px" }}>Metrics Overview</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { name: "Avg Latency (ms)", value: stats.avg_latency_ms },
                      { name: "Total Tokens", value: stats.total_tokens },
                      { name: "Total Requests", value: stats.total_requests },
                      { name: "Errors", value: stats.error_count },
                    ]}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#7c3aed" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {tab === "chat" && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {!sessionId && <p style={{ color: "#6b7280", textAlign: "center", marginTop: "40px", fontSize: "20px" }}>Start a new conversation or resume one!</p>}
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "70%", padding: "12px 16px", borderRadius: "12px", background: m.role === "user" ? "#7c3aed" : "white", color: m.role === "user" ? "white" : "black", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && <div style={{ color: "#6b7280" }}>Thinking...</div>}
            </div>

            <div style={{ padding: "16px", background: "white", borderTop: "1px solid #e5e7eb", display: "flex", gap: "8px" }}>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb", outline: "none", background: "white", cursor: "pointer" }}>
                <option value="groq-fast">⚡ Groq Fast (Llama 8B)</option>
                <option value="groq-large">🧠 Groq Large (Llama 70B)</option>
              </select>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder={sessionId ? "Type a message..." : "Start a new conversation first!"}
                disabled={!sessionId}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb", outline: "none" }}
              />
              <button onClick={sendMessage} disabled={!sessionId || loading} style={{ padding: "10px 20px", background: "#7c3aed", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
