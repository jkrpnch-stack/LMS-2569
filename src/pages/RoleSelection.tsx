import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { GraduationCap, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function RoleSelection() {
    const { user, setProfile } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | null>(null);
    const navigate = useNavigate();

    const handleCreateProfile = async () => {
        if (!user || !selectedRole) return;
        
        setLoading(true);
        try {
            const profileData = {
                email: user.email || '',
                name: user.displayName || 'Unknown',
                role: selectedRole,
                totalScore: 0,
                createdAt: Date.now()
            };
            
            await setDoc(doc(db, 'users', user.uid), profileData);
            setProfile({ id: user.uid, ...profileData } as any);
            
            navigate('/');
        } catch (error) {
            console.error("Error creating profile:", error);
            // In a real app, we'd handle the 'handleFirestoreError' custom parsing here maybe
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
            <div className="max-w-xl w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900">เลือกบทบาทของคุณ</h2>
                    <p className="mt-2 text-gray-600">กรุณาเลือกบทบาทเพื่อเข้าใช้งานระบบ</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                    <button
                        onClick={() => setSelectedRole('student')}
                        className={`p-6 border-2 rounded-xl flex flex-col items-center gap-4 transition-all ${
                            selectedRole === 'student' 
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 text-gray-700'
                        }`}
                    >
                        <GraduationCap className={`h-12 w-12 ${selectedRole === 'student' ? 'text-indigo-600' : 'text-gray-400'}`} />
                        <span className="font-semibold text-lg">เข้าเรียน (นักเรียน)</span>
                    </button>
                    
                    <button
                        onClick={() => setSelectedRole('teacher')}
                        className={`p-6 border-2 rounded-xl flex flex-col items-center gap-4 transition-all ${
                            selectedRole === 'teacher' 
                                ? 'border-amber-500 bg-amber-50 text-amber-700' 
                                : 'border-gray-200 hover:border-amber-300 hover:bg-gray-50 text-gray-700'
                        }`}
                    >
                        <Users className={`h-12 w-12 ${selectedRole === 'teacher' ? 'text-amber-500' : 'text-gray-400'}`} />
                        <span className="font-semibold text-lg">จัดการสอน (ครู)</span>
                    </button>
                </div>
                
                <div className="mt-8">
                    <button
                        onClick={handleCreateProfile}
                        disabled={loading || !selectedRole}
                        className="w-full py-3 px-4 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'กำลังดำเนินการ...' : 'เริ่มต้นใช้งาน'}
                    </button>
                </div>
            </div>
        </div>
    );
}
