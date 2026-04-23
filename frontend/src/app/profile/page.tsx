'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import ProfileCard from '@/components/ProfileCard';

export default function ProfilePage() {
    const router = useRouter();

    // State lưu toàn bộ thông tin user
    const [userData, setUserData] = useState({
        fullName: "Đang tải...",
        email: "Đang tải...",
        id: "...",
        joinDate: "..."
    });

    // Gọi API lấy dữ liệu ngay khi vào trang
    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                const response = await fetch('http://127.0.0.1:8000/api/v1/users/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();

                    // Cắt gọt ngày tháng từ PostgreSQL (created_at) cho đẹp
                    let formattedDate = "10/2023";
                    if (data.created_at) {
                        const dateObj = new Date(data.created_at);
                        formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
                    }

                    // Cập nhật State
                    setUserData({
                        fullName: data.full_name || "Chưa có tên", // Khớp với cột full_name trong pgAdmin của bạn
                        email: data.email || "Chưa có email",
                        id: `NV-${data.id || "000"}`,
                        joinDate: formattedDate
                    });
                } else {
                    // Nếu token hết hạn (1 phút như nãy mình test) hoặc lỗi
                    localStorage.removeItem('access_token');
                    router.push('/login');
                }
            } catch (error) {
                console.error("Lỗi gọi API User:", error);
                setUserData(prev => ({ ...prev, fullName: "Lỗi kết nối", email: "Lỗi kết nối" }));
            }
        };

        fetchUser();
    }, [router]);

    // Hàm đăng xuất
    const handleLogout = () => {
        const isConfirm = window.confirm("Bạn có chắc chắn muốn đăng xuất không?");
        if (!isConfirm) return;

        localStorage.removeItem('access_token');
        router.push('/login');
    };

    return (
        <div className="bg-[#f8faf9] min-h-screen">
            <Sidebar />
            <Topbar />

            <main className="ml-64 pt-24 px-10 space-y-8 pb-12">

                {/* PROFILE CARD - Truyền dữ liệu vào đây */}
                <ProfileCard
                    name={userData.fullName}
                    id={userData.id}
                    joinDate={userData.joinDate}
                />

                {/* PERSONAL INFO */}
                <div className="bg-white p-8 rounded-xl shadow">
                    <h3 className="text-xl font-bold mb-6">
                        Thông tin cá nhân
                    </h3>

                    <div className="space-y-4">
                        {/* Input Tên */}
                        <input
                            className="w-full p-3 rounded-xl bg-gray-100 outline-none text-gray-700"
                            value={userData.fullName}
                            readOnly
                        />

                        {/* Input Email */}
                        <div className="flex gap-3">
                            <input
                                className="flex-1 p-3 rounded-xl bg-gray-100 outline-none text-gray-700"
                                value={userData.email}
                                readOnly
                            />
                            <button className="px-6 bg-green-300 text-green-900 rounded-xl font-bold hover:bg-green-400 transition-colors">
                                Cập nhật
                            </button>
                        </div>
                    </div>
                </div>

                {/* SECURITY */}
                <div className="bg-white p-8 rounded-xl shadow">
                    <h3 className="text-xl font-bold mb-6">
                        Bảo mật
                    </h3>

                    <div className="flex justify-between items-center">
                        <span>Mật khẩu</span>
                        <button className="text-green-700 font-bold hover:underline">
                            Đổi mật khẩu
                        </button>
                    </div>
                </div>

                {/* NÚT ĐĂNG XUẤT */}
                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleLogout}
                        className="px-8 py-3 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        Đăng xuất tài khoản
                    </button>
                </div>

            </main>
        </div>
    )
}