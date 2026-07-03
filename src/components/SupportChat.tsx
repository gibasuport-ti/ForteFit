import { useState, useRef, useEffect, FormEvent } from "react";
import { MessageSquare, X, Send, Sparkles, Dumbbell } from "lucide-react";
import { api } from "../utils/api";

interface Message {
  sender: "user" | "bot";
  text: string;
  time: string;
}

export default function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: "Olá! Sou o ForteAI, assistente virtual da ForteFit Suplementos. 🏋️‍♂️\n\nEstou aqui para te ajudar a escolher os suplementos ideais para o seu objetivo: ganho de massa muscular, queima calórica, foco nos treinos ou imunidade! Como posso te ajudar hoje?",
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll down
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMsgText = inputText.trim();
    setInputText("");

    const newMsg: Message = {
      sender: "user",
      text: userMsgText,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, newMsg]);
    setLoading(true);

    try {
      // Map previous messages to format expected by backend
      const chatHistory = messages.map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await api.askAI(userMsgText, chatHistory);

      const botReply: Message = {
        sender: "bot",
        text: res.reply || "Tive um problema rápido de conexão, mas já estou online! Em que posso te ajudar?",
        time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Desculpe, meu motor de raciocínio está um pouco ocupado agora, mas se você quiser saber sobre Whey Protein ou Creatina, digite de forma simples que responderei!",
          time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="ai-support-chat" className="fixed bottom-6 right-6 z-50">
      {/* Floating Action Button Trigger */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center relative group cursor-pointer"
        >
          <MessageSquare className="h-6 w-6" />
          <span className="absolute right-full mr-3 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-emerald-400" />
            Dúvidas de suplementação? Fale com a IA!
          </span>
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-white"></span>
          </span>
        </button>
      )}

      {/* Floating Chat Dialogue Window */}
      {isOpen && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-[360px] sm:w-[400px] h-[520px] flex flex-col overflow-hidden animate-slide-in">
          {/* Header */}
          <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl">
                <Dumbbell className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-bold text-sm">ForteAI</span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Consultor de Suplementos Online</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages display box */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 bg-slate-50/50 space-y-4">
            {messages.map((m, i) => {
              const isBot = m.sender === "bot";
              return (
                <div key={i} className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[82%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    isBot 
                      ? "bg-white text-slate-800 border border-slate-100 rounded-tl-none shadow-xs" 
                      : "bg-slate-900 text-white rounded-tr-none shadow-md"
                  }`}>
                    <p className="whitespace-pre-line">{m.text}</p>
                    <p className={`text-[8px] mt-1.5 text-right ${isBot ? "text-slate-400" : "text-slate-300"}`}>{m.time}</p>
                  </div>
                </div>
              );
            })}

            {/* Loading/Typing animation */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white text-slate-400 border border-slate-100 rounded-2xl rounded-tl-none p-3 shadow-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            )}
          </div>

          {/* Prompt Form Footer */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <input
              type="text"
              required
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Pergunte sobre Whey Protein, Creatina..."
              className="flex-1 bg-slate-50 text-slate-800 border border-slate-100 text-xs rounded-xl px-4 py-2.5 focus:bg-white focus:outline-emerald-500 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
