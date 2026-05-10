import React from 'react';

interface MacroRingsProps {
    calories: number;
    maxCalories: number;
    protein: number;
    proteinTarget?: number;
    carbs: number;
    carbsTarget?: number;
    fat: number;
    fatTarget?: number;
}

export default function MacroRings({
    calories,
    maxCalories,
    protein,
    proteinTarget = 150,
    carbs,
    carbsTarget = 250,
    fat,
    fatTarget = 65,
}: MacroRingsProps) {
    // Tính phần trăm (tối đa 100%)
    const calPct = Math.min((calories / maxCalories) * 100, 100);
    const proPct = Math.min((protein / proteinTarget) * 100, 100);
    const carbPct = Math.min((carbs / carbsTarget) * 100, 100);
    const fatPct = Math.min((fat / fatTarget) * 100, 100);

    // Hàm phụ trợ để tính stroke-dasharray
    const getStrokeDasharray = (percentage: number, radius: number) => {
        const circumference = 2 * Math.PI * radius;
        const strokeLength = (percentage / 100) * circumference;
        return `${strokeLength} ${circumference}`;
    };

    return (
        <div className="flex items-center gap-8 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            {/* Biểu đồ đồng tâm */}
            <div className="relative w-48 h-48 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    {/* Vòng Calories (ngoài cùng) */}
                    <circle cx="50" cy="50" r="42" stroke="#e8f5ec" strokeWidth="5" fill="none" />
                    <circle
                        cx="50"
                        cy="50"
                        r="42"
                        stroke="#1c6b42"
                        strokeWidth="5"
                        fill="none"
                        strokeDasharray={getStrokeDasharray(calPct, 42)}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                    />

                    {/* Vòng Protein (Đỏ) */}
                    <circle cx="50" cy="50" r="32" stroke="#fee2e2" strokeWidth="5" fill="none" />
                    <circle
                        cx="50"
                        cy="50"
                        r="32"
                        stroke="#ef4444"
                        strokeWidth="5"
                        fill="none"
                        strokeDasharray={getStrokeDasharray(proPct, 32)}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                    />

                    {/* Vòng Carbs (Xanh) */}
                    <circle cx="50" cy="50" r="22" stroke="#dbeafe" strokeWidth="5" fill="none" />
                    <circle
                        cx="50"
                        cy="50"
                        r="22"
                        stroke="#3b82f6"
                        strokeWidth="5"
                        fill="none"
                        strokeDasharray={getStrokeDasharray(carbPct, 22)}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                    />

                    {/* Vòng Fat (Vàng) */}
                    <circle cx="50" cy="50" r="12" stroke="#fef9c3" strokeWidth="5" fill="none" />
                    <circle
                        cx="50"
                        cy="50"
                        r="12"
                        stroke="#eab308"
                        strokeWidth="5"
                        fill="none"
                        strokeDasharray={getStrokeDasharray(fatPct, 12)}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                    />
                </svg>

                {/* Text ở giữa */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold text-gray-900">{calories.toLocaleString()}</span>
                    <span className="text-xs text-gray-500 font-medium mt-1">/ {maxCalories.toLocaleString()} kcal</span>
                </div>
            </div>

            {/* Chú thích (Legend) */}
            <div className="flex flex-col gap-4">
                <div>
                    <h3 className="text-gray-800 font-bold text-lg mb-4">Cân bằng Macro</h3>
                </div>

                <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full bg-red-500 shrink-0"></span>
                    <div>
                        <p className="text-gray-700 font-semibold text-sm">Đạm (Protein)</p>
                        <p className="text-gray-500 text-xs">
                            {protein}g / {proteinTarget}g
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full bg-blue-500 shrink-0"></span>
                    <div>
                        <p className="text-gray-700 font-semibold text-sm">Tinh bột (Carbs)</p>
                        <p className="text-gray-500 text-xs">
                            {carbs}g / {carbsTarget}g
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full bg-yellow-500 shrink-0"></span>
                    <div>
                        <p className="text-gray-700 font-semibold text-sm">Chất béo (Fat)</p>
                        <p className="text-gray-500 text-xs">
                            {fat}g / {fatTarget}g
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                    <span className="w-4 h-4 rounded-full bg-[#1c6b42] shrink-0"></span>
                    <div>
                        <p className="text-gray-700 font-semibold text-sm">Tổng cộng</p>
                        <p className="text-gray-500 text-xs">
                            {((calPct + proPct + carbPct + fatPct) / 4).toFixed(0)}% hoàn thành
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
