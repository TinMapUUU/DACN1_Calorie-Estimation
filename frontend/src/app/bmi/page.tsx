'use client';
import { useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function BmiPage() {
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [bmi, setBmi] = useState<number | null>(null);
    const [goal, setGoal] = useState('maintain_weight'); // Mặc định là giữ dáng

    const calculateBMI = (e: React.FormEvent) => {
        e.preventDefault();
        if (weight && height) {
            const h = parseFloat(height) / 100;
            const w = parseFloat(weight);
            setBmi(Number((w / (h * h)).toFixed(1)));
        }
    };

    const handleCalculate = async () => {
        if (!weight || !height) {
            alert("Vui lòng nhập cân nặng và chiều cao trước.");
            return;
        }

        const h = parseFloat(height) / 100;
        const w = parseFloat(weight);
        const calculatedBmi = (w / (h * h)).toFixed(1);
        setBmi(Number(calculatedBmi));

        const token = localStorage.getItem('access_token');
        if (!token) {
            alert("Bạn cần đăng nhập để lưu thông tin.");
            return;
        }

        try {
            const response = await fetch('http://[IP_ADDRESS]/api/v1/profile/bmi', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    weight_kg: w,
                    height_cm: parseFloat(height),
                    goal_type: goal
                })
            });

            if (response.ok) {
                const data = await response.json();
                alert(`Đã lưu profile! BMI: ${data.current_bmi}, Calorie Goal: ${data.daily_calorie_goal} kcal`);
            } else {
                const errorData = await response.json();
                alert(`Lỗi: ${errorData.detail || 'Lưu thất bại'}`);
            }
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Lỗi kết nối server.");
        }
    };

    const handleSave = async () => {
        if (!weight || !height) {
            alert("Vui lòng tính toán hoặc nhập đầy đủ cân nặng và chiều cao trước khi lưu.");
            return;
        }

        const token = localStorage.getItem('access_token');
        if (!token) {
            alert("Bạn cần đăng nhập để lưu thông tin này.");
            // Có thể thêm router.push('/login') nếu muốn
            return;
        }

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
                alert(`Lưu hồ sơ thành công!\nLượng calo mục tiêu mỗi ngày: ${data.daily_calorie_goal} kcal\nBMI hiện tại: ${data.current_bmi}`);
            } else {
                const errorData = await response.json();
                alert(`Lỗi: ${errorData.detail || 'Không thể lưu thông tin.'}`);
            }
        } catch (error) {
            console.error("Lỗi khi lưu profile:", error);
            alert("Lỗi kết nối đến server. Vui lòng kiểm tra lại mạng hoặc server đang tắt.");
        }
    };

    return (
        <div className="bg-[#f8faf9] text-on-surface font-body antialiased flex min-h-screen overflow-x-hidden">
            <Sidebar />
            <main className="flex-1 md:ml-64 p-8 md:p-12">
                <header className="mb-10">
                    <h2 className="text-[#1c6b42] text-4xl font-['Plus_Jakarta_Sans'] font-extrabold tracking-tight mb-2">BMI & Goals</h2>
                    <p className="text-gray-500">Calculate your Body Mass Index and set targets.</p>
                </header>

                <div className="bg-white max-w-2xl rounded-3xl p-8 shadow-sm border border-gray-100">
                    <form onSubmit={calculateBMI} className="flex flex-col gap-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                                <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 65" className="text-[#3a4b9b] w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1c6b42]" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
                                <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="e.g. 170" className="text-[#3a4b9b] w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1c6b42]" required />
                            </div>
                        </div>
                        <button type="submit" className="bg-[#1c6b42] text-white font-bold py-3 rounded-xl hover:bg-[#155433]">Calculate</button>
                    </form>

                    {bmi && (
                        <div className="mt-8 p-6 bg-[#f2f4f3] rounded-2xl text-center">
                            <p className="text-gray-600 mb-2">Your BMI is</p>
                            <h3 className="text-5xl font-black text-[#1c6b42] mb-2">{bmi}</h3>
                            <p className="font-medium text-gray-800">
                                {bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal weight' : 'Overweight'}
                            </p>
                        </div>
                    )}
                </div>

                <div className="bg-white max-w-2xl rounded-3xl p-8 shadow-sm border border-gray-100 mt-6">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">Set Your Goal</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {['maintain_weight', 'lose_weight', 'gain_weight'].map(g => (
                            <button
                                key={g}
                                onClick={() => setGoal(g)}
                                className={`py-3 rounded-xl border font-medium capitalize transition-all ${goal === g
                                    ? 'bg-[#1c6b42] border-[#1c6b42] text-white'
                                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                    }`}
                            >
                                {g.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handleSave}
                        className="mt-6 w-full bg-[#1c6b42] text-white py-3 rounded-xl hover:bg-[#155433] font-bold transition-colors"
                    >
                        Save Profile
                    </button>
                </div>

            </main>
        </div>

    );
}