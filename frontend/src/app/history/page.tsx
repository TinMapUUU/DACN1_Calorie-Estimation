'use client';
import Sidebar from "@/components/Sidebar";
import MealLogItem from "@/components/MealLogItem";
import { useState, useEffect, useCallback, useRef } from "react";
// IMPORT THÊM RECHARTS
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// ─── Config ──────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const POLL_MS = 30_000; // real-time polling mỗi 30 giây
const USER_ID = 1;      // TODO: lấy từ auth context / session

// ─── Types ───────────────────────────────────────────────
type ChartPoint = { date: string; label: string; consumed: number };
type Summary = { weekly_avg: number; change_pct: number; direction: string; daily_goal: number };
type MacroItem = { current: number; target: number };
type Macros = { protein: MacroItem; carbs: MacroItem; fat: MacroItem };
type MealItem = { id: number; name: string; cal: number; image_url?: string; scanned_at?: string; rating?: number; notes?: string };
type MealLog = { type: string; icon: string; time: string; total: number; items: MealItem[] };

// ─── Fetch helper ────────────────────────────────────────
async function apiFetch<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json() as Promise<T>;
}

// ─── Skeleton component ──────────────────────────────────
const Skeleton = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

// ─── Utility helpers (MỚI THÊM) ──────────────────────────
const getDaysInPeriod = (period: string) => {
    switch (period) {
        case 'week': return 7;
        case 'month': return 30; // Có thể dùng date-fns để lấy số ngày chính xác của tháng nếu cần
        case 'year': return 365;
        case 'day': default: return 1;
    }
};

const getPeriodLabel = (period: string) => {
    switch (period) {
        case 'week': return 'Tuần này';
        case 'month': return 'Tháng này';
        case 'year': return 'Năm nay';
        case 'day': default: return 'Hôm nay';
    }
};

// ─── COMPONENT BIỂU ĐỒ ───────────────────────────────────
const HistoryChart = ({ data, period }: { data: any[], period: string }) => {
    const consumedColor = "#86D3A0"; // Màu xanh sáng
    const barGoalColor = "#E2E8F0";  // Goal mờ cho Bar chart
    const lineGoalColor = "#94A3B8"; // Goal cho Line chart

    // Custom Tooltip để đẹp hơn
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-800 text-white p-3 rounded-lg shadow-lg text-sm border border-gray-700">
                    <p className="font-bold mb-2 text-gray-300">{label}</p>
                    <p className="text-[#86D3A0] font-semibold">Đã nạp: {payload[0]?.value} kcal</p>
                    <p className="text-gray-400">Mục tiêu: {payload[1]?.value} kcal</p>
                </div>
            );
        }
        return null;
    };

    if (period === 'day') {
        return (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="consumed" name="Đã nạp" fill={consumedColor} radius={[4, 4, 0, 0]} barSize={32} />
                    <Bar dataKey="goal" name="Mục tiêu" fill={barGoalColor} radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
            </ResponsiveContainer>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                    type="monotone"
                    dataKey="consumed"
                    name="Đã nạp"
                    stroke={consumedColor}
                    strokeWidth={4}
                    dot={{ r: 4, fill: consumedColor, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                />
                <Line
                    type="step"
                    dataKey="goal"
                    name="Mục tiêu"
                    stroke={lineGoalColor}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default function HistoryPage() {
    const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("week");
    const [chart, setChart] = useState<ChartPoint[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [macros, setMacros] = useState<Macros | null>(null);
    const [logs, setLogs] = useState<MealLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [liveIndicator, setLiveIndicator] = useState(false);

    // ─── States cho Modal Edit ────────────────────────────
    const [editingItem, setEditingItem] = useState<MealItem | null>(null);
    const [editName, setEditName] = useState("");
    const [editCal, setEditCal] = useState("");
    const [editDate, setEditDate] = useState("");
    const [editTime, setEditTime] = useState("");
    const [editRating, setEditRating] = useState(0);
    const [editNotes, setEditNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const prevChartRef = useRef<string>("");

    const fetchAll = useCallback(async (showLoading = false) => {
        if (showLoading) setLoading(true);
        setError(null);
        try {
            const [chartData, summaryData, macrosData, logsData] = await Promise.all([
                apiFetch<ChartPoint[]>(`/api/history/chart/${USER_ID}?period=${period}`),
                apiFetch<Summary>(`/api/history/summary/${USER_ID}`),
                apiFetch<Macros>(`/api/history/macros/${USER_ID}`),
                apiFetch<MealLog[]>(`/api/history/logs/${USER_ID}`),
            ]);

            const newChartStr = JSON.stringify(chartData);
            if (prevChartRef.current && prevChartRef.current !== newChartStr) {
                setLiveIndicator(true);
                setTimeout(() => setLiveIndicator(false), 2000);
            }
            prevChartRef.current = newChartStr;

            // Debug log
            console.log("Logs data:", logsData);
            logsData.forEach(log => {
                console.log(`${log.type}:`, log.items.map(item => ({ name: item.name, cal: item.cal })));
            });

            setChart(chartData);
            setSummary(summaryData);
            setMacros(macrosData);
            setLogs(logsData);
            setLastUpdated(new Date());
        } catch (e) {
            setError(e instanceof Error ? e.message : "Không thể kết nối server");
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        fetchAll(true);
        const interval = setInterval(() => fetchAll(false), POLL_MS);
        return () => clearInterval(interval);
    }, [fetchAll]);

    // ─── Hàm Edit Modal ──────────────────────────────────
    const openEditModal = (item: MealItem) => {
        setEditingItem(item);
        setEditName(item.name);
        setEditCal(item.cal.toString());
        
        // Parse thời gian - chuẩn xử lý ISO string
        if (item.scanned_at) {
            const dt = new Date(item.scanned_at);
            // Lấy ngày từ UTC
            const dateStr = dt.toISOString().split('T')[0]; // YYYY-MM-DD (UTC)
            // Lấy giờ từ UTC
            const timeStr = dt.toISOString().split('T')[1]?.slice(0, 5) || '00:00'; // HH:MM (UTC)
            setEditDate(dateStr);
            setEditTime(timeStr);
        } else {
            // Nếu không có thời gian, dùng hiện tại (UTC)
            const now = new Date();
            setEditDate(now.toISOString().split('T')[0]);
            setEditTime(now.toISOString().split('T')[1]?.slice(0, 5) || '00:00');
        }
        
        setEditRating(item.rating || 0);
        setEditNotes(item.notes || "");
    };

    const closeEditModal = () => {
        setEditingItem(null);
        setEditName("");
        setEditCal("");
        setEditDate("");
        setEditTime("");
        setEditRating(0);
        setEditNotes("");
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;
        
        setIsSaving(true);
        try {
            // Combine date và time thành datetime ISO string
            const dateTimeStr = editDate && editTime 
                ? new Date(`${editDate}T${editTime}:00`).toISOString()
                : undefined;
            
            const requestBody: any = {};
            
            // LUÔN gửi name và calories để không mất dữ liệu
            if (editName && editName.trim()) {
                requestBody.food_name = editName.trim();
            }
            if (editCal && !isNaN(parseFloat(editCal))) {
                requestBody.calories = parseFloat(editCal);
            }
            if (dateTimeStr) {
                requestBody.scanned_at = dateTimeStr;
            }
            
            // Gửi rating nếu thay đổi
            if (editRating !== (editingItem.rating || 0)) {
                requestBody.rating = editRating > 0 ? editRating : null;
            }
            
            // Gửi notes nếu thay đổi
            if (editNotes.trim() !== (editingItem.notes || "").trim()) {
                requestBody.notes = editNotes.trim() || null;
            }
            
            const res = await fetch(`${API_BASE}/api/history/logs/${editingItem.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!res.ok) throw new Error(`API error ${res.status}`);
            
            // Cập nhật thành công -> Đóng popup & Fetch lại dữ liệu
            closeEditModal();
            fetchAll(false);
        } catch (e) {
            console.error("Lỗi cập nhật:", e);
            alert("Không thể cập nhật. Vui lòng thử lại.");
        } finally {
            setIsSaving(false);
        }
    };

    // ─── LOGIC TÍNH TOÁN DYNAMIC GOAL (MỚI CẬP NHẬT) ──────────
    const dailyGoal = summary?.daily_goal ?? 2000;

    // Tính tổng lượng calo đã nạp trong toàn bộ khoảng thời gian đang chọn
    const totalConsumedInPeriod = chart.reduce((sum, item) => sum + item.consumed, 0);

    // Tính tổng mục tiêu calo trong toàn bộ khoảng thời gian đang chọn
    const totalPeriodGoal = dailyGoal * getDaysInPeriod(period);

    // VẪN GIỮ `dailyGoal` cho biểu đồ (nếu không đường mục tiêu sẽ vọt lên rất cao làm hỏng scale biểu đồ)
    const chartDataWithGoal = chart.map(d => ({
        ...d,
        goal: dailyGoal
    }));

    const macroList = macros ? [
        { name: "Chất đạm", color: "bg-blue-600", track: "bg-blue-100", ...macros.protein },
        { name: "Tinh bột", color: "bg-amber-600", track: "bg-amber-100", ...macros.carbs },
        { name: "Chất béo", color: "bg-[#5ca97c]", track: "bg-green-100", ...macros.fat },
    ] : [];

    return (
        <div className="bg-[#f8faf9] text-gray-800 font-sans antialiased flex min-h-screen overflow-x-hidden">
            <Sidebar />
            <main className="flex-1 md:ml-64 p-8 md:p-10 lg:px-16 max-w-[1600px] mx-auto">

                {/* HEADER */}
                <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-gray-900 text-3xl md:text-4xl font-extrabold tracking-tight">
                                Lịch sử dinh dưỡng
                            </h2>
                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
                                ${error ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                                <span className={`w-2 h-2 rounded-full ${error ? "bg-red-500" : "bg-green-500"}
                                    ${liveIndicator ? "animate-ping" : "animate-pulse"}`} />
                                {error ? "Ngoại tuyến" : "Trực tiếp"}
                            </span>
                        </div>
                        <p className="text-gray-500 font-medium">
                            {lastUpdated
                                ? `Cập nhật lúc ${lastUpdated.toLocaleTimeString("vi-VN")} · tự động mỗi 30s`
                                : "Đang tải..."}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => fetchAll(false)}
                            className="p-2 rounded-full text-gray-400 hover:text-[#1c6b42] hover:bg-green-50 transition-colors"
                            title="Làm mới ngay"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                        <div className="bg-gray-200/60 p-1 rounded-full flex gap-1 self-start md:self-auto">
                            {([
                                { val: "day", label: "Ngày" },
                                { val: "week", label: "Tuần" },
                                { val: "month", label: "Tháng" },
                                { val: "year", label: "Năm" },
                            ] as { val: "day" | "week" | "month" | "year"; label: string }[]).map(({ val, label }) => (
                                <button
                                    key={val}
                                    onClick={() => setPeriod(val)}
                                    className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${period === val
                                        ? "bg-white text-[#1c6b42] shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
                        <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium text-sm">{error}</span>
                        <button onClick={() => fetchAll(false)} className="ml-auto text-sm font-bold underline">
                            Thử lại
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">

                    {/* CHART CARD */}
                    <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg mb-1">Lượng Calo nạp vào so với mục tiêu</h3>
                                {loading
                                    ? <Skeleton className="h-4 w-40 mt-1" />
                                    : <p className="text-gray-500 text-sm font-medium">
                                        {/* HIỂN THỊ LABEL VÀ DATA DYNAMIC TẠI ĐÂY */}
                                        {getPeriodLabel(period)}: <span className="text-[#1c6b42] font-bold">{totalConsumedInPeriod.toLocaleString()}</span> / {totalPeriodGoal.toLocaleString()} kcal
                                    </p>
                                }
                            </div>
                            <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                                <span className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#86D3A0]" />Đã nạp
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                                    Mục tiêu ({dailyGoal.toLocaleString()}/day)
                                </span>
                            </div>
                        </div>

                        <div className="relative flex-1 min-h-[300px]">
                            {loading ? (
                                <Skeleton className="w-full h-full" />
                            ) : (
                                <HistoryChart data={chartDataWithGoal} period={period} />
                            )}
                        </div>
                    </div>

                    {/* RIGHT CARDS */}
                    <div className="flex flex-col gap-6">
                        {/* Weekly Average */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">
                                {period === "week" ? "Trung bình tuần" : period === "month" ? "Trung bình tháng" : period === "year" ? "Trung bình năm" : "Trung bình ngày"}
                            </h3>
                            {loading || !summary
                                ? <Skeleton className="h-10 w-32 mb-4" />
                                : <>
                                    <div className="flex items-end gap-2 mb-4">
                                        <span className="text-4xl font-black text-[#1c6b42]">
                                            {summary.weekly_avg.toLocaleString()}
                                        </span>
                                        <span className="text-gray-500 font-medium pb-1">kcal / ngày</span>
                                    </div>
                                    <div className={`text-sm font-bold flex items-center gap-1.5 ${summary.direction === "lower" ? "text-[#1c6b42]" :
                                        summary.direction === "higher" ? "text-red-500" : "text-gray-400"
                                        }`}>
                                        {summary.direction === "lower" ? "↘" : summary.direction === "higher" ? "↗" : "→"}
                                        {" "}{summary.change_pct}% {summary.direction} so với lần trước
                                    </div>
                                </>
                            }
                        </div>

                        {/* Macro Balance */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex-1">
                            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6">Cân bằng năng lượng</h3>
                            {loading || !macros
                                ? <div className="flex flex-col gap-5">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-8" />)}
                                </div>
                                : <div className="flex flex-col gap-5">
                                    {macroList.map((m) => (
                                        <div key={m.name}>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="font-bold text-gray-800">{m.name}</span>
                                                <span className="text-gray-500 font-medium">{m.current}g / {m.target}g</span>
                                            </div>
                                            <div className={`h-2.5 w-full ${m.track} rounded-full overflow-hidden`}>
                                                <div
                                                    className={`h-full ${m.color} rounded-full transition-all duration-700`}
                                                    style={{ width: `${Math.min((m.current / m.target) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            }
                        </div>
                    </div>
                </div>

                {/* LOGS SECTION */}
                <div>
                    <div className="flex justify-between items-end mb-6">
                        <h2 className="text-gray-900 text-2xl font-extrabold">
                            Lịch sử bữa ăn
                            {logs.length > 0 && (
                                <span className="ml-3 text-base text-gray-400 font-medium">
                                    {logs.reduce((s, l) => s + l.total, 0).toLocaleString()} kcal tổng
                                </span>
                            )}
                        </h2>
                        <span className="text-gray-500 font-medium">
                            {new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </span>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-3xl" />)}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <div className="text-5xl mb-4">🍽️</div>
                            <p className="font-medium">Chưa có bữa ăn nào được ghi nhận hôm nay</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {logs.map((log, idx) => (
                                <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                                    {/* Meal type header */}
                                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                                        <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-lg">
                                            {log.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-900 text-base">{log.type}</h3>
                                            <p className="text-xs text-gray-500 font-medium">{log.time}</p>
                                        </div>
                                        <span className="font-extrabold text-xl text-[#1c6b42]">{log.total} kcal</span>
                                    </div>

                                    {/* Meal items */}
                                    <div className="space-y-3">
                                        {log.items && log.items.length > 0 ? (
                                            log.items.map((item, i) => (
                                                <div 
                                                    key={i}
                                                    className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-shadow group"
                                                >
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        {/* Icon hoặc Ảnh */}
                                                        <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                            {item.image_url ? (
                                                                <img 
                                                                    src={item.image_url} 
                                                                    alt={item.name} 
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        const img = e.target as HTMLImageElement;
                                                                        img.style.display = 'none';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <span className="text-xl">{log.icon}</span>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Thông tin món ăn */}
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="text-gray-900 font-bold text-base truncate">{item.name || "Unknown"}</h4>
                                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                                <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded text-xs font-bold">
                                                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>P: {Math.round((item.cal || 0) * 0.25 / 4)}g
                                                                </span>
                                                                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                                                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>C: {Math.round((item.cal || 0) * 0.50 / 4)}g
                                                                </span>
                                                                <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded text-xs font-bold">
                                                                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>F: {Math.round((item.cal || 0) * 0.25 / 9)}g
                                                                </span>
                                                            </div>

                                                            {/* Rating & Notes */}
                                                            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2 w-full">
                                                                {/* Rating */}
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-xs text-gray-500 font-medium min-w-fit">Đánh giá:</span>
                                                                    <div className="flex items-center gap-0.5">
                                                                        {[...Array(5)].map((_, i) => (
                                                                            <span 
                                                                                key={i}
                                                                                className={`text-sm ${(item.rating && i < item.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                                                                            >
                                                                                ★
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                    {!item.rating && <span className="text-xs text-gray-400 italic">Chưa có</span>}
                                                                </div>
                                                                
                                                                {/* Notes */}
                                                                <div className="flex items-start gap-2">
                                                                    <span className="text-xs text-gray-500 font-medium">Ghi chú:</span>
                                                                    <div className="text-xs text-gray-600 italic truncate flex-1" title={item.notes || "Chưa có ghi chú"}>
                                                                        {item.notes ? `💬 ${item.notes}` : <span className="text-gray-400">Chưa có</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Calo và Nút Edit */}
                                                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                                        <div className="text-right">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-2xl font-extrabold text-[#1c6b42]">{item.cal || 0}</span>
                                                                <span className="text-xs text-gray-500">kcal</span>
                                                            </div>
                                                            <span className="text-xs text-gray-400 mt-1 block">{log.time}</span>
                                                        </div>
                                                        
                                                        {/* Nút Edit */}
                                                        <button 
                                                            onClick={() => openEditModal(item)}
                                                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 md:opacity-100"
                                                            title="Chỉnh sửa"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-4 text-gray-400">Không có món ăn</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </main>

            {/* MODAL CHỈNH SỬA MÓN ĂN */}
            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Chỉnh sửa món ăn</h3>
                        
                        <div className="space-y-4">
                            {/* Tên món */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tên món ăn</label>
                                <input 
                                    type="text" 
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#1c6b42] focus:border-transparent outline-none transition"
                                    disabled={isSaving}
                                />
                            </div>

                            {/* Calo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Calo (kcal)</label>
                                <input 
                                    type="number" 
                                    value={editCal}
                                    onChange={(e) => setEditCal(e.target.value)}
                                    step="0.1"
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#1c6b42] focus:border-transparent outline-none transition"
                                    disabled={isSaving}
                                />
                            </div>

                            {/* Ngày */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Ngày</label>
                                <input 
                                    type="date" 
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#1c6b42] focus:border-transparent outline-none transition"
                                    disabled={isSaving}
                                />
                            </div>

                            {/* Giờ */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Giờ</label>
                                <input 
                                    type="time" 
                                    value={editTime}
                                    onChange={(e) => setEditTime(e.target.value)}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#1c6b42] focus:border-transparent outline-none transition"
                                    disabled={isSaving}
                                />
                            </div>

                            {/* Đánh giá sao */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Đánh giá</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setEditRating(star)}
                                            disabled={isSaving}
                                            className={`text-2xl transition ${
                                                editRating >= star 
                                                    ? 'text-yellow-400' 
                                                    : 'text-gray-300 hover:text-yellow-200'
                                            }`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Ghi chú */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú</label>
                                <textarea 
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    placeholder="Thêm ghi chú về bữa ăn này..."
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-[#1c6b42] focus:border-transparent outline-none transition resize-none"
                                    disabled={isSaving}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button 
                                onClick={closeEditModal}
                                className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50"
                                disabled={isSaving}
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={handleSaveEdit}
                                className="flex-1 py-2 rounded-xl bg-[#1c6b42] text-white font-medium hover:bg-[#155232] transition disabled:opacity-50"
                                disabled={isSaving}
                            >
                                {isSaving ? "Đang lưu..." : "Lưu"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}