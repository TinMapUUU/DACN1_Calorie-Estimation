'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

const NAVIGATION_LINKS = [
  { id: 1, href: "/dashboard", label: "Dashboard" },
  { id: 2, href: "/AIscaner", label: "AI Scan" },
  { id: 3, href: "/profile", label: "Profile" },
  { id: 4, href: "/history", label: "History" },
  { id: 5, href: "/bmi", label: "BMI & Goals" },
  { id: 6, href: "/chat", label: "Chat" },
  { id: 7, href: "/login", label: "Logout" },
];

export default function AiScannerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewImage, setPreviewImage] = useState<string>('https://placehold.co/600x400/eceeed/a3a3a3?text=No+Image+Selected');
  const [foodName, setFoodName] = useState<string>('Waiting...');
  const [confidence, setConfidence] = useState<string>('--% Match');
  const [calories, setCalories] = useState<string>('--');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // --- LOGIC BẢO VỆ ROUTE TOÀN TRANG ---
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert("Bạn cần đăng nhập để xem trang này!");
      router.push(`/login?redirect=${pathname}`);
    }
  }, [router, pathname]);

  // --- LOGIC BẢO VỆ CHỨC NĂNG UPLOAD ---
  const handleBoxClick = (e: React.MouseEvent) => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      e.preventDefault();
      alert("Vui lòng đăng nhập để sử dụng tính năng AI Scanner nhé!");
      router.push(`/login?redirect=${pathname}`);
      return;
    }

    fileInputRef.current?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Lấy token để gửi cho Backend
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert("Vui lòng đăng nhập lại để quét ảnh!");
      return;
    }

    setPreviewImage(URL.createObjectURL(file));
    setIsLoading(true);
    setFoodName('Đang phân tích...');
    setConfidence('Analyzing...');
    setCalories('--');

    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. SỬA ĐƯỜNG DẪN KHỚP VỚI MAIN.PY VÀ THÊM HEADER AUTH
      const response = await fetch('http://127.0.0.1:8000/api/v1/vision/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}` // Bắt buộc phải có
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Lỗi từ server AI');
      }

      const data = await response.json();

      // 2. SỬA LẠI TÊN BIẾN LÀ food_name THAY VÌ class_name
      setFoodName(data.food_name || 'Không xác định');

      if (data.confidence) setConfidence(`${(data.confidence * 100).toFixed(2)}% Match`);
      setCalories(data.calories ? String(data.calories) : '???');

    } catch (error: any) {
      console.error('Lỗi:', error);
      // Hiển thị trực tiếp lỗi từ backend ra màn hình để dễ xem
      setFoodName(error.message || 'Lỗi kết nối Backend');
      setConfidence('Error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body antialiased flex min-h-screen overflow-x-hidden bg-[#f8faf9]">

      {/* Thanh Menu bên trái */}
      <Sidebar />

      {/* Nội dung chính bên phải */}
      <main className="flex-1 md:ml-64 w-full flex flex-col relative pb-28 md:pb-12">
        <div className="max-w-6xl mx-auto w-full p-6 md:p-12 lg:p-16 flex-1 flex flex-col">
          <header className="mb-10 lg:mb-16">
            <h2 className="text-[#191c1c] text-4xl lg:text-5xl font-['Plus_Jakarta_Sans'] font-extrabold tracking-tight mb-3">Vision Engine</h2>
            <p className="text-gray-500 text-lg max-w-xl">Upload a photo of your meal to track your vitality.</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

            {/* Cột trái: Khu vực up ảnh */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="relative bg-white rounded-3xl p-4 shadow-sm border border-gray-100 overflow-hidden">
                <div className="relative rounded-[24px] overflow-hidden aspect-[4/3] bg-gray-100 flex items-center justify-center">
                  <img src={previewImage} alt="Meal Preview" className={`w-full h-full object-cover transition-transform duration-700 ${isLoading ? 'opacity-50' : 'opacity-100'}`} />
                </div>
              </div>

              <div onClick={handleBoxClick} className="bg-white rounded-3xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors border-2 border-dashed border-gray-200">
                <div className="w-16 h-16 bg-[#e6efeb] rounded-full flex items-center justify-center text-[#1c6b42]">
                  <span className="material-symbols-outlined text-3xl">upload_file</span>
                </div>
                <div className="text-center">
                  <p className="text-[#191c1c] font-semibold text-lg">Scan another meal</p>
                  <p className="text-gray-500 text-sm mt-1">Click here to select a new photo</p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              </div>
            </div>

            {/* Cột phải: Kết quả AI */}
            <div className="lg:col-span-5 flex flex-col gap-8">
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 relative overflow-hidden flex flex-col">
                <div className="flex items-start justify-between mb-8 relative z-10">
                  <div>
                    <div className="inline-flex items-center gap-1.5 bg-[#e6efeb] text-[#1c6b42] px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-4">
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      <span>{confidence}</span>
                    </div>
                    <h3 className="text-4xl font-['Plus_Jakarta_Sans'] font-bold text-[#191c1c] tracking-tight leading-tight">{foodName}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-6 mb-10 relative z-10">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-[8px] border-[#f2f4f3]"></div>
                    <span className="material-symbols-outlined text-[#1c6b42] text-3xl icon-fill">local_fire_department</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-5xl font-['Plus_Jakarta_Sans'] font-extrabold text-[#1c6b42] tracking-tight">
                      {calories}
                    </span>
                    <span className="text-gray-500 font-medium mt-1">Estimated kcal</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}