'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const menuItems = [
    { name: 'Tổng quan', href: '/dashboard', icon: 'dashboard' },
    { name: 'Quét Bằng AI', href: '/AIscaner', icon: 'center_focus_strong', highlight: true },
    { name: 'Lịch sử', href: '/history', icon: 'history' },
    { name: 'BMI & Mục tiêu', href: '/bmi', icon: 'monitor_weight' },
    { name: 'Trợ lý', href: '/chat', icon: 'forum' },
    { name: 'Cá nhân', href: '/profile', icon: 'person' },
]

export default function Sidebar() {
    const pathname = usePathname()

    return (
        <nav className="hidden md:flex flex-col py-8 gap-4 bg-[#f2f4f3] h-screen w-64 rounded-r-[32px] fixed left-0 top-0 z-40 shadow-[40px_0_40px_-12px_rgba(25,28,28,0.04)]">

            {/* LOGO */}
            <div className="px-8 mb-8 flex flex-col items-start">
                <span className="material-symbols-outlined text-[#1c6b42] text-4xl mb-2">
                    spa
                </span>
                <h1 className="text-lg font-black text-[#1c6b42] tracking-tight">
                    Greenhouse
                </h1>
                <p className="text-sm text-[#1c6b42]/70">
                    Sức sống dồi dào
                </p>
            </div>

            {/* MENU */}
            <div className="flex-1 flex flex-col gap-2 text-sm">
                {menuItems.map((item) => {

                    // fix active chuẩn hơn
                    const isActive = pathname.startsWith(item.href)

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={clsx(
                                'flex items-center gap-4 px-6 py-3 mx-2 rounded-full transition-all relative',

                                // ACTIVE
                                isActive && 'bg-[#1c6b42] text-white font-bold shadow-md',

                                // NORMAL
                                !isActive && 'text-emerald-800/60 hover:bg-emerald-50',

                                // HIGHLIGHT (AI Scanner)
                                item.highlight && !isActive && 'bg-white text-[#1c6b42] font-bold'
                            )}
                        >

                            {/* ACTIVE INDICATOR */}
                            {isActive && (
                                <span className="absolute left-2 w-1.5 h-6 bg-white rounded-full"></span>
                            )}

                            <span className="material-symbols-outlined">
                                {item.icon}
                            </span>

                            <span>{item.name}</span>
                        </Link>
                    )
                })}
            </div>

            {/* FOOTER */}
            <div className="px-4">
                <button className="w-full py-3 bg-[#1c6b42] text-white rounded-full font-bold hover:opacity-90 active:scale-95 transition">
                    Nâng Cấp Premium
                </button>
            </div>

        </nav>
    )
}