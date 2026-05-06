'use client';
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import GoalProjectionChart from "@/components/GoalProjectionChart";

export default function BmiPage() {
    const [weight, setWeight]           = useState<string>('');
    const [height, setHeight]           = useState<string>('');
    const [bmi, setBmi]                 = useState<number | null>(null);
    const [goal, setGoal]               = useState<string>('maintain_weight');
    const [targetWeight, setTargetWeight] = useState<string>('');
    const [goalDuration, setGoalDuration] = useState<string>('6');
    const [calorieGoal, setCalorieGoal] = useState<number | null>(null);
    const [isLoading, setIsLoading]     = useState<boolean>(false);
    const [isFetching, setIsFetching]   = useState<boolean>(true); // loading khi vào trang
    const [endDate, setEndDate]         = useState<string | null>(null);
    const [startDate, setStartDate]     = useState<string | null>(null); // ngày bắt đầu lộ trình
    const [fetchError, setFetchError]   = useState<string | null>(null);

    // ─── 1. Tự tính BMI ngay khi nhập ───────────────────────
    useEffect(() => {
        if (weight && height) {
            const h = parseFloat(height) / 100;
            const w = parseFloat(weight);
            if (h > 0 && w > 0) setBmi(Number((w / (h * h)).toFixed(1)));
        } else {
            setBmi(null);
        }
    }, [weight, height]);

    // ─── 2. Fetch profile từ DB khi vào trang ─────────────────
    useEffect(() => {
        const fetchUserProfile = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) { setIsFetching(false); return; }

            try {
                setIsFetching(true);
                const res = await fetch('http://127.0.0.1:8000/api/v1/profile/bmi', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (res.status === 404) {
                    // Chưa có profile — bình thường, không phải lỗi
                    return;
                }

                if (!res.ok) {
                    setFetchError('Không thể tải dữ liệu profile. Kiểm tra server.');
                    return;
                }

                const data = await res.json();

                // Đổ dữ liệu vào state
                if (data.weight_kg)   setWeight(data.weight_kg.toString());
                if (data.height_cm)   setHeight(data.height_cm.toString());
                if (data.goal_type)   setGoal(data.goal_type);
                if (data.target_weight) setTargetWeight(data.target_weight.toString());
                if (data.goal_duration_months) setGoalDuration(data.goal_duration_months.toString());
                if (data.daily_calorie_goal)   setCalorieGoal(data.daily_calorie_goal);

                // Xử lý ngày kết thúc
                if (data.end_date) {
                    const d = new Date(data.end_date);
                    setEndDate(d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }));

                    // Tính ngày bắt đầu = end_date - goal_duration_months
                    if (data.goal_duration_months) {
                        const start = new Date(d);
                        start.setMonth(start.getMonth() - data.goal_duration_months);
                        setStartDate(start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }));
                    }
                }
            } catch (err) {
                setFetchError('Không kết nối được server (http://127.0.0.1:8000). Hãy khởi động FastAPI.');
            } finally {
                setIsFetching(false);
            }
        };

        fetchUserProfile();
    }, []); // chỉ chạy 1 lần khi mount

    // ─── 3. Lưu profile lên DB ────────────────────────────────
    const handleSave = async () => {
        if (!weight || !height) {
            alert("Vui lòng nhập đầy đủ cân nặng và chiều cao.");
            return;
        }
        if (goal !== 'maintain_weight' && (!targetWeight || !goalDuration)) {
            alert("Vui lòng nhập cân nặng mục tiêu và thời lượng.");
            return;
        }

        const token = localStorage.getItem('access_token');
        if (!token) { alert("Bạn cần đăng nhập."); return; }

        setIsLoading(true);
        try {
            const payload: Record<string, unknown> = {
                weight_kg: parseFloat(weight),
                height_cm: parseFloat(height),
                goal_type: goal,
            };
            if (goal !== 'maintain_weight') {
                payload.target_weight = parseFloat(targetWeight);
                payload.goal_duration_months = parseInt(goalDuration);
            }

            const res = await fetch('http://127.0.0.1:8000/api/v1/profile/bmi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const data = await res.json();
                setCalorieGoal(data.daily_calorie_goal);
                if (data.end_date) {
                    const d = new Date(data.end_date);
                    setEndDate(d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }));
                    // Ngày bắt đầu = hôm nay
                    setStartDate(new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }));
                }
                setFetchError(null);
                alert("Lưu hồ sơ thành công!");
            } else {
                const err = await res.json();
                alert(`Lỗi: ${err.detail || 'Không thể lưu thông tin.'}`);
            }
        } catch {
            alert("Lỗi kết nối đến server. Vui lòng kiểm tra FastAPI đang chạy.");
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Helpers ─────────────────────────────────────────────
    const getBmiStatus = (v: number) => {
        if (v < 18.5) return { text: "Thiếu cân",   color: "text-blue-500",   bg: "bg-blue-50",   ring: "#3b82f6" };
        if (v < 25)   return { text: "Bình thường",  color: "text-green-600",  bg: "bg-green-50",  ring: "#5ca97c" };
        if (v < 30)   return { text: "Thừa cân",     color: "text-yellow-500", bg: "bg-yellow-50", ring: "#eab308" };
        return            { text: "Béo phì",          color: "text-red-500",    bg: "bg-red-50",    ring: "#ef4444" };
    };

    const calcDashOffset = (v: number) => {
        const C = 2 * Math.PI * 45;
        const pct = Math.max(0, Math.min(1, (v - 15) / 25));
        return C - pct * C;
    };

    const diff       = weight && targetWeight ? Math.abs(parseFloat(weight) - parseFloat(targetWeight)) : 0;
    const isGaining  = goal === 'gain_weight';
    const bmiStatus  = bmi ? getBmiStatus(bmi) : null;

    // Chart có thể vẽ khi: có weight + targetWeight + không phải maintain
    const canShowChart = goal !== 'maintain_weight' && !!weight && !!targetWeight;

    return (
        <div className="bg-[#f8faf9] text-gray-800 font-sans antialiased flex min-h-screen overflow-x-hidden">
            <Sidebar />
            <main className="flex-1 md:ml-64 p-8 md:p-12 lg:px-20 max-w-7xl mx-auto">

                {/* Server error banner */}
                {fetchError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-sm font-medium">
                        ⚠️ {fetchError}
                    </div>
                )}

                <header className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-gray-900">
                        Thiết Lập <br />
                        <span className="text-[#5ca97c] font-light">Mức Năng Lượng Nền Tảng</span>
                    </h1>
                    <p className="text-gray-500 text-lg max-w-lg">
                        Thiết lập thông số thể chất để xây dựng bản đồ dinh dưỡng cá nhân hóa
                    </p>
                </header>

                {/* Skeleton khi đang fetch */}
                {isFetching ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
                        <div className="lg:col-span-7 bg-white rounded-3xl h-[500px] border border-gray-100"/>
                        <div className="lg:col-span-5 flex flex-col gap-6">
                            <div className="bg-white rounded-3xl h-[320px] border border-gray-100"/>
                            <div className="bg-gray-200 rounded-3xl h-[200px]"/>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* ── CỘT TRÁI: FORM ── */}
                        <div className="lg:col-span-7 flex flex-col gap-8">
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">

                                {/* Height & Weight */}
                                <div className="grid grid-cols-2 gap-6 mb-8">
                                    {[
                                        { label: "Chiều cao (cm)", value: height, setter: setHeight, unit: "cm", placeholder: "170" },
                                        { label: "Cân nặng (kg)",  value: weight, setter: setWeight, unit: "kg", placeholder: "65"  },
                                    ].map(f => (
                                        <div key={f.label}>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{f.label}</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={f.value}
                                                    placeholder={f.placeholder}
                                                    onChange={e => f.setter(e.target.value)}
                                                    className="w-full bg-[#f2f4f3] text-xl font-medium px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5ca97c] transition-all"
                                                />
                                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-medium">{f.unit}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Goal */}
                                <div className="mb-8">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Mục Tiêu</label>
                                    <div className="grid grid-cols-3 gap-4">
                                        {[
                                            { id: 'lose_weight',     label: 'Giảm cân',       icon: '📉' },
                                            { id: 'maintain_weight', label: 'Duy trì cân nặng', icon: '⚖️' },
                                            { id: 'gain_weight',     label: 'Tăng cân',        icon: '📈' },
                                        ].map(g => (
                                            <button
                                                key={g.id}
                                                onClick={() => setGoal(g.id)}
                                                className={`flex flex-col items-center justify-center p-4 h-28 rounded-2xl transition-all border-2 ${
                                                    goal === g.id
                                                        ? 'bg-[#a3d6ba] border-[#a3d6ba] text-[#1c6b42]'
                                                        : 'bg-[#f2f4f3] border-transparent hover:border-gray-200 text-gray-600'
                                                }`}
                                            >
                                                <span className="text-2xl mb-2">{g.icon}</span>
                                                <span className="text-sm font-semibold text-center">{g.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Target Weight & Duration */}
                                {goal !== 'maintain_weight' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-6 mb-8">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                                    Cân nặng mục tiêu (kg)
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={targetWeight}
                                                        onChange={e => setTargetWeight(e.target.value)}
                                                        placeholder={isGaining ? 'Ví dụ: 75' : 'Ví dụ: 60'}
                                                        className="w-full bg-[#f2f4f3] text-xl font-medium px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5ca97c] transition-all"
                                                    />
                                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-medium">kg</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2">Hiện tại: {weight ? parseFloat(weight).toFixed(1) : '--'} kg</p>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Thời lượng</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {[3, 6, 9, 12].map(m => (
                                                        <button
                                                            key={m}
                                                            onClick={() => setGoalDuration(m.toString())}
                                                            className={`py-3 rounded-xl font-bold text-sm transition-all border-2 ${
                                                                goalDuration === m.toString()
                                                                    ? 'bg-[#5ca97c] border-[#5ca97c] text-white'
                                                                    : 'bg-[#f2f4f3] border-transparent hover:border-gray-200 text-gray-600'
                                                            }`}
                                                        >
                                                            {m}M
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {weight && targetWeight && goalDuration && (
                                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-8">
                                                <p className="text-sm text-blue-900 font-medium">
                                                    📊 Bạn cần {isGaining ? 'tăng' : 'giảm'}{' '}
                                                    <span className="font-bold">{diff.toFixed(1)}kg</span>
                                                    {' '}trong {goalDuration} tháng
                                                </p>
                                                <p className="text-xs text-blue-700 mt-2">
                                                    Trung bình: {(diff / parseInt(goalDuration)).toFixed(2)} kg/tháng
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}

                                <button
                                    onClick={handleSave}
                                    disabled={isLoading}
                                    className="w-full bg-[#1c6b42] text-white py-4 rounded-2xl hover:bg-[#155433] font-bold text-lg transition-all shadow-md disabled:opacity-70"
                                >
                                    {isLoading ? 'Đang tính...' : 'Lưu thông tin & tính calories'}
                                </button>
                            </div>
                        </div>

                        {/* ── CỘT PHẢI: KẾT QUẢ ── */}
                        <div className="lg:col-span-5 flex flex-col gap-6">

                            {/* BMI Card */}
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center justify-center h-[320px]">
                                <h3 className="text-gray-500 font-medium mb-6">Chỉ Số BMI Của Bạn</h3>
                                {bmi && bmiStatus ? (
                                    <div className="relative flex flex-col items-center justify-center w-48 h-48">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                            <circle cx="50" cy="50" r="45" fill="none" stroke="#f2f4f3" strokeWidth="8"/>
                                            <circle
                                                cx="50" cy="50" r="45" fill="none"
                                                stroke={bmiStatus.ring}
                                                strokeWidth="8"
                                                strokeLinecap="round"
                                                strokeDasharray={2 * Math.PI * 45}
                                                strokeDashoffset={calcDashOffset(bmi)}
                                                className="transition-all duration-1000 ease-out"
                                            />
                                        </svg>
                                        <div className="absolute flex flex-col items-center">
                                            <span className="text-5xl font-black text-gray-800">{bmi}</span>
                                            <span className={`text-xs font-bold px-3 py-1 mt-2 rounded-full ${bmiStatus.bg} ${bmiStatus.color}`}>
                                                {bmiStatus.text}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-48 h-48 rounded-full border-8 border-[#f2f4f3] flex items-center justify-center">
                                        <span className="text-gray-300 font-medium text-sm text-center px-4">Đang chờ dữ liệu...</span>
                                    </div>
                                )}
                                <p className="text-center text-sm text-gray-500 mt-6 max-w-[200px]">
                                    {bmi
                                        ? "Chỉ số BMI dựa trên thông tin vừa nhập."
                                        : "Nhập chiều cao và cân nặng để xem BMI."}
                                </p>
                            </div>

                            {/* Calorie Card */}
                            <div className="bg-[#1c6b42] rounded-3xl p-8 shadow-md text-white min-h-[200px] flex flex-col justify-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-bl-full"/>
                                <h3 className="text-green-200 text-xs font-bold tracking-widest uppercase mb-2">Khẩu phần dinh dưỡng đề xuất</h3>
                                <div className="flex items-end gap-2 mb-4">
                                    <span className="text-5xl font-bold">
                                        {calorieGoal ? calorieGoal.toLocaleString() : '----'}
                                    </span>
                                    <span className="text-green-100 font-medium mb-1">kcal/day</span>
                                </div>
                                <p className="text-green-100 text-sm opacity-90 leading-relaxed mb-4">
                                    {calorieGoal
                                        ? `Tối ưu cho mục tiêu ${isGaining ? 'tăng cân' : goal === 'lose_weight' ? 'giảm cân' : 'duy trì'} dựa trên chỉ số trao đổi chất.`
                                        : 'Lưu hồ sơ để thiết lập mục tiêu năng lượng hằng ngày.'}
                                </p>
                                {endDate && (
                                    <div className="bg-white/15 rounded-xl px-3 py-2 text-xs border border-white/20">
                                        <p className="text-green-100">Ngày hoàn thành mục tiêu:</p>
                                        <p className="text-white font-bold text-sm">{endDate}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── BIỂU ĐỒ LỘ TRÌNH ── */}
                <div className="mt-12">
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-6">Lộ Trình Đạt Mục Tiêu Cân Nặng</h2>

                    {goal === 'maintain_weight' ? (
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
                            <p className="text-gray-600 font-medium">
                                Bạn đã chọn duy trì cân nặng. Chọn "Giảm cân" hoặc "Tăng cân" để xem lộ trình.
                            </p>
                        </div>
                    ) : !canShowChart ? (
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex items-center justify-center h-[300px]">
                            {isFetching ? (
                                <p className="text-gray-500 font-medium">Đang tải dữ liệu lộ trình...</p>
                            ) : (
                                <p className="text-gray-500 font-medium">
                                    Nhập cân nặng hiện tại và cân nặng mục tiêu, sau đó nhấn "Lưu" để xem lộ trình.
                                </p>
                            )}
                        </div>
                    ) : (
                        // Chỉ render chart khi có đủ dữ liệu thật — không dùng fallback
                        <GoalProjectionChart
                            targetWeight={parseFloat(targetWeight)}
                            currentWeight={parseFloat(weight)}
                            goalDurationMonths={parseInt(goalDuration)}
                            targetDate={endDate || null}
                            startDate={startDate || null}
                            goalType={goal as 'lose_weight' | 'gain_weight'}
                        />
                    )}
                </div>

            </main>
        </div>
    );
}