'use client';

// Khai báo kiểu dữ liệu truyền vào
interface ProfileCardProps {
    name: string;
    id: string;
    joinDate: string;
}

export default function ProfileCard({ name, id, joinDate }: ProfileCardProps) {
    return (
        <div className="bg-white p-8 rounded-xl shadow flex items-center gap-6">
            <img
                src="https://placehold.co/400x400/e6efeb/1c6b42?text=Anh+Dai+Dien"
                alt="Ảnh đại diện"
                className="w-24 h-24 rounded-full object-cover"
            />

            <div>
                <h3 className="text-2xl font-bold">{name}</h3>
                <p className="text-gray-500">ID: {id}</p>

                <div className="mt-3 flex gap-2">
                    <span className="px-3 py-1 bg-green-200 text-green-800 text-xs rounded-full font-semibold">
                        PRO
                    </span>
                    <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full font-medium">
                        Tham gia {joinDate}
                    </span>
                </div>
            </div>
        </div>
    );
}