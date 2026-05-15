import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { ArrowLeft, CheckCircle, Circle, PlayCircle } from 'lucide-react';

export function StudentCourse() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuthStore();
    const [course, setCourse] = useState<any>(null);
    const [lessons, setLessons] = useState<any[]>([]);
    const [enrollment, setEnrollment] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!courseId || !profile?.id) return;

        const fetchData = async () => {
            try {
                // Fetch course
                const courseDoc = await getDoc(doc(db, 'courses', courseId));
                if (courseDoc.exists()) {
                    setCourse({ id: courseDoc.id, ...courseDoc.data() });
                }

                // Fetch lessons
                const q = query(collection(db, 'lessons'), where('courseId', '==', courseId));
                const lessonSnap = await getDocs(q);
                let lessonData = lessonSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                lessonData.sort((a: any, b: any) => a.order - b.order);
                setLessons(lessonData);
                
            } catch (error) {
                handleFirestoreError(error, OperationType.GET, 'student-course-data');
            }
        };

        fetchData();

        // Listen to enrollment for progress
        const enrId = `enr-${profile.id}-${courseId}`;
        const unsubscribe = onSnapshot(doc(db, 'enrollments', enrId), (doc) => {
            if (doc.exists()) {
                setEnrollment({ id: doc.id, ...doc.data() });
            }
            setLoading(false);
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, 'enrollments');
        });

        return () => unsubscribe();
    }, [courseId, profile?.id]);

    if (loading) return <div>กำลังโหลด...</div>;
    if (!course) return <div>ไม่พบวิชา</div>;

    const progress = enrollment?.progress || {};
    // Calculate percentage
    const completedCount = Object.keys(progress).length;
    const percentage = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
                <button onClick={() => navigate('/student')} className="p-2.5 bg-white border border-indigo-100 hover:bg-indigo-50 rounded-xl transition text-indigo-600 shadow-sm">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-indigo-900">{course.title}</h1>
                </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-indigo-50 shadow-sm">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">ความคืบหน้าการเรียน</h3>
                        <p className="text-sm text-slate-500">เรียนจบแล้ว {completedCount} จาก {lessons.length} บทเรียน</p>
                    </div>
                    <div className="text-3xl font-black text-indigo-600">{percentage}%</div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 mb-6 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-3 rounded-full transition-all duration-1000 ease-out" style={{ width: `${percentage}%` }}></div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <div className="w-10 h-10 bg-amber-200 rounded-xl flex items-center justify-center text-xl shadow-sm text-amber-700">🏆</div>
                    <div>
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">คะแนนสะสม</p>
                        <p className="text-lg font-black text-amber-900">{enrollment?.totalScore || 0} XP</p>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {lessons.map((lesson, index) => {
                    const isCompleted = progress[lesson.id];
                    return (
                        <div key={lesson.id} className={`p-4 bg-white border-2 rounded-[24px] flex items-center justify-between transition-all group ${isCompleted ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100 hover:border-indigo-100 hover:shadow-sm'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                                    {isCompleted ? <CheckCircle className="h-6 w-6" /> : <span className="font-bold text-lg">{index + 1}</span>}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{lesson.type === 'quiz' ? '📝 แบบทดสอบ' : '📄 เนื้อหา'}</p>
                                    <h3 className={`font-bold mt-0.5 ${isCompleted ? 'text-emerald-900' : 'text-slate-800'}`}>{lesson.title}</h3>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate(`/student/lesson/${lesson.id}`)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${
                                    isCompleted 
                                    ? 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50' 
                                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 group-hover:bg-indigo-600 group-hover:text-white'
                                }`}
                            >
                                <PlayCircle className="h-4 w-4" />
                                {isCompleted ? 'ทบทวนอีกครั้ง' : 'เข้าเรียน'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
