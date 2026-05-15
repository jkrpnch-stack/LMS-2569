import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { Trophy, Medal, Award } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function Leaderboard() {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { profile } = useAuthStore();

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const q = query(collection(db, 'users'), where('role', '==', 'student'));
                const snapshot = await getDocs(q);
                let studentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                studentData.sort((a: any, b: any) => (b.totalScore || 0) - (a.totalScore || 0));
                
                // Add rank
                studentData = studentData.map((s, idx) => ({ ...s, rank: idx + 1 }));
                setStudents(studentData);
            } catch (error) {
                handleFirestoreError(error, OperationType.LIST, 'users');
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    if (loading) return <div>กำลังโหลดอันดับ...</div>;

    const renderRankIcon = (rank: number) => {
        if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
        if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
        if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
        return <span className="font-bold text-gray-500 w-6 text-center">{rank}</span>;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-indigo-600 rounded-[32px] p-8 text-white relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-8xl -mt-4 -mr-4">👑</div>
                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                    <div className="w-20 h-20 bg-amber-400 rounded-2xl flex items-center justify-center -rotate-6 shadow-lg">
                        <Trophy className="h-10 w-10 text-amber-900" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black mb-2">ตารางผู้นำ (Leaderboard)</h1>
                        <p className="text-indigo-200">อันดับรวมคะแนนสูงสุดจากการเข้าเรียนและการทำแบบทดสอบ</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-indigo-50">
                <div className="grid grid-cols-12 bg-slate-50 p-4 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-widest rounded-t-2xl">
                    <div className="col-span-2 text-center">RANK</div>
                    <div className="col-span-7">STUDENT</div>
                    <div className="col-span-3 text-right">TOTAL XP</div>
                </div>
                <div className="divide-y divide-slate-100 space-y-2 mt-4">
                    {students.map((student) => (
                        <div key={student.id} className={`grid grid-cols-12 p-4 items-center rounded-2xl transition hover:bg-slate-50 border border-transparent hover:border-slate-100 ${student.id === profile?.id ? 'bg-amber-50/50 border-amber-100/50' : ''}`}>
                            <div className="col-span-2 flex justify-center">
                                {renderRankIcon(student.rank)}
                            </div>
                            <div className="col-span-7 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden text-lg flex items-center justify-center font-bold text-indigo-700">
                                    {student.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm font-bold ${student.id === profile?.id ? 'text-indigo-700' : 'text-slate-800'}`}>
                                        {student.name} {student.id === profile?.id && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full ml-2 uppercase">You</span>}
                                    </p>
                                    <div className="w-64 bg-slate-100 h-1 mt-2 rounded-full hidden sm:block">
                                        <div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min((student.totalScore / (students[0]?.totalScore || 1)) * 100, 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-span-3 text-right text-xs font-bold text-amber-600">
                                {student.totalScore || 0} XP
                            </div>
                        </div>
                    ))}
                    {students.length === 0 && (
                        <div className="p-12 text-center">
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">ยังไม่มีข้อมูลนักเรียน</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
