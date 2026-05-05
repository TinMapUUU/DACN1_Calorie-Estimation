'use client';
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";

export default function BmiPage() {
    const [weight, setWeight] = useState<string>('');
    const [height, setHeight] = useState<string>('');
    const [bmi, setBmi] = useState<number | null>(null);
    const [goal, setGoal] = useState<string>('maintain_weight'); 
    const [calorieGoal, setCalorieGoal] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Tự động tính BMI ngay khi user nhập xong chiều cao và cân nặng
    useEffect(() => {
        if (weight && height) {
            const h = parseFloat(height) / 100;
            const w = parseFloat(weight);
            if (h > 0 && w > 0) {
                setBmi(Number((w / (h * h)).toFixed(1)));
            }
        } else {
            setBmi(null);
        }
    }, [weight, height]);

    const handleSave = async () => {
        if (!weight || !height) {
            alert("Vui lòng nhập đầy đủ cân nặng và chiều cao trước khi lưu.");
            return;
        }

        const token = localStorage.getItem('access_token');
        if (!token) {
            alert("Bạn cần đăng nhập để lưu thông tin này.");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/profile/bmi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    weight_kg: parseFloat(weight),
                    height_cm: parseFloat(height),
                    goal_type: goal
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Cập nhật calo ra màn hình xanh lá
                setCalorieGoal(data.daily_calorie_goal);
                alert("Lưu hồ sơ thành công!");
            } else {
                const errorData = await response.json();
                alert(`Lỗi: ${errorData.detail || 'Không thể lưu thông tin.'}`);
            }
        } catch (error) {
            console.error("Lỗi khi lưu profile:", error);
            alert("Lỗi kết nối đến server. Vui lòng kiểm tra server FastAPI.");
        } finally {
            setIsLoading(false);
        }
    };

    // Hàm phụ trợ để đánh giá BMI
    const getBmiStatus = (bmiValue: number) => {
        if (bmiValue < 18.5) return { text: "Underweight", color: "text-blue-500" };
        if (bmiValue < 25) return { text: "Optimal", color: "text-green-500" };
        if (bmiValue < 30) return { text: "Overweight", color: "text-yellow-500" };
        return { text: "Obese", color: "text-red-500" };
    };

    // Vẽ vòng tròn biểu đồ BMI
    const calculateDashOffset = (bmiValue: number) => {
        const circumference = 2 * Math.PI * 45; // r = 45
        // Giới hạn dải BMI từ 15 đến 40 để vẽ biểu đồ
        const percent = Math.max(0, Math.min(1, (bmiValue - 15) / 25));
        return circumference - percent * circumference;
    };

    return (
        <div className="bg-[#f8faf9] text-gray-800 font-sans antialiased flex min-h-screen overflow-x-hidden">
            <Sidebar />
            <main className="flex-1 md:ml-64 p-8 md:p-12 lg:px-20 max-w-7xl mx-auto">
                <header className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-gray-900">
                        Establish Your <br />
                        <span className="text-[#5ca97c] font-light">Vitality Baseline</span>
                    </h1>
                    <p className="text-gray-500 text-lg max-w-lg">
                        Calibrate your physical metrics to generate a personalized nutritional map for your digital greenhouse.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* CỘT TRÁI: FORM NHẬP LIỆU */}
                    <div className="lg:col-span-7 flex flex-col gap-8">
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                            {/* Height & Weight */}
                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Height (cm)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={height} 
                                            onChange={e => setHeight(e.target.value)} 
                                            className="w-full bg-[#f2f4f3] text-xl font-medium px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5ca97c] transition-all" 
                                        />
                                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-medium">cm</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Weight (kg)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={weight} 
                                            onChange={e => setWeight(e.target.value)} 
                                            className="w-full bg-[#f2f4f3] text-xl font-medium px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5ca97c] transition-all" 
                                        />
                                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-medium">kg</span>
                                    </div>
                                </div>
                            </div>

                            {/* Goals */}
                            <div className="mb-8">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Primary Goal</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { id: 'lose_weight', label: 'Weight Loss', icon: '📉' },
                                        { id: 'maintain_weight', label: 'Maintenance', icon: '⚖️' },
                                        { id: 'gain_weight', label: 'Weight Gain', icon: '📈' }
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
                                            <span className="text-sm font-semibold">{g.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className="w-full bg-[#1c6b42] text-white py-4 rounded-2xl hover:bg-[#155433] font-bold text-lg transition-all shadow-md disabled:opacity-70"
                            >
                                {isLoading ? 'Saving...' : 'Save Profile & Calculate Fuel'}
                            </button>
                        </div>
                    </div>

                    {/* CỘT PHẢI: KẾT QUẢ BMI & CALORIE */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        
                        {/* BMI Card */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center justify-center h-[320px]">
                            <h3 className="text-gray-500 font-medium mb-6">Current BMI</h3>
                            
                            {bmi ? (
                                <div className="relative flex flex-col items-center justify-center w-48 h-48">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                        {/* Background Circle */}
                                        <circle cx="50" cy="50" r="45" fill="none" stroke="#f2f4f3" strokeWidth="8" />
                                        {/* Progress Circle */}
                                        <circle 
                                            cx="50" cy="50" r="45" fill="none" 
                                            stroke={getBmiStatus(bmi).color.replace('text-', '') === 'green-500' ? '#5ca97c' : '#eab308'} // Đổi màu cơ bản
                                            strokeWidth="8" 
                                            strokeLinecap="round"
                                            strokeDasharray={2 * Math.PI * 45}
                                            strokeDashoffset={calculateDashOffset(bmi)}
                                            className="transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute flex flex-col items-center">
                                        <span className="text-5xl font-black text-gray-800">{bmi}</span>
                                        <span className={`text-xs font-bold px-3 py-1 mt-2 rounded-full bg-green-50 text-green-700`}>
                                            {getBmiStatus(bmi).text}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-48 h-48 rounded-full border-8 border-[#f2f4f3] flex items-center justify-center">
                                    <span className="text-gray-300 font-medium text-sm">Awaiting inputs</span>
                                </div>
                            )}

                            <p className="text-center text-sm text-gray-500 mt-6 max-w-[200px]">
                                {bmi ? "Your body mass index is calculated based on current inputs." : "Enter your height and weight to see your BMI."}
                            </p>
                        </div>

                        {/* Recommended Fuel Card */}
                        <div className="bg-[#1c6b42] rounded-3xl p-8 shadow-md text-white h-full min-h-[200px] flex flex-col justify-center relative overflow-hidden">
                            {/* Khối màu trang trí */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-bl-full"></div>
                            
                            <h3 className="text-green-200 text-xs font-bold tracking-widest uppercase mb-2">Recommended Fuel</h3>
                            
                            <div className="flex items-end gap-2 mb-4">
                                <span className="text-5xl font-bold">
                                    {calorieGoal ? calorieGoal.toLocaleString() : "----"}
                                </span>
                                <span className="text-green-100 font-medium mb-1">kcal/day</span>
                            </div>
                            
                            <p className="text-green-100 text-sm opacity-90 leading-relaxed">
                                {calorieGoal 
                                    ? `Optimized for ${goal.replace('_', ' ')} based on your resting metabolic rate.`
                                    : "Save your profile to generate your daily calorie goal."}
                            </p>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}