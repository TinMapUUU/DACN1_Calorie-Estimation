"use client";

import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';

interface GoalProjectionChartProps {
    data?: Array<{
        date: string;
        weight: number;
        status: 'past' | 'current' | 'future';
    }>;
    targetWeight?: number;
    currentWeight?: number;
    targetDate?: string;
}

export default function GoalProjectionChart({
    data = [
        { date: '01/05', weight: 75, status: 'past' },
        { date: '15/05', weight: 73.5, status: 'past' },
        { date: '01/06', weight: 72, status: 'current' },
        { date: '15/06', weight: 70.5, status: 'future' },
        { date: '30/06', weight: 68, status: 'future' },
    ],
    targetWeight = 68,
    currentWeight = 72,
    targetDate = '30/06/2026',
}: GoalProjectionChartProps) {
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            return (
                <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg border border-gray-700">
                    <p className="text-sm font-medium">{dataPoint.date}</p>
                    <p className="text-sm font-bold text-[#86D3A0]">{dataPoint.weight}kg</p>
                    <p className="text-xs text-gray-400 mt-1">
                        {dataPoint.status === 'past' && 'Quá khứ'}
                        {dataPoint.status === 'current' && 'Hiện tại'}
                        {dataPoint.status === 'future' && 'Dự báo'}
                    </p>
                </div>
            );
        }
        return null;
    };

    const progressPercentage = ((currentWeight - targetWeight) / (data[0]?.weight - targetWeight || 1)) * 100;

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm w-full overflow-hidden">
            <div className="p-8">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Weight Goal Projection</h3>
                    <p className="text-sm text-[#1c6b42] font-semibold flex items-center gap-2">
                        ✨ Cố lên! Bạn sẽ đạt mục tiêu {targetWeight}kg vào ngày {targetDate}.
                    </p>
                </div>

                {/* Progress indicator */}
                <div className="mb-6 bg-[#f2f4f3] rounded-full h-2 overflow-hidden">
                    <div
                        className="h-full bg-[#1c6b42] transition-all duration-700 ease-out"
                        style={{ width: `${Math.min(Math.max(progressPercentage, 0), 100)}%` }}
                    ></div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8 text-center">
                    <div className="bg-blue-50 p-3 rounded-xl">
                        <p className="text-xs text-gray-600 font-medium">Cân nặng hiện tại</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{currentWeight}kg</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-xl">
                        <p className="text-xs text-gray-600 font-medium">Cần giảm</p>
                        <p className="text-2xl font-bold text-yellow-600 mt-1">{(currentWeight - targetWeight).toFixed(1)}kg</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-xl">
                        <p className="text-xs text-gray-600 font-medium">Mục tiêu</p>
                        <p className="text-2xl font-bold text-[#1c6b42] mt-1">{targetWeight}kg</p>
                    </div>
                </div>
            </div>

            <div className="w-full h-[320px] px-8 pb-8">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#9ca3af' }}
                            dy={10}
                        />
                        <YAxis
                            domain={['dataMin - 2', 'dataMax + 2']}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#9ca3af' }}
                        />
                        <Tooltip content={<CustomTooltip />} />

                        {/* Reference line cho mục tiêu */}
                        <ReferenceLine
                            y={targetWeight}
                            stroke="#1c6b42"
                            strokeDasharray="5 5"
                            label={{
                                position: 'right',
                                value: `Mục tiêu (${targetWeight}kg)`,
                                fill: '#1c6b42',
                                fontSize: 12,
                                offset: 10,
                            }}
                        />

                        {/* Đường trọng lượng */}
                        <Line
                            type="monotone"
                            dataKey="weight"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={(props) => {
                                const { cx, cy, payload } = props;
                                const isCurrentOrFuture = payload.status === 'current' || payload.status === 'future';
                                return (
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r={4}
                                        fill={isCurrentOrFuture ? '#3b82f6' : '#fff'}
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                    />
                                );
                            }}
                            activeDot={{ r: 6, fill: '#3b82f6' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="px-8 pb-6 flex gap-6 text-xs font-medium text-gray-600 flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Lộ trình cân nặng</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-[#1c6b42]" style={{ borderStyle: 'dashed' }}></div>
                    <span>Mục tiêu</span>
                </div>
            </div>
        </div>
    );
}
