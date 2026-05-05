'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
    const [showPassword, setShowPassword] = useState(false)
    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [birthYear, setBirthYear] = useState('')
    const [gender, setGender] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const res = await fetch('http://127.0.0.1:8000/api/v1/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // SỬA Ở ĐÂY: Đã thêm phone_number vào giỏ hàng để gửi đi
                body: JSON.stringify({
                    email: email,
                    password: password,
                    full_name: fullName,
                    phone_number: phone,
                    birth_year: parseInt(birthYear),
                    gender: gender
                })
            })

            const data = await res.json()

            if (!res.ok) {
                // SỬA Ở ĐÂY: Xử lý lỗi thông minh hơn. 
                // Nếu FastAPI trả về mảng báo lỗi (như lỗi thiếu trường), ta gom nó thành chữ dễ đọc
                const errorMessage = typeof data.detail === 'string'
                    ? data.detail
                    : JSON.stringify(data.detail);
                throw new Error(errorMessage);
            }

            alert('Đăng ký thành công! Đang chuyển hướng tới trang đăng nhập...')
            router.push('/login')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-[#f8faf9] text-[#191c1c]">

            {/* LEFT PANEL */}
            <div className="hidden md:flex md:w-1/2 lg:w-[55%] relative overflow-hidden p-8 bg-[#f2f4f3]">
                <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIRz_6Rd09oag0oY-UV3gDaWbYSAU1x8v8FIpDUE0XbWKoK52NKAIinXZLBs3nD38MHp3_xtJdxXApHi58x47F9vyAvxTGBbRNDIRukU3w-eDamPi_TWrfchF5SlGMvnPcufnDmQ3Dbj7vrn0yrpvtm6l5X6pFdfLlPydbneQ61jYHOJUjorA_7Z1eea7eq_Trx7Y9KPbqtl7HNM8af49AOxZ4vp5ZUP3eOVqPIKLvZk3ZxnZoUuNRfDC_PkCUtnGRYQfxRie31w"
                    alt="Greenhouse"
                    className="absolute inset-0 w-full h-full object-cover rounded-r-3xl opacity-90"
                />

                <div className="relative z-10 flex flex-col justify-between h-full">
                    <div className="flex items-center gap-2">
                        <span className="text-green-700 text-3xl">🌱</span>
                        <span className="font-bold text-xl">Vitality Core</span>
                    </div>

                    <div>
                        <h1 className="text-5xl font-extrabold leading-tight mb-6">
                            Grow your <br />
                            <span className="text-green-700">wellbeing</span>
                        </h1>
                        <p className="text-gray-600 text-lg">
                            Join the digital greenhouse. Track your health and grow better mỗi ngày.
                        </p>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24">
                <div className="w-full max-w-[400px]">

                    <h2 className="text-2xl font-bold mb-2">Create an account</h2>
                    <p className="text-gray-500 mb-8">
                        Begin your journey to a healthier you.
                    </p>

                    <form className="space-y-6" onSubmit={handleSubmit}>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* FULL NAME */}
                        <div>
                            <label className="block mb-2 text-sm text-gray-500">
                                Họ và tên
                            </label>
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Enter your full name"
                                className="w-full px-4 py-3 rounded-full bg-gray-100 focus:ring-2 focus:ring-green-300 outline-none"
                            />
                        </div>

                        {/* PHONE NUMBER */}
                        <div>
                            <label className="block mb-2 text-sm text-gray-500">
                                Số điện thoại
                            </label>
                            <input
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Nhập số điện thoại"
                                pattern="[0-9]{9,11}"
                                className="w-full px-4 py-3 rounded-full bg-gray-100 focus:ring-2 focus:ring-green-300 outline-none"
                            />
                        </div>

                        {/* BIRTH YEAR */}
                        <div>
                            <label className="block mb-2 text-sm text-gray-500">
                                Năm sinh
                            </label>
                            <input
                                type="number"
                                required
                                value={birthYear}
                                onChange={(e) => setBirthYear(e.target.value)}
                                placeholder="Nhập năm sinh của bạn"
                                min="1950"
                                max="2016"
                                className="w-full px-4 py-3 rounded-full bg-gray-100 focus:ring-2 focus:ring-green-300 outline-none"
                            />
                        </div>

                        {/* GENDER */}
                        <div>
                            <label className="block mb-2 text-sm text-gray-500">
                                Giới tính
                            </label>
                            <select
                                required
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className="w-full px-4 py-3 rounded-full bg-gray-100 focus:ring-2 focus:ring-green-300 outline-none"
                            >
                                <option value="">-- Chọn giới tính --</option>
                                <option value="male">Nam</option>
                                <option value="female">Nữ</option>
                                <option value="other">Khác</option>
                            </select>
                        </div>

                        {/* EMAIL */}
                        <div>
                            <label className="block mb-2 text-sm text-gray-500">
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 rounded-full bg-gray-100 focus:ring-2 focus:ring-green-300 outline-none"
                            />
                        </div>

                        {/* PASSWORD */}
                        <div>
                            <label className="block mb-2 text-sm text-gray-500">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Create a password"
                                    className="w-full px-4 py-3 rounded-full bg-gray-100 focus:ring-2 focus:ring-green-300 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-3 text-gray-400"
                                >
                                    👁
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                Must be at least 8 characters.
                            </p>
                        </div>

                        {/* BUTTON */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-green-700 text-white py-3 rounded-full font-bold hover:opacity-90 active:scale-[0.98] transition flex justify-center items-center gap-2"
                        >
                            {loading ? 'Đang đăng ký...' : 'Register →'}
                        </button>
                    </form>

                    {/* LOGIN */}
                    <div className="mt-8 text-center text-gray-500">
                        Already have an account?{' '}
                        <Link href="/login" className="text-green-700 font-semibold hover:underline">
                            Đăng nhập
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    )
}