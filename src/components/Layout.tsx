import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { logout } from '../lib/firebase';
import { GraduationCap, LogOut, Trophy, Home } from 'lucide-react';

export function Layout() {
    const { profile } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[#F0F4FF] text-slate-800 flex flex-col font-sans">
            <header className="bg-white border-b border-indigo-100 sticky top-0 z-10 w-full">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 text-indigo-900">
                        <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-indigo-900 font-black text-xl">L</div>
                        <span className="font-bold text-xl tracking-tight hidden sm:block">LINE LMS <span className="text-amber-500">Pro</span></span>
                    </Link>
                    
                    <div className="flex items-center gap-4 sm:gap-6">
                        {profile?.role === 'student' && (
                            <Link to="/leaderboard" className="flex items-center gap-1.5 text-amber-600 font-bold bg-amber-100 px-4 py-2 rounded-xl hover:bg-amber-200 transition-colors">
                                <Trophy className="h-5 w-5" />
                                <span>{profile.totalScore} XP</span>
                            </Link>
                        )}
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-indigo-900">{profile?.name}</p>
                            <p className="text-xs text-slate-500 uppercase font-semibold">{profile?.role}</p>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-200 rounded-full border-2 border-indigo-500 overflow-hidden flex items-center justify-center text-indigo-700 font-bold text-lg">
                            {profile?.name ? profile.name.charAt(0).toUpperCase() : '👨‍🏫'}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                            aria-label="Logout"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </header>
            
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                <Outlet />
            </main>
            {profile?.role === 'student' && (
                <nav className="fixed bottom-0 w-full bg-white border-t border-indigo-100 sm:hidden px-6 h-16 flex items-center justify-around z-20">
                    <Link to="/" className="flex flex-col items-center text-indigo-400 hover:text-indigo-600 transition-colors">
                        <Home className="h-6 w-6" />
                        <span className="text-[10px] uppercase font-bold mt-1">Dashboard</span>
                    </Link>
                    <Link to="/leaderboard" className="flex flex-col items-center text-indigo-400 hover:text-indigo-600 transition-colors">
                        <Trophy className="h-6 w-6" />
                        <span className="text-[10px] uppercase font-bold mt-1">Ranking</span>
                    </Link>
                </nav>
            )}
        </div>
    );
}
