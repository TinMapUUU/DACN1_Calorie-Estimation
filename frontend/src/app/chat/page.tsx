import Sidebar from "@/components/Sidebar";

export default function ChatPage() {
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
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-[#1c6b42] rounded-full flex items-center justify-center text-white shrink-0">
                            <span className="material-symbols-outlined text-sm">smart_toy</span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 max-w-xl">
                            <p className="text-gray-700">Xin chào! Tôi là AI Dinh Dưỡng của bạn. Dựa trên lần quét Phở Bò gần đây, tôi khuyên bạn nên uống một chút trà xanh để hỗ trợ tiêu hóa. Hôm nay tôi có thể giúp gì cho bạn?</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 flex-row-reverse">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-gray-500 text-sm">person</span>
                        </div>
                        <div className="bg-[#1c6b42] p-4 rounded-2xl rounded-tr-none shadow-sm max-w-xl text-white">
                            <p>Tôi nên ăn bao nhiêu calo cho bữa tối để không vượt quá mục tiêu?</p>
                        </div>
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-6 bg-white border-t border-gray-200">
                    <div className="max-w-4xl mx-auto flex items-center gap-4 bg-gray-50 p-2 rounded-full border border-gray-200 focus-within:border-[#1c6b42] focus-within:ring-1 focus-within:ring-[#1c6b42]">
                        <input type="text" placeholder="Nhắn tin cho AI Dinh Dưỡng..." className="flex-1 bg-transparent px-4 py-2 focus:outline-none text-gray-700" />
                        <button className="w-10 h-10 bg-[#1c6b42] text-white rounded-full flex items-center justify-center hover:bg-[#155433] transition-colors">
                            <span className="material-symbols-outlined text-sm">send</span>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}