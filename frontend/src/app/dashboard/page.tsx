import Sidebar from "@/components/Sidebar";

export default function DashboardPage() {
    return (
        <div className="bg-[#f8faf9] text-on-surface font-body antialiased flex min-h-screen overflow-x-hidden">
            <Sidebar />
            <main className="flex-1 md:ml-64 p-8 md:p-12">
                <header className="mb-10">
                    <h2 className="text-[#1c6b42] text-4xl font-['Plus_Jakarta_Sans'] font-extrabold tracking-tight mb-2">Dashboard</h2>
                    <p className="text-gray-500">Your daily nutrition overview.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {/* Stat Card 1 */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="material-symbols-outlined text-orange-500 bg-orange-50 p-2 rounded-lg">local_fire_department</span>
                            <h3 className="font-semibold text-gray-700">Calories Today</h3>
                        </div>
                        <span className="text-4xl font-bold text-[#1c6b42]">1,450 <span className="text-lg text-gray-400 font-normal">/ 2,000 kcal</span></span>
                    </div>

                    {/* Stat Card 2 */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="material-symbols-outlined text-blue-500 bg-blue-50 p-2 rounded-lg">water_drop</span>
                            <h3 className="font-semibold text-gray-700">Water Intake</h3>
                        </div>
                        <span className="text-4xl font-bold text-[#1c6b42]">1.2 <span className="text-lg text-gray-400 font-normal">/ 2.5 Liters</span></span>
                    </div>

                    {/* Stat Card 3 */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="material-symbols-outlined text-purple-500 bg-purple-50 p-2 rounded-lg">restaurant</span>
                            <h3 className="font-semibold text-gray-700">Meals Logged</h3>
                        </div>
                        <span className="text-4xl font-bold text-[#1c6b42]">3 <span className="text-lg text-gray-400 font-normal">meals</span></span>
                    </div>
                </div>
            </main>
        </div>
    );
}