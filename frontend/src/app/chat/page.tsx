"use client"
import Sidebar from "@/components/Sidebar";
import { useState, useRef, useEffect } from "react";

type Message = { role: 'ai' | 'user'; content: string };

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', content: 'Xin chào! Tôi là AI Dinh Dưỡng của bạn. Dựa trên lần quét Phở Bò gần đây, tôi khuyên bạn nên uống một chút trà xanh để hỗ trợ tiêu hóa. Hôm nay tôi có thể giúp gì cho bạn?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom khi có message mới
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        // Thêm tin nhắn user vào giao diện
        const userMessage: Message = { role: 'user', content: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:8000/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: 1, // TODO: Lấy từ auth context
                    message: input
                }),
            });
            
            if (!response.ok) throw new Error(`API error ${response.status}`);
            const data = await response.json();
            
            // Thêm phản hồi của AI
            const aiMessage: Message = { role: 'ai', content: data.reply || data.response || "Xin lỗi, tôi không thể xử lý yêu cầu của bạn." };
            setMessages([...newMessages, aiMessage]);
        } catch (error) {
            console.error("Lỗi kết nối AI:", error);
            const errorMessage: Message = { role: 'ai', content: "Xin lỗi, có lỗi kết nối. Vui lòng thử lại." };
            setMessages([...newMessages, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen h-screen">
            <Sidebar />
            <main className="flex-1 md:ml-64 flex flex-col bg-[#f8faf9]">
                <header className="p-8 border-b border-gray-200 bg-white">
                    <h2 className="text-[#1c6b42] text-3xl font-['Plus_Jakarta_Sans'] font-extrabold tracking-tight">Trợ lý AI</h2>
                    <p className="text-gray-500 text-sm">Hỏi bất cứ điều gì về chế độ ăn uống hoặc dinh dưỡng của bạn.</p>
                </header>

                {/* Chat Messages Area */}
                <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
                    {messages.map((msg, idx) => (
                        <div 
                            key={idx} 
                            className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            {/* Avatar */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                msg.role === 'ai' 
                                    ? 'bg-[#1c6b42] text-white' 
                                    : 'bg-gray-200 text-gray-500'
                            }`}>
                                <span className="material-symbols-outlined text-sm">
                                    {msg.role === 'ai' ? 'smart_toy' : 'person'}
                                </span>
                            </div>
                            
                            {/* Message Bubble */}
                            <div className={`p-4 rounded-2xl shadow-sm max-w-xl ${
                                msg.role === 'ai' 
                                    ? 'bg-white border border-gray-100 rounded-tl-none' 
                                    : 'bg-[#1c6b42] text-white rounded-tr-none'
                            }`}>
                                <p className={msg.role === 'user' ? 'text-white' : 'text-gray-700'}>
                                    {msg.content}
                                </p>
                            </div>
                        </div>
                    ))}
                    
                    {loading && (
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-[#1c6b42] rounded-full flex items-center justify-center text-white shrink-0">
                                <span className="material-symbols-outlined text-sm">smart_toy</span>
                            </div>
                            <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100">
                                <div className="flex gap-1.5">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 bg-white border-t border-gray-200">
                    <div className="max-w-4xl mx-auto flex items-center gap-4 bg-gray-50 p-2 rounded-full border border-gray-200 focus-within:border-[#1c6b42] focus-within:ring-1 focus-within:ring-[#1c6b42]">
                        <input 
                            type="text" 
                            placeholder="Nhắn tin cho AI Dinh Dưỡng..." 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            disabled={loading}
                            className="flex-1 bg-transparent px-4 py-2 focus:outline-none text-gray-700 disabled:opacity-50" 
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={loading || !input.trim()}
                            className="w-10 h-10 bg-[#1c6b42] text-white rounded-full flex items-center justify-center hover:bg-[#155433] transition-colors disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-sm">send</span>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}