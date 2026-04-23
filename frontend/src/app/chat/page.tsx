import Sidebar from "@/components/Sidebar";

export default function ChatPage() {
    return (
        <div className="flex min-h-screen h-screen">
            <Sidebar />
            <main className="flex-1 md:ml-64 flex flex-col bg-[#f8faf9]">
                <header className="p-8 border-b border-gray-200 bg-white">
                    <h2 className="text-[#1c6b42] text-3xl font-['Plus_Jakarta_Sans'] font-extrabold tracking-tight">AI Assistant</h2>
                    <p className="text-gray-500 text-sm">Ask anything about your diet or nutrition.</p>
                </header>

                {/* Chat Messages Area */}
                <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-[#1c6b42] rounded-full flex items-center justify-center text-white shrink-0">
                            <span className="material-symbols-outlined text-sm">smart_toy</span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 max-w-xl">
                            <p className="text-gray-700">Hello! I'm your NutriVision AI. Based on your recent Phở Bò scan, I recommend drinking some green tea to aid digestion. How can I help you today?</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 flex-row-reverse">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-gray-500 text-sm">person</span>
                        </div>
                        <div className="bg-[#1c6b42] p-4 rounded-2xl rounded-tr-none shadow-sm max-w-xl text-white">
                            <p>How many calories should I eat for dinner to stay under my goal?</p>
                        </div>
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-6 bg-white border-t border-gray-200">
                    <div className="max-w-4xl mx-auto flex items-center gap-4 bg-gray-50 p-2 rounded-full border border-gray-200 focus-within:border-[#1c6b42] focus-within:ring-1 focus-within:ring-[#1c6b42]">
                        <input type="text" placeholder="Message NutriVision AI..." className="flex-1 bg-transparent px-4 py-2 focus:outline-none text-gray-700" />
                        <button className="w-10 h-10 bg-[#1c6b42] text-white rounded-full flex items-center justify-center hover:bg-[#155433] transition-colors">
                            <span className="material-symbols-outlined text-sm">send</span>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}