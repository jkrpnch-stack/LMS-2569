import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { Search, Book, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function StudentDashboard() {
    const { profile } = useAuthStore();
    const navigate = useNavigate();
    const [courses, setCourses] = useState<any[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.id) return;
        
        // Fetch all published courses
        const fetchCourses = async () => {
            try {
                const q = query(collection(db, 'courses'), where('isPublished', '==', true));
                const snapshot = await getDocs(q);
                const courseData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCourses(courseData);
            } catch (error) {
                handleFirestoreError(error, OperationType.LIST, 'courses');
            }
        };

        fetchCourses();

        // Listen to enrollments
        const eq = query(collection(db, 'enrollments'), where('studentId', '==', profile.id));
        const unsubscribe = onSnapshot(eq, (snapshot) => {
            const eqData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEnrollments(eqData);
            setLoading(false);
        }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'enrollments');
        });

        return () => unsubscribe();
    }, [profile]);

    const handleEnroll = async (courseId: string) => {
        if (!profile?.id) return;
        
        const enrollmentId = `enr-${profile.id}-${courseId}`;
        try {
            await setDoc(doc(db, 'enrollments', enrollmentId), {
                studentId: profile.id,
                courseId: courseId,
                progress: {},
                totalScore: 0,
                enrolledAt: Date.now()
            });
            navigate(`/student/course/${courseId}`);
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'enrollments');
        }
    };

    if (loading) return <div>กำลังโหลดรายวิชา...</div>;

    const enrolledCourseIds = enrollments.map(e => e.courseId);

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-indigo-50">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-xl">🎓</div>
                    <h1 className="text-2xl font-bold text-indigo-900">วิชาที่กำลังเรียน</h1>
                </div>
                <p className="text-slate-500 text-sm ml-14">จัดการและเรียนรู้จากวิชาที่คุณลงทะเบียนแล้ว</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                    {enrollments.length === 0 ? (
                        <div className="col-span-full text-center py-8 bg-slate-50 border border-slate-100 border-dashed rounded-2xl text-slate-400 font-bold text-sm">
                            ยังไม่มีวิชาที่ลงทะเบียนเรียน
                        </div>
                    ) : (
                        courses.filter(c => enrolledCourseIds.includes(c.id)).map((course, idx) => {
                            const enrollment = enrollments.find(e => e.courseId === course.id);
                            const points = enrollment?.totalScore || 0;
                            const gradients = [
                                'from-indigo-50 to-blue-50 border-indigo-100',
                                'from-emerald-50 to-teal-50 border-emerald-100',
                                'from-amber-50 to-orange-50 border-amber-100',
                            ];
                            const textColors = ['text-indigo-900', 'text-emerald-900', 'text-amber-900'];
                            const gIdx = idx % gradients.length;

                            return (
                                <div key={course.id} className={`rounded-[24px] bg-gradient-to-br ${gradients[gIdx]} border p-6 flex flex-col hover:shadow-md transition cursor-pointer`} onClick={() => navigate(`/student/course/${course.id}`)}>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-3xl">📐</span>
                                        <span className="px-2 py-1 bg-white rounded-lg text-[10px] font-bold text-indigo-600 border border-indigo-100">{points} XP</span>
                                    </div>
                                    <h3 className={`font-bold text-lg mb-1 ${textColors[gIdx]}`}>{course.title}</h3>
                                    <p className="text-xs text-slate-500 mb-6 flex-1 line-clamp-2">{course.description}</p>
                                    <div className="w-full bg-white/50 h-2 rounded-full mb-4">
                                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: '0%' }}></div> {/* We calculate real progress inside course */}
                                    </div>
                                    <button className="w-full py-2 bg-white hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-700 border border-slate-200 transition-colors flex items-center justify-center gap-2">
                                        <Book className="h-4 w-4" /> เข้าระบบห้องเรียน
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-indigo-50">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-xl">🌟</div>
                    <h2 className="text-xl font-bold text-slate-800">ค้นพบวิชาใหม่</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.filter(c => !enrolledCourseIds.includes(c.id)).map(course => (
                        <div key={course.id} className="bg-white rounded-[24px] border border-slate-200 p-6 flex flex-col hover:border-indigo-200 hover:shadow-sm transition">
                            <h3 className="font-bold text-lg text-slate-800">{course.title}</h3>
                            <p className="text-xs text-slate-500 mt-2 mb-6 flex-1 line-clamp-3 leading-relaxed">{course.description}</p>
                            <button
                                onClick={() => handleEnroll(course.id)}
                                className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-600 py-3 rounded-xl hover:bg-indigo-100 font-bold text-sm transition"
                            >
                                <PlayCircle className="h-4 w-4" /> ลงทะเบียนเรียนฟรี
                            </button>
                        </div>
                    ))}
                    {courses.filter(c => !enrolledCourseIds.includes(c.id)).length === 0 && (
                        <div className="col-span-full text-center py-6 text-slate-400 font-bold text-sm">
                            คุณลงทะเบียนครบทุกวิชาแล้ว
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
