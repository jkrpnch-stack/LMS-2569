import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';

export function StudentLesson() {
    const { lessonId } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuthStore();
    
    const [lesson, setLesson] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Quiz state
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cheatingAttempts, setCheatingAttempts] = useState(0);
    const [quizResult, setQuizResult] = useState<any>(null); // To show results after submission

    useEffect(() => {
        if (!lessonId || !profile?.id) return;

        const fetchData = async () => {
            try {
                const docRef = doc(db, 'lessons', lessonId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = { id: docSnap.id, ...docSnap.data() } as any;
                    setLesson(data);
                    
                    if (data.type === 'quiz') {
                        const q = query(collection(db, 'questions'), where('lessonId', '==', lessonId));
                        const qSnap = await getDocs(q);
                        const qData = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        setQuestions(qData);
                    }
                }
            } catch (error) {
                handleFirestoreError(error, OperationType.GET, `lessons/${lessonId}`);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [lessonId, profile?.id]);

    // Anti-cheat: Track visibility change
    useEffect(() => {
        if (lesson?.type !== 'quiz' || quizResult) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                setCheatingAttempts(prev => prev + 1);
                alert("คำเตือน: ห้ามสลับหน้าจอระหว่างการทำแบบทดสอบ!");
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [lesson?.type, quizResult]);

    const markLessonComplete = async () => {
        if (!lesson || !profile?.id) return;
        try {
            const enrId = `enr-${profile.id}-${lesson.courseId}`;
            const enrDoc = await getDoc(doc(db, 'enrollments', enrId));
            if (enrDoc.exists()) {
                const enrData = enrDoc.data();
                if (!enrData.progress[lesson.id]) {
                    const newProgress = { ...enrData.progress, [lesson.id]: true };
                    await updateDoc(doc(db, 'enrollments', enrId), {
                        progress: newProgress
                    });
                }
            }
            navigate(`/student/course/${lesson.courseId}`);
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, 'enrollments');
        }
    };

    const submitQuiz = async () => {
        if (!lesson || !profile?.id || isSubmitting) return;
        setIsSubmitting(true);
        try {
            // Calculate score locally (since we don't have Serverless Cloud Functions here to verify securely)
            let score = 0;
            questions.forEach(q => {
                if (answers[q.id] === q.correctOptionIndex) {
                    score += 10; // 10 points per question
                }
            });

            // Save Attempt
            const attemptId = `att-${profile.id}-${lesson.id}-${Date.now()}`;
            await setDoc(doc(db, 'quizAttempts', attemptId), {
                studentId: profile.id,
                lessonId: lesson.id,
                courseId: lesson.courseId,
                score: score,
                cheatingFlags: cheatingAttempts,
                completed: true,
                attemptedAt: Date.now()
            });

            // Update user total score
            const userRef = doc(db, 'users', profile.id);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                await updateDoc(userRef, {
                    totalScore: (userDoc.data().totalScore || 0) + score
                });
            }

            // Update enrollment progress and course total score
            const enrId = `enr-${profile.id}-${lesson.courseId}`;
            const enrDoc = await getDoc(doc(db, 'enrollments', enrId));
            if (enrDoc.exists()) {
                const enrData = enrDoc.data();
                const newProgress = { ...enrData.progress, [lesson.id]: true };
                await updateDoc(doc(db, 'enrollments', enrId), {
                    progress: newProgress,
                    totalScore: (enrData.totalScore || 0) + score
                });
            }

            setQuizResult({ score, total: questions.length * 10 });
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'quizAttempts');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div>กำลังโหลด...</div>;
    if (!lesson) return <div>ไม่พบบทเรียน</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(`/student/course/${lesson.courseId}`)} className="p-2.5 bg-white border border-indigo-100 hover:bg-indigo-50 rounded-xl transition text-indigo-600 shadow-sm">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-indigo-900">{lesson.title}</h1>
                </div>
            </div>

            {lesson.type === 'content' ? (
                <div className="bg-white p-8 rounded-[32px] border border-indigo-50 shadow-sm">
                    <div className="prose max-w-none text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: lesson.content?.replace(/\n/g, '<br/>') }} />
                    <div className="mt-12 flex justify-end pt-6 border-t border-indigo-50">
                        <button
                            onClick={markLessonComplete}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-xl hover:bg-indigo-700 transition font-bold shadow-md shadow-indigo-200"
                        >
                            <CheckCircle className="h-5 w-5" />
                            เรียนจบแล้ว
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {cheatingAttempts > 0 && !quizResult && (
                        <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-2xl flex gap-4 text-rose-700 items-center shadow-sm">
                            <div className="p-3 bg-white rounded-xl text-rose-500 shadow-sm">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="font-bold text-base">ระบบตรวจพบความพยายามในการสลับหน้าจอ!</p>
                                <p className="text-sm opacity-90">การสลับหน้าจออาจทำให้คะแนนของคุณถูกระงับได้</p>
                            </div>
                        </div>
                    )}

                    {quizResult ? (
                        <div className="bg-white p-12 rounded-[32px] border border-indigo-50 shadow-sm text-center space-y-4">
                            <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-[24px] mx-auto flex items-center justify-center -rotate-6 shadow-sm mb-6">
                                <span className="text-4xl">🎉</span>
                            </div>
                            <h2 className="text-3xl font-black text-slate-800">ผลการทำแบบทดสอบ</h2>
                            <div className="text-6xl font-black text-indigo-600 py-8">
                                {quizResult.score} <span className="text-2xl text-slate-400 font-bold">/ {quizResult.total} XP</span>
                            </div>
                            <button
                                onClick={() => navigate(`/student/course/${lesson.courseId}`)}
                                className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-200 inline-block"
                            >
                                กลับสู่หน้าวิชา
                            </button>
                        </div>
                    ) : questions.length === 0 ? (
                        <div className="bg-white p-12 rounded-[32px] border border-indigo-50 border-dashed text-center">
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">บทเรียนนี้ยังไม่มีข้อสอบ</p>
                        </div>
                    ) : (
                        <div className="bg-white p-8 rounded-[32px] border border-indigo-50 shadow-sm space-y-8">
                            {questions.map((q, idx) => (
                                <div key={q.id} className="space-y-4 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                    <h3 className="font-bold text-lg text-slate-800 flex gap-3">
                                        <span className="text-indigo-600">{idx + 1}.</span> 
                                        <span>{q.text}</span>
                                    </h3>
                                    <div className="space-y-3 pl-8">
                                        {q.options.map((opt: string, optIdx: number) => (
                                            <label key={optIdx} className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${answers[q.id] === optIdx ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-700'}`}>
                                                <input
                                                    type="radio"
                                                    name={q.id}
                                                    value={optIdx}
                                                    checked={answers[q.id] === optIdx}
                                                    onChange={() => setAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                                                    className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-600"
                                                />
                                                <span className="text-sm">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="pt-8 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={submitQuiz}
                                    disabled={Object.keys(answers).length < questions.length || isSubmitting}
                                    className="bg-indigo-600 text-white px-10 py-4 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-md shadow-indigo-200 text-lg"
                                >
                                    ส่งคำตอบ
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
