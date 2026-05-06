import React from 'react';

interface MealLogItemProps {
    time: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    icon?: string;
}

export default function MealLogItem({
    time,
    name,
    calories,
    protein,
    carbs,
    fat,
    icon = '🍽️',
}: MealLogItemProps) {
    return (
        <div className="flex items-center justify-between p-5 mb-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-xl shrink-0">
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="text-gray-900 font-bold text-base">{name}</h4>
                    {/* Macro Tags */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>P: {protein}g
                        </span>
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>C: {carbs}g
                        </span>
                        <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>F: {fat}g
                        </span>
                    </div>
                </div>
            </div>

            <div className="text-right shrink-0 ml-4">
                <div className="flex flex-col items-end">
                    <span className="text-2xl font-extrabold text-[#1c6b42]">{calories}</span>
                    <span className="text-xs text-gray-500">kcal</span>
                </div>
                <span className="text-xs text-gray-400 mt-1 block">{time}</span>
            </div>
        </div>
    );
}
