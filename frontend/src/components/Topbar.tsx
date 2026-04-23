export default function Topbar() {
    return (
        <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 flex justify-between items-center px-8 bg-white/80 backdrop-blur">
            <h2 className="text-lg font-bold text-green-700">
                Profile
            </h2>

            <div className="flex gap-4">
                <span>🔔</span>
                <span>⚙️</span>
            </div>
        </header>
    )
}