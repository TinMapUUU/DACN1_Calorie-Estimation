"use client";

import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

interface ChartPoint {
    date: string;
    weight: number;
    status: 'past' | 'current' | 'future';
}

interface GoalProjectionChartProps {
    targetWeight: number;
    currentWeight: number;
    goalDurationMonths: number;
    goalType: 'lose_weight' | 'gain_weight';
    // Ngày kết thúc từ DB (nếu có) — dạng "dd/MM/yyyy" hoặc null
    targetDate?: string | null;
    // Ngày bắt đầu từ DB (nếu có) — dạng "dd/MM/yyyy" hoặc null
    startDate?: string | null;
}

// ─── Parse "dd/MM/yyyy" → Date ────────────────────────────
function parseViDate(s: string): Date | null {
    const parts = s.split('/');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
}

// ─── Format Date → "dd/MM" ────────────────────────────────
function fmt(d: Date): string {
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

export default function GoalProjectionChart({
    targetWeight,
    currentWeight,
    goalDurationMonths,
    goalType,
    targetDate,
    startDate,
}: GoalProjectionChartProps) {

    // ─── Tạo data points động ────────────────────────────────
    const data: ChartPoint[] = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Tính ngày kết thúc
        let endDateObj: Date;
        if (targetDate) {
            endDateObj = parseViDate(targetDate) ?? new Date();
        } else {
            endDateObj = new Date(today);
            endDateObj.setMonth(endDateObj.getMonth() + goalDurationMonths);
        }

        // Tính ngày bắt đầu
        let startDateObj: Date;
        if (startDate) {
            startDateObj = parseViDate(startDate) ?? new Date();
        } else {
            startDateObj = new Date(endDateObj);
            startDateObj.setMonth(startDateObj.getMonth() - goalDurationMonths);
        }

        // Trọng số tại startDate = currentWeight (nếu đã bắt đầu lâu) 
        // hoặc tính ngược lại từ tốc độ thay đổi
        const totalDays = Math.max(1,
            (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)
        );
        const totalDiff = targetWeight - currentWeight; // âm = giảm, dương = tăng

        // Tính cân nặng tại startDate dựa trên tốc độ tuyến tính
        const daysFromStartToToday = Math.max(0,
            (today.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)
        );
        const weightAtStart = currentWeight - (totalDiff * daysFromStartToToday / totalDays);

        // Sinh điểm mỗi 2 tuần (tối đa 20 điểm)
        const points: ChartPoint[] = [];
        const stepDays = Math.max(14, Math.round(totalDays / 12));
        let currentDate = new Date(startDateObj);

        while (currentDate <= endDateObj) {
            const daysFromStart = (currentDate.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24);
            const progress = daysFromStart / totalDays;
            const w = parseFloat((weightAtStart + (targetWeight - weightAtStart) * progress).toFixed(1));

            const diffMs = currentDate.getTime() - today.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);

            let status: 'past' | 'current' | 'future';
            if (diffDays < -1)       status = 'past';
            else if (diffDays <= 1)  status = 'current';
            else                     status = 'future';

            points.push({ date: fmt(currentDate), weight: w, status });
            currentDate = new Date(currentDate.getTime() + stepDays * 24 * 60 * 60 * 1000);
        }

        // Đảm bảo điểm cuối luôn là targetWeight / endDate
        const lastPoint = points[points.length - 1];
        if (!lastPoint || lastPoint.date !== fmt(endDateObj)) {
            points.push({
                date: fmt(endDateObj),
                weight: targetWeight,
                status: endDateObj > today ? 'future' : 'past',
            });
        }

        return points;
    }, [currentWeight, targetWeight, goalDurationMonths, targetDate, startDate]);

    // ─── Derived ──────────────────────────────────────────────
    const isGaining = goalType === 'gain_weight';
    const diff      = Math.abs(currentWeight - targetWeight).toFixed(1);

    // Progress: % của hành trình đã đi được
    const startW    = data[0]?.weight ?? currentWeight;
    const totalDiff = Math.abs(targetWeight - startW);
    const doneDiff  = Math.abs(currentWeight - startW);
    const progressPct = totalDiff > 0 ? Math.min(100, Math.max(0, (doneDiff / totalDiff) * 100)) : 0;

    // Y-axis domain
    const weights  = data.map(d => d.weight);
    const yMin     = Math.floor(Math.min(...weights, targetWeight) - 2);
    const yMax     = Math.ceil(Math.max(...weights, targetWeight) + 2);

    // ─── Tooltip ──────────────────────────────────────────────
    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartPoint }> }) => {
        if (!active || !payload?.length) return null;
        const p = payload[0].payload;
        return (
            <div className="bg-gray-900 text-white px-3 py-2 rounded-xl shadow-xl text-sm border border-gray-700">
                <p className="font-semibold">{p.date}</p>
                <p className="font-bold text-[#86D3A0] text-base">{p.weight} kg</p>
                <p className="text-gray-400 text-xs mt-0.5">
                    {p.status === 'past' ? '✓ Quá khứ' : p.status === 'current' ? '📍 Hôm nay' : '🎯 Dự báo'}
                </p>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm w-full overflow-hidden">
            <div className="p-8">
                {/* Header */}
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Weight Goal Projection</h3>
                    <p className="text-sm text-[#1c6b42] font-semibold">
                        ✨ Cố lên! Bạn sẽ đạt {targetWeight}kg
                        {targetDate ? ` vào ngày ${targetDate}` : ` trong ${goalDurationMonths} tháng`}.
                    </p>
                </div>

                {/* Progress bar */}
                <div className="mb-6 bg-[#f2f4f3] rounded-full h-2.5 overflow-hidden">
                    <div
                        className="h-full bg-[#1c6b42] rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8 text-center">
                    <div className="bg-blue-50 p-3 rounded-xl">
                        <p className="text-xs text-gray-600 font-medium">Cân nặng hiện tại</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{currentWeight}kg</p>
                    </div>
                    <div className={`p-3 rounded-xl ${isGaining ? 'bg-green-50' : 'bg-yellow-50'}`}>
                        {/* FIX: "Cần tăng" hay "Cần giảm" tùy goalType */}
                        <p className="text-xs text-gray-600 font-medium">{isGaining ? 'Cần tăng' : 'Cần giảm'}</p>
                        <p className={`text-2xl font-bold mt-1 ${isGaining ? 'text-green-600' : 'text-yellow-600'}`}>
                            {isGaining ? '+' : '-'}{diff}kg
                        </p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-xl">
                        <p className="text-xs text-gray-600 font-medium">Mục tiêu</p>
                        <p className="text-2xl font-bold text-[#1c6b42] mt-1">{targetWeight}kg</p>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="w-full h-[300px] px-8 pb-8">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            dy={10}
                        />
                        <YAxis
                            domain={[yMin, yMax]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                        />
                        <Tooltip content={<CustomTooltip />} />

                        {/* Đường mục tiêu */}
                        <ReferenceLine
                            y={targetWeight}
                            stroke="#1c6b42"
                            strokeDasharray="5 5"
                            strokeWidth={1.5}
                            label={{
                                position: 'right',
                                value: `${targetWeight}kg`,
                                fill: '#1c6b42',
                                fontSize: 11,
                            }}
                        />

                        {/* Đường hiện tại */}
                        <ReferenceLine
                            y={currentWeight}
                            stroke="#3b82f6"
                            strokeDasharray="3 3"
                            strokeOpacity={0.4}
                        />

                        {/* Đường lộ trình */}
                        <Line
                            type="monotone"
                            dataKey="weight"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={(props: { cx: number; cy: number; payload: ChartPoint }) => {
                                const { cx, cy, payload } = props;
                                const isCurrent = payload.status === 'current';
                                const isPast    = payload.status === 'past';
                                return (
                                    <circle
                                        key={`dot-${cx}-${cy}`}
                                        cx={cx} cy={cy} r={isCurrent ? 6 : 4}
                                        fill={isPast ? '#fff' : '#3b82f6'}
                                        stroke="#3b82f6"
                                        strokeWidth={isCurrent ? 3 : 2}
                                    />
                                );
                            }}
                            activeDot={{ r: 7, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="px-8 pb-6 flex gap-6 text-xs font-medium text-gray-500 flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"/>
                    <span>Lộ trình cân nặng</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-5 h-0 border border-dashed border-[#1c6b42]"/>
                    <span>Mục tiêu ({targetWeight}kg)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-white border-2 border-blue-500 rounded-full"/>
                    <span>Giai đoạn đã qua</span>
                </div>
            </div>
        </div>
    );
}