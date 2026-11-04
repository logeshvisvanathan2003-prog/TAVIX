import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth.jsx";
import { createChatSessionId, currentChatSessionId, setCurrentChatSessionId } from "../chatSessions.js";
import ChatPanel from "../components/ChatPanel.jsx";
import ClientWorkspace from "../components/ClientWorkspace.jsx";

export default function ChatPage() {
  const [q] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [historyChats, setHistoryChats] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [deletingChatId, setDeletingChatId] = useState(null);
  const [historyActionError, setHistoryActionError] = useState("");
  const sessionId = q.get("session");
  const m = parseInt(q.get("mission") || "") || null;
  useEffect(() => {
    if (!sessionId) {
      const current = currentChatSessionId() || createChatSessionId();
      navigate(`/chat?session=${current}${m ? `&mission=${m}` : ""}`, { replace: true });
      return;
    }
    setCurrentChatSessionId(sessionId);
  }, [sessionId, m, navigate]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const loadHistory = () => api("/chats/mine").then((items) => {
      if (active) {
        setHistoryChats(items);
        setHistoryError("");
        setHistoryLoading(false);
      }
    }).catch((error) => {
      if (active) {
        setHistoryError(error.message);
        setHistoryLoading(false);
      }
    });
    const refresh = () => loadHistory();
    loadHistory();
    const timer = setInterval(loadHistory, 15000);
    window.addEventListener("tavix:chat-updated", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("tavix:chat-updated", refresh);
    };
  }, [user]);
  const selectWorkspaceItem = (missionId, workspaceTab) => {
    if (missionId) navigate(`/?open=${missionId}#client-missions`);
    else if (workspaceTab === "tickets") navigate("/?tab=tickets#client-missions");
  };
  const selectChat = (id) => {
    setCurrentChatSessionId(id);
    navigate(`/chat?session=${encodeURIComponent(id)}`);
  };
  const deleteChat = async (id) => {
    setDeletingChatId(id);
    setHistoryActionError("");
    try {
      await api(`/chats/mine/${encodeURIComponent(id)}`, { method: "DELETE" });
      setHistoryChats((chats) => chats.filter((chat) => chat.session_id !== id));
      if (id === sessionId) {
        const freshSessionId = createChatSessionId();
        setCurrentChatSessionId(freshSessionId);
        navigate(`/chat?session=${freshSessionId}`, { replace: true });
      }
    } catch (error) {
      setHistoryActionError(error.message);
    } finally {
      setDeletingChatId(null);
    }
  };
  if (!sessionId) return null;
  return (
    <ClientWorkspace active="assistant" title="TAVIX AI" subtitle={m ? `Mission #${m} · project-aware assistant` : ""} historyChats={historyChats} historyLoading={historyLoading} historyError={historyError} historyActionError={historyActionError} deletingChatId={deletingChatId} onChatDelete={deleteChat} selectedChatId={sessionId} onChatSelect={selectChat} onMissionSelect={selectWorkspaceItem}>
      <main className="workspace-chat-page">
        <div className="workspace-chat-landing">
          <div className="workspace-chat-intro">
            <p className="font-display text-[10px] uppercase tracking-[.2em] text-tavix-red">TAVIX · YOUR AI WORKSPACE</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">{m ? `Mission #${m}` : `Hello${user?.name ? `, ${user.name.split(" ")[0]}` : ""}.`}</h2>
            <p className="mt-3 text-sm text-black/55">{m ? "Ask about the requirements, build progress, or next steps." : "What are we building today?"}</p>
          </div>
          <div className="workspace-chat-frame">
            <ChatPanel key={sessionId} mission={m} sessionId={sessionId} variant="page" />
          </div>
        </div>
      </main>
    </ClientWorkspace>
  );
}
