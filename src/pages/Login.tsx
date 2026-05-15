import { useState } from 'react';
import { signInWithGoogle } from '../lib/firebase';
import { GraduationCap } from 'lucide-react';

export function Login() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await signInWithGoogle();
        } catch (err: any) {
            setError(err.message || "Failed to sign in");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <div className="text-center flex flex-col items-center">
                    <div className="bg-indigo-50 p-4 rounded-full mb-4">
                        <GraduationCap className="h-12 w-12 text-indigo-600" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900">Line LMS Platform</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        เข้าสู่ระบบเพื่อเริ่มต้นการเรียนรู้ หรือการสอน
                    </p>
                </div>
                
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>}
                
                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5" />
                    {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}
                </button>
            </div>
        </div>
    );
}
