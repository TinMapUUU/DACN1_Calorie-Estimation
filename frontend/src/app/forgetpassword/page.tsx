'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        try {
            // TODO: gọi API FastAPI của mày ở đây
            // await fetch('/api/forgot-password', {...})

            setTimeout(() => {
                setMessage('Đã gửi mã xác thực tới email!')
                setLoading(false)
            }, 1000)

        } catch (err) {
            setMessage('Có lỗi xảy ra!')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] relative overflow-hidden p-6">

            {/* BACKGROUND BLUR */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-green-300/20 blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-200/20 blur-[120px]" />

            {/* CARD */}
            <div className="w-full max-w-md z-10">
                <div className="bg-white rounded-xl p-8 sm:p-10 shadow-lg flex flex-col gap-8 border border-gray-200">

                    {/* HEADER */}
                    <div className="text-center flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-green-700 text-2xl">
                            🔐
                        </div>

                        <h1 className="text-2xl font-bold">
                            Quên mật khẩu?
                        </h1>

                        <p className="text-sm text-gray-500 max-w-[260px]">
                            Nhập email của bạn để nhận mã xác thực.
                        </p>
                    </div>

                    {/* FORM */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                        <div className="relative">
                            <input
                                type="email"
                                required
                                placeholder="Địa chỉ Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-100 rounded-full px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-green-300"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-green-700 text-white rounded-full py-4 text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition flex items-center justify-center gap-2"
                        >
                            {loading ? 'Đang gửi...' : 'Gửi mã xác thực →'}
                        </button>

                    </form>

                    {/* MESSAGE */}
                    {message && (
                        <p className="text-center text-sm text-green-600">
                            {message}
                        </p>
                    )}

                    {/* BACK */}
                    <div className="text-center">
                        <Link
                            href="/login"
                            className="text-green-700 text-sm font-medium hover:underline"
                        >
                            ← Quay lại đăng nhập
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    )
}