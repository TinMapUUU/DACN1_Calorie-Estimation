"use client";

import Sidebar from "@/components/Sidebar";
import MacroRings from "@/components/MacroRings";
import { useState, useEffect } from "react";

export default function DashboardPage() {
    // 1. STATE LƯU TRỮ DỮ LIỆU
    const [greeting, setGreeting] = useState("Chào bạn 👋");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dashboardData, setDashboardData] = useState({
        caloriesConsumed: 0,
        calorieGoal: 2000,
        proteinCurrent: 0,
        proteinTarget: 0,
        carbsCurrent: 0,
        carbsTarget: 0,
        fatCurrent: 0,
        fatTarget: 0,
        bmiValue: 0,
        bmiStatus: "Đang tải...",
    });

    // API_BASE config
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const USER_ID = 1; // TODO: Lấy từ auth context/session

    // 2. LOGIC LỜI CHÀO THEO GIỜ ĐỊA PHƯƠNG
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) {
            setGreeting("Chào buổi sáng 👋");
        } else if (hour >= 12 && hour < 18) {
            setGreeting("Chào buổi chiều 🌤️");
        } else {
            setGreeting("Chào buổi tối 🌙");
        }
    }, []);

    // 3. FETCH DỮ LIỆU TỪ DATABASE (API THẬT)
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch dữ liệu hôm nay từ 3 endpoints
                const [chartRes, macrosRes, summaryRes] = await Promise.all([
                    fetch(`${API_BASE}/api/history/chart/${USER_ID}?period=day`, { cache: "no-store" }),
                    fetch(`${API_BASE}/api/history/macros/${USER_ID}`, { cache: "no-store" }),
                    fetch(`${API_BASE}/api/history/summary/${USER_ID}`, { cache: "no-store" }),
                ]);

                if (!chartRes.ok || !macrosRes.ok || !summaryRes.ok) {
                    throw new Error("Không thể tải dữ liệu từ server");
                }

                const chartData = await chartRes.json();
                const macrosData = await macrosRes.json();
                const summaryData = await summaryRes.json();

                // Tính tổng calo từ chart data (array of {date, label, consumed})
                const totalCalories = chartData.reduce((sum: number, item: any) => sum + (item.consumed || 0), 0);

                // Lấy BMI từ profile
                const profileRes = await fetch(`${API_BASE}/api/v1/profile`, { 
                    cache: "no-store",
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
                });
                
                let bmiValue = 0;
                let bmiStatus = "N/A";
                if (profileRes.ok) {
                    const profile = await profileRes.json();
                    bmiValue = profile.current_bmi || 0;
                    
                    // Tính BMI status
                    if (bmiValue < 18.5) bmiStatus = "Gầy";
                    else if (bmiValue < 25) bmiStatus = "Bình thường";
                    else if (bmiValue < 30) bmiStatus = "Thừa cân";
                    else bmiStatus = "Béo phì";
                }

                setDashboardData({
                    caloriesConsumed: Math.round(totalCalories),
                    calorieGoal: summaryData.daily_goal || 2000,
                    proteinCurrent: Math.round(macrosData.protein.current),
                    proteinTarget: Math.round(macrosData.protein.target),
                    carbsCurrent: Math.round(macrosData.carbs.current),
                    carbsTarget: Math.round(macrosData.carbs.target),
                    fatCurrent: Math.round(macrosData.fat.current),
                    fatTarget: Math.round(macrosData.fat.target),
                    bmiValue: Math.round(bmiValue * 10) / 10,
                    bmiStatus: bmiStatus,
                });

            } catch (error) {
                console.error("Lỗi khi tải dữ liệu Dashboard:", error);
                setError(error instanceof Error ? error.message : "Lỗi không xác định");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    // 4. TÍNH TOÁN CÁC CHỈ SỐ PHỤ
    const remainingCalories = Math.max(0, dashboardData.calorieGoal - dashboardData.caloriesConsumed);
    const remainingProtein = Math.max(0, dashboardData.proteinTarget - dashboardData.proteinCurrent);
    const remainingCarbs = Math.max(0, dashboardData.carbsTarget - dashboardData.carbsCurrent);
    const remainingFat = Math.max(0, dashboardData.fatTarget - dashboardData.fatCurrent);

    return (
        <div className="bg-[#ffffff] text-on-surface font-body antialiased flex min-h-screen overflow-x-hidden">
            <Sidebar />
            
            <main className="flex-1 md:ml-64 p-8 md:p-12">
                {/* HEADER */}
                <header className="mb-10">
                    <h2 className="text-gray-900 text-3xl font-['Plus_Jakarta_Sans'] font-bold tracking-tight mb-2">
                        {greeting}
                    </h2>
                    <p className="text-gray-500 font-medium text-sm">
                        Here is your vitality summary for today.
                    </p>
                </header>

                {/* ERROR ALERT */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-center gap-3">
                        <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium text-sm">{error}</span>
                    </div>
                )}

                {/* DASHBOARD WIDGETS */}
                {loading ? (
                    <div className="animate-pulse flex space-x-4">
                        <div className="flex-1 space-y-6 py-1">
                            <div className="h-48 bg-gray-200 rounded-[2rem]"></div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* WIDGET 1: MACRO RINGS (Vòng tròn đồng tâm) */}
                        <div className="lg:col-span-2">
                            <MacroRings
                                calories={dashboardData.caloriesConsumed}
                                maxCalories={dashboardData.calorieGoal}
                                protein={dashboardData.proteinCurrent}
                                proteinTarget={dashboardData.proteinTarget}
                                carbs={dashboardData.carbsCurrent}
                                carbsTarget={dashboardData.carbsTarget}
                                fat={dashboardData.fatCurrent}
                                fatTarget={dashboardData.fatTarget}
                            />
                        </div>

                        {/* CỘT PHẢI CÁC WIDGET NHỎ */}
                        <div className="flex flex-col gap-6">
                            
                            {/* WIDGET 2: REMAINING */}
                            <div className="bg-[#f7f9f8] p-6 rounded-[2rem] flex flex-col justify-between h-full border border-gray-100">
                                <h3 className="font-medium text-gray-600 text-sm mb-4">Remaining Allowance</h3>
                                <div className="flex justify-between items-end mb-4">
                                    <span className="text-4xl font-bold text-gray-900 tracking-tight">
                                        {remainingCalories}
                                    </span>
                                    <div className="bg-[#e2f1e6] p-2 rounded-full text-[#1c6b42]">
                                        <span className="material-symbols-outlined text-xl">restaurant</span>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 font-medium">Ideal for a light dinner.</p>
                            </div>

                            {/* WIDGET 3: BMI STATUS */}
                            <div className="bg-[#ffebe0] p-6 rounded-[2rem] flex flex-col justify-between h-full border border-orange-50">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-orange-900 text-sm">monitor_weight</span>
                                    <h3 className="font-medium text-orange-900 text-sm">BMI Status</h3>
                                </div>
                                <div>
                                    <span className="block text-2xl font-bold text-orange-950 mb-1">
                                        {dashboardData.bmiStatus}
                                    </span>
                                    <p className="text-xs text-orange-800 font-medium">
                                        {dashboardData.bmiValue} - {dashboardData.bmiValue < 18.5 ? "Gầy" : dashboardData.bmiValue < 25 ? "Bình thường" : dashboardData.bmiValue < 30 ? "Thừa cân" : "Béo phì"}
                                    </p>
                                </div>
                            </div>

                            {/* WIDGET 4: MACROS REMAINING */}
                            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-[2rem] border border-blue-100">
                                <h3 className="font-semibold text-gray-800 text-sm mb-4">Macros Còn Lại</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600 font-medium">Protein</span>
                                        <span className="font-bold text-blue-600">{remainingProtein}g</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600 font-medium">Carbs</span>
                                        <span className="font-bold text-purple-600">{remainingCarbs}g</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600 font-medium">Fat</span>
                                        <span className="font-bold text-amber-600">{remainingFat}g</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}