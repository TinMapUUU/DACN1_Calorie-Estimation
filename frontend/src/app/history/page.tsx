import Sidebar from "@/components/Sidebar";

export default function HistoryPage() {
    const dummyHistory = [
        { id: 1, food: "Phở Bò", cal: 450, date: "Today, 08:30 AM", confidence: "95%" },
        { id: 2, food: "Salad Gà", cal: 320, date: "Yesterday, 12:15 PM", confidence: "88%" },
        { id: 3, food: "Cơm Tấm", cal: 600, date: "Yesterday, 07:00 PM", confidence: "92%" },
    ];

    return (
        <div className="bg-[#f8faf9] text-on-surface font-body antialiased flex min-h-screen overflow-x-hidden">
            <Sidebar />
            <main className="flex-1 md:ml-64 p-8 md:p-12">
                <header className="mb-10">
                    <h2 className="text-[#1c6b42] text-4xl font-['Plus_Jakarta_Sans'] font-extrabold tracking-tight mb-2">Food History</h2>
                    <p className="text-gray-500">Review your past scans and meals.</p>
                </header>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="divide-y divide-gray-100">
                        {dummyHistory.map((item) => (
                            <div key={item.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[#e6efeb] text-[#1c6b42] rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined">restaurant_menu</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">{item.food}</h3>
                                        <p className="text-sm text-gray-500">{item.date} • {item.confidence} Match</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block font-black text-[#1c6b42] text-xl">{item.cal}</span>
                                    <span className="text-xs text-gray-400 font-semibold uppercase">Kcal</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}