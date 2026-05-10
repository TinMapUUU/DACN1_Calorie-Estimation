'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

// ===================== TYPES =====================
interface PortionOption {
  gram: number;
  calories_preview: number;
}

interface AnalyzeResult {
  food_name: string;
  confidence_score: number;
  top3_predictions: { rank: number; food: string; probability: number }[];
  portion_options: {
    available_units: Record<string, PortionOption>;
    default_unit: string;
  };
}

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '🌅 Sáng',
  lunch: '☀️ Trưa',
  dinner: '🌙 Tối',
  snack: '🍎 Ăn vặt',
};

// ===================== PORTION MODAL =====================
function PortionModal({
  result,
  mealType,
  onClose,
  onConfirm,
  isConfirming,
}: {
  result: AnalyzeResult;
  mealType: MealType;
  onClose: () => void;
  onConfirm: (portionUnit: string | null, customGram: number | null) => void;
  isConfirming: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'normal' | 'custom'>('normal');
  const [selectedUnit, setSelectedUnit] = useState(result.portion_options.default_unit);
  const [customGram, setCustomGram] = useState('');

  const units = result.portion_options.available_units;
  const unitKeys = Object.keys(units);

  const previewCalories =
    activeTab === 'normal'
      ? units[selectedUnit]?.calories_preview ?? '--'
      : customGram
        ? Math.round((parseFloat(customGram) / 100) * (units[unitKeys[0]]?.calories_preview / (units[unitKeys[0]]?.gram / 100) || 130))
        : '--';

  const handleConfirm = () => {
    if (activeTab === 'normal') {
      onConfirm(selectedUnit, null);
    } else {
      const g = parseFloat(customGram);
      if (!g || g <= 0) return;
      onConfirm(null, g);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full md:max-w-lg bg-white rounded-t-[32px] md:rounded-[28px] shadow-2xl overflow-hidden animate-slide-up">

        {/* Drag Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1.5 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="px-6 pt-4 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#1c6b42] mb-1">
                AI đã nhận diện
              </p>
              <h2 className="text-2xl font-['Plus_Jakarta_Sans'] font-bold text-[#191c1c]">
                {result.food_name}
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Độ tin cậy: {(result.confidence_score * 100).toFixed(1)}%
              </p>
            </div>
            {/* Calories Preview */}
            <div className="text-right">
              <div className="text-3xl font-extrabold text-[#1c6b42] font-['Plus_Jakarta_Sans']">
                {previewCalories}
              </div>
              <div className="text-xs text-gray-400 font-medium">kcal</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50">
          <button
            onClick={() => setActiveTab('normal')}
            className={`flex-1 py-3 text-sm font-semibold transition-all ${activeTab === 'normal'
              ? 'text-[#1c6b42] border-b-2 border-[#1c6b42] bg-white'
              : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            🍽️ Chọn khẩu phần
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-3 text-sm font-semibold transition-all ${activeTab === 'custom'
              ? 'text-[#1c6b42] border-b-2 border-[#1c6b42] bg-white'
              : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            ⚖️ Nhập gram
          </button>
        </div>

        {/* Tab Content */}
        <div className="px-6 py-5">
          {activeTab === 'normal' ? (
            <div className="space-y-2.5">
              <p className="text-xs text-gray-400 mb-3">
                Chọn khẩu phần phù hợp — calories sẽ tự tính tự động:
              </p>
              {unitKeys.map((unit) => {
                const info = units[unit];
                const isSelected = selectedUnit === unit;
                const isDefault = unit === result.portion_options.default_unit;
                return (
                  <button
                    key={unit}
                    onClick={() => setSelectedUnit(unit)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 transition-all text-left ${isSelected
                      ? 'border-[#1c6b42] bg-[#e6efeb]'
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-[#1c6b42]' : 'border-gray-300'
                          }`}
                      >
                        {isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#1c6b42]" />
                        )}
                      </div>
                      <span className="font-medium text-[#191c1c] text-sm">{unit}</span>
                      {isDefault && (
                        <span className="text-[10px] bg-[#1c6b42] text-white px-1.5 py-0.5 rounded-full font-semibold">
                          Mặc định
                        </span>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-[#1c6b42] text-sm">
                        {info.calories_preview} kcal
                      </div>
                      <div className="text-xs text-gray-400">{info.gram}g</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">
                Dành cho bạn muốn kiểm soát chính xác — nhập số gram thực tế:
              </p>
              <div className="relative">
                <input
                  type="number"
                  value={customGram}
                  onChange={(e) => setCustomGram(e.target.value)}
                  placeholder="VD: 350"
                  min="1"
                  max="2000"
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-xl font-bold text-[#191c1c] text-center focus:outline-none focus:border-[#1c6b42] transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                  gram
                </span>
              </div>

              {/* Quick gram buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[150, 250, 350, 500].map((g) => (
                  <button
                    key={g}
                    onClick={() => setCustomGram(String(g))}
                    className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${customGram === String(g)
                      ? 'border-[#1c6b42] bg-[#e6efeb] text-[#1c6b42]'
                      : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                      }`}
                  >
                    {g}g
                  </button>
                ))}
              </div>

              {customGram && parseFloat(customGram) > 0 && (
                <div className="bg-[#e6efeb] rounded-2xl p-3 text-center">
                  <span className="text-[#1c6b42] font-bold text-lg">{previewCalories} kcal</span>
                  <span className="text-[#1c6b42] text-sm"> cho {customGram}g</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-500 font-semibold text-sm hover:border-gray-300 transition-all"
          >
            Huỷ
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming || (activeTab === 'custom' && (!customGram || parseFloat(customGram) <= 0))}
            className="flex-[2] py-4 rounded-2xl bg-[#1c6b42] text-white font-bold text-sm hover:bg-[#155234] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isConfirming ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Đang lưu...
              </>
            ) : (
              '✅ Xác nhận & Lưu'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== MAIN PAGE =====================
export default function AiScannerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewImage, setPreviewImage] = useState<string>(
    'https://placehold.co/600x400/eceeed/a3a3a3?text=Chua+Chon+Anh'
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Kết quả từ analyze
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Kết quả sau khi confirm (hiển thị thẻ summary)
  const [savedMeal, setSavedMeal] = useState<{
    food_name: string; calories: number; protein_g: number;
    carbs_g: number; fat_g: number; gram: number;
  } | null>(null);

  const [mealType, setMealType] = useState<MealType>('lunch');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert('Bạn cần đăng nhập để xem trang này!');
      router.push(`/login?redirect=${pathname}`);
    }
  }, [router, pathname]);

  const handleBoxClick = (e: React.MouseEvent) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      e.preventDefault();
      alert('Vui lòng đăng nhập để sử dụng tính năng AI Scanner!');
      router.push(`/login?redirect=${pathname}`);
      return;
    }
    fileInputRef.current?.click();
  };

  // ===================== BƯỚC 1: ANALYZE =====================
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    setPreviewImage(URL.createObjectURL(file));
    setIsAnalyzing(true);
    setAnalyzeResult(null);
    setSavedMeal(null);
    setErrorMsg(null);
    setShowModal(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/vision/analyze', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Lỗi từ server AI');
      }

      const data: AnalyzeResult = await response.json();
      setAnalyzeResult(data);
      setShowModal(true); // Mở modal chọn khẩu phần
    } catch (error: any) {
      setErrorMsg(error.message || 'Lỗi kết nối Backend');
    } finally {
      setIsAnalyzing(false);
      // Reset input để có thể upload cùng file lần sau
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ===================== BƯỚC 2: CONFIRM =====================
  const handleConfirm = async (portionUnit: string | null, customGram: number | null) => {
    if (!analyzeResult) return;
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setIsConfirming(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/vision/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          food_name: analyzeResult.food_name,
          portion_unit: portionUnit,
          custom_gram: customGram,
          meal_type: mealType,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Lỗi lưu dữ liệu');
      }

      const data = await response.json();
      setSavedMeal(data);
      setShowModal(false);
    } catch (error: any) {
      setErrorMsg(error.message || 'Lỗi lưu bữa ăn');
      setShowModal(false);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="bg-[#f8faf9] text-[#191c1c] font-body antialiased flex min-h-screen overflow-x-hidden">
      <Sidebar />

      <main className="flex-1 md:ml-64 w-full flex flex-col pb-28 md:pb-12">
        <div className="max-w-6xl mx-auto w-full p-6 md:p-12 lg:p-16 flex-1 flex flex-col">

          {/* Header */}
          <header className="mb-10 lg:mb-16">
            <h2 className="text-[#191c1c] text-4xl lg:text-5xl font-['Plus_Jakarta_Sans'] font-extrabold tracking-tight mb-3">
              Quét Bằng AI
            </h2>
            <p className="text-gray-500 text-lg max-w-xl">
              Chụp ảnh bữa ăn — AI nhận diện, bạn chọn khẩu phần, hệ thống tính calories.
            </p>
          </header>

          {/* Meal Type Selector */}
          <div className="flex gap-2 mb-8 flex-wrap">
            <span className="text-sm text-gray-500 self-center mr-1 font-medium">Bữa ăn:</span>
            {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map((type) => (
              <button
                key={type}
                onClick={() => setMealType(type)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all ${mealType === type
                  ? 'bg-[#1c6b42] text-white border-[#1c6b42]'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
              >
                {MEAL_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

            {/* Cột trái: Ảnh */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="relative bg-white rounded-3xl p-4 shadow-sm border border-gray-100 overflow-hidden">
                <div className="relative rounded-[24px] overflow-hidden aspect-[4/3] bg-gray-100 flex items-center justify-center">
                  <img
                    src={previewImage}
                    alt="Meal Preview"
                    className={`w-full h-full object-cover transition-all duration-500 ${isAnalyzing ? 'opacity-40 scale-105' : 'opacity-100 scale-100'
                      }`}
                  />
                  {isAnalyzing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-4 border-[#1c6b42]/20 border-t-[#1c6b42] rounded-full animate-spin" />
                      <p className="text-[#1c6b42] font-semibold text-sm">Đang phân tích AI...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Box */}
              <div
                onClick={handleBoxClick}
                className="bg-white rounded-3xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors border-2 border-dashed border-gray-200"
              >
                <div className="w-16 h-16 bg-[#e6efeb] rounded-full flex items-center justify-center text-[#1c6b42]">
                  <span className="material-symbols-outlined text-3xl">upload_file</span>
                </div>
                <div className="text-center">
                  <p className="text-[#191c1c] font-semibold text-lg">Quét bữa ăn mới</p>
                  <p className="text-gray-500 text-sm mt-1">Chụp ảnh hoặc tải lên từ thư viện</p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              </div>
            </div>

            {/* Cột phải: Kết quả */}
            <div className="lg:col-span-5 flex flex-col gap-6">

              {/* Error */}
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm font-medium">
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Trạng thái chờ */}
              {!savedMeal && !isAnalyzing && !analyzeResult && (
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center gap-4 min-h-[200px]">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-gray-400">camera_alt</span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Tải ảnh lên để AI nhận diện món ăn và tính calories.
                  </p>
                </div>
              )}

              {/* Đang phân tích */}
              {isAnalyzing && (
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-4 min-h-[200px]">
                  <div className="w-12 h-12 border-4 border-[#1c6b42]/20 border-t-[#1c6b42] rounded-full animate-spin" />
                  <p className="text-[#1c6b42] font-semibold">Đang nhận diện món ăn...</p>
                  <p className="text-gray-400 text-xs">AI đang xử lý ảnh của bạn</p>
                </div>
              )}

              {/* Kết quả sau khi confirm */}
              {savedMeal && (
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <div className="inline-flex items-center gap-1.5 bg-[#e6efeb] text-[#1c6b42] px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-4">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    <span>Đã lưu thành công</span>
                  </div>
                  <h3 className="text-3xl font-['Plus_Jakarta_Sans'] font-bold text-[#191c1c] mb-6">
                    {savedMeal.food_name}
                  </h3>

                  {/* Calories lớn */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 bg-[#e6efeb] rounded-2xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#1c6b42] text-3xl">local_fire_department</span>
                    </div>
                    <div>
                      <div className="text-5xl font-extrabold text-[#1c6b42] font-['Plus_Jakarta_Sans']">
                        {savedMeal.calories}
                      </div>
                      <div className="text-gray-400 font-medium">kcal • {savedMeal.gram}g</div>
                    </div>
                  </div>

                  {/* Macros */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Chất đạm', value: savedMeal.protein_g, color: 'bg-blue-50 text-blue-600' },
                      { label: 'Tinh bột', value: savedMeal.carbs_g, color: 'bg-amber-50 text-amber-600' },
                      { label: 'Chất béo', value: savedMeal.fat_g, color: 'bg-rose-50 text-rose-600' },
                    ].map((m) => (
                      <div key={m.label} className={`${m.color} rounded-2xl p-3 text-center`}>
                        <div className="font-bold text-lg">{m.value}g</div>
                        <div className="text-xs font-medium opacity-75">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chọn bữa ăn */}
              {!savedMeal && !isAnalyzing && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <p className="font-semibold text-gray-600 text-xs uppercase tracking-wider mb-3">🍴 Chọn bữa ăn</p>
                  <div className="grid grid-cols-4 gap-2">
                    {(
                      [
                        { key: 'breakfast', emoji: '🌅', label: 'Sáng' },
                        { key: 'lunch', emoji: '☀️', label: 'Trưa' },
                        { key: 'dinner', emoji: '🌙', label: 'Tối' },
                        { key: 'snack', emoji: '🍎', label: 'Ăn vặt' },
                      ] as { key: MealType; emoji: string; label: string }[]
                    ).map(({ key, emoji, label }) => (
                      <button
                        key={key}
                        onClick={() => setMealType(key)}
                        className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-xs font-semibold transition-all border-2
                          ${mealType === key
                            ? 'bg-[#e6efeb] border-[#1c6b42] text-[#1c6b42]'
                            : 'bg-gray-50 border-transparent text-gray-500 hover:border-gray-200'
                          }`}
                      >
                        <span className="text-lg leading-none">{emoji}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hướng dẫn nhanh */}
              {!savedMeal && !isAnalyzing && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100 text-sm text-gray-500 space-y-2">
                  <p className="font-semibold text-gray-600 text-xs uppercase tracking-wider mb-3">Cách hoạt động</p>
                  {['📸 Tải ảnh bữa ăn lên', '🤖 AI nhận diện món', '🍽️ Chọn khẩu phần phù hợp', '💾 Hệ thống tự tính & lưu'].map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">
                        {i + 1}
                      </div>
                      {step}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Portion Modal */}
      {showModal && analyzeResult && (
        <PortionModal
          result={analyzeResult}
          mealType={mealType}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirm}
          isConfirming={isConfirming}
        />
      )}

      <style jsx global>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>
    </div>
  );
}
