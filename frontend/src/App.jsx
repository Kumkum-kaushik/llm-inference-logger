import  {useState, useEffect} from 'react';
import axios from "axios"

const API = "http://127.0.0.1:8000"

export default function App(){
    const [conversations, setConversations] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchConversations();
    }, []);

    const fetchConversations = async () => {
        const res = await axios.get(`${API}/conversations/`);
        setConversations(res.data);
    };

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
        const res = await axios.post(`${API}/chat`,{
            session_id: sessionId,
            message: userMsg
        });
        setMessages((prev) => [...prev, { role: "assistant", content: res.data.response }]);
        setLoading(false);
    };

    return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", fontFamily: "sans-serif", background: "#f9fafb" }}>
      {/* Sidebar */}
      <div style={{ width: "280px", background: "#1e1e2e", color: "white", padding: "16px", overflowY: "auto" }}>
        <h2 style={{ marginBottom: "16px" }}>💬 Conversations</h2>
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

      {/* Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f9fafb" }}>
        <div style={{ padding: "16px", background: "white", borderBottom: "1px solid #e5e7eb" }}>
          <h2 style={{ margin: 0 }}>🤖 Ollive Chatbot</h2>
          {sessionId && <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Chat {conversations.findIndex(c => c.session_id === sessionId) + 1}</p>}
        </div>

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
      </div>
    </div>
  );
}
