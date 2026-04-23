"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link'; // <-- Thêm import này
import { useState } from 'react';

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Lấy giá trị redirect từ URL, mặc định là /AIscaner
    const redirectPath = searchParams.get('redirect') || '/AIscaner';

    const [formData, setFormData] = useState({ email: '', password: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await fetch('http://localhost:8000/api/v1/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('access_token', data.access_token);
                alert("Đăng nhập thành công!");
                router.push(redirectPath);
            } else {
                alert("Lỗi: " + (data.detail || "Đăng nhập thất bại"));
            }
        } catch (err) {
            alert("Không thể kết nối đến Backend. Hãy chắc chắn server FastAPI đang chạy!");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
            <div className="bg-white p-10 rounded-[40px] shadow-xl w-full max-w-md text-center border border-gray-100">
                <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
                <p className="text-gray-400 mb-8">Please enter your details to continue.</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="email"
                        placeholder="Email address"
                        className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-green-500"
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-green-500"
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                    />

                    <button
                        type="submit"
                        className="w-full py-4 bg-[#10B981] text-white font-bold rounded-full hover:bg-green-600 transition-all mt-4"
                    >
                        Sign In
                    </button>
                </form>

                <div className="mt-8 text-sm text-gray-500">
                    Don't have an account?{' '}
                    {/* SỬA LẠI ĐOẠN NÀY: Dùng thẻ Link của Next.js */}
                    <Link
                        href={`/register?redirect=${redirectPath}`}
                        className="text-green-600 font-bold hover:underline"
                    >
                        Create Account
                    </Link>
                </div>
            </div>
        </div>
    );
}