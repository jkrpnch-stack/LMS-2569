import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { ArrowLeft, Plus, FileText, HelpCircle, Trash2, Settings } from 'lucide-react';

export function TeacherCourse() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState<any>(null);
    const [lessons, setLessons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateLesson, setShowCreateLesson] = useState(false);
    
    // Manage questions state
    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [showCreateQuestion, setShowCreateQuestion] = useState(false);
    const [qText, setQText] = useState('');
    const [qOptions, setQOptions] = useState(['', '', '', '']);
    const [qCorrect, setQCorrect] = useState(0);
    const [lessonType, setLessonType] = useState<'content' | 'quiz'>('content');
    const [lessonTitle, setLessonTitle] = useState('');
    const [lessonContent, setLessonContent] = useState('');

    useEffect(() => {
        if (!courseId) return;

        // Fetch course details
        const fetchCourse = async () => {
            try {
                const docRef = doc(db, 'courses', courseId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setCourse({ id: docSnap.id, ...docSnap.data() });
                }
            } catch (error) {
                handleFirestoreError(error, OperationType.GET, `courses/${courseId}`);
            }
        };
        fetchCourse();

        // Listen to lessons
        const q = query(collection(db, 'lessons'), where('courseId', '==', courseId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lessonData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Manual sort locally since we don't have a composite index defined in rules setup for 'where + orderBy'
            lessonData.sort((a: any, b: any) => a.order - b.order);
            setLessons(lessonData);
            setLoading(false);
        }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'lessons');
        });

        return () => unsubscribe();
    }, [courseId]);

    // Listen to questions when a quiz is selected
    useEffect(() => {
        if (!selectedQuizId) return;
        const q = query(collection(db, 'questions'), where('lessonId', '==', selectedQuizId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [selectedQuizId]);

    const handleCreateLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!courseId || !lessonTitle) return;

        const newLessonId = `lesson-${Date.now()}`;
        try {
            await setDoc(doc(db, 'lessons', newLessonId), {
                courseId,
                title: lessonTitle,
                content: lessonContent || '',
                type: lessonType,
                order: lessons.length + 1,
                createdAt: Date.now()
            });
            setShowCreateLesson(false);
            setLessonTitle('');
            setLessonContent('');
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'lessons');
        }
    };

    const handleDeleteLesson = async (lessonId: string) => {
        if (!window.confirm("ต้องการลบบทเรียนนี้ใช่หรือไม่?")) return;
        try {
            await deleteDoc(doc(db, 'lessons', lessonId));
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `lessons/${lessonId}`);
        }
    };

    const togglePublish = async () => {
        if (!course) return;
        try {
            await updateDoc(doc(db, 'courses', course.id), {
                isPublished: !course.isPublished
            });
            setCourse({ ...course, isPublished: !course.isPublished });
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `courses/${course.id}`);
        }
    };

    const handleCreateQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedQuizId || !qText) return;
        try {
            const newQId = `q-${Date.now()}`;
            await setDoc(doc(db, 'questions', newQId), {
                lessonId: selectedQuizId,
                text: qText,
                options: qOptions,
                correctOptionIndex: qCorrect
            });
            setShowCreateQuestion(false);
            setQText('');
            setQOptions(['', '', '', '']);
            setQCorrect(0);
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'questions');
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!course) return <div>Course not found</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
                <button onClick={() => navigate('/teacher')} className="p-2.5 bg-white border border-indigo-100 hover:bg-indigo-50 rounded-xl transition text-indigo-600 shadow-sm">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-indigo-900">{course.title}</h1>
                        <span className={`px-3 py-1 text-[10px] font-bold rounded-lg border bg-white ${course.isPublished ? 'text-emerald-600 border-emerald-100' : 'text-slate-400 border-slate-200'}`}>
                            {course.isPublished ? 'PUBLISHED' : 'DRAFT'}
                        </span>
                    </div>
                </div>
                <button
                    onClick={togglePublish}
                    className="px-5 py-2.5 border-2 border-indigo-100 bg-white rounded-xl hover:bg-indigo-50 font-bold text-sm text-indigo-700 transition"
                >
                    {course.isPublished ? 'เลิกเผยแพร่' : 'ตั้งเผยแพร่'}
                </button>
            </div>

            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-indigo-50 mb-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">จัดการบทเรียน</h3>
                        <p className="text-sm text-slate-500">ทั้งหมด {lessons.length} บทเรียน</p>
                    </div>
                    <button
                        onClick={() => setShowCreateLesson(true)}
                        className="flex items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2.5 rounded-xl font-bold text-sm transition"
                    >
                        <Plus className="h-5 w-5" />
                        เพิ่มบทเรียน
                    </button>
                </div>

            {showCreateLesson && (
                <div className="bg-indigo-50/50 p-6 rounded-[24px] border border-indigo-100 mb-6">
                    <h3 className="text-md font-bold text-indigo-900 mb-4">สร้างบทเรียนใหม่</h3>
                    <form onSubmit={handleCreateLesson} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ประเภท</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300">
                                    <input type="radio" value="content" checked={lessonType === 'content'} onChange={() => setLessonType('content')} className="text-indigo-600" />
                                    <span className="font-bold text-sm text-slate-700">📄 เนื้อหา (Lesson)</span>
                                </label>
                                <label className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300">
                                    <input type="radio" value="quiz" checked={lessonType === 'quiz'} onChange={() => setLessonType('quiz')} className="text-indigo-600" />
                                    <span className="font-bold text-sm text-slate-700">📝 แบบทดสอบ (Quiz)</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อบทเรียน/แบบทดสอบ</label>
                            <input
                                type="text"
                                required
                                value={lessonTitle}
                                onChange={(e) => setLessonTitle(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none block"
                            />
                        </div>
                        {lessonType === 'content' && (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">เนื้อหา (รองรับข้อความ)</label>
                                <textarea
                                    required
                                    value={lessonContent}
                                    onChange={(e) => setLessonContent(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none h-32 block"
                                />
                            </div>
                        )}
                        <div className="flex gap-3 justify-end pt-2">
                            <button type="button" onClick={() => setShowCreateLesson(false)} className="px-5 py-2.5 text-slate-600 font-bold bg-white border border-slate-200 hover:bg-slate-50 rounded-xl">ยกเลิก</button>
                            <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">บันทึกบทเรียน</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-3">
                {lessons.map((lesson, index) => (
                    <div key={lesson.id}>
                        <div className="flex items-center p-4 bg-white hover:bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all group">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${lesson.type === 'quiz' ? 'bg-amber-100 text-amber-600' : 'bg-pink-100 text-pink-600'}`}>
                                {lesson.type === 'quiz' ? '📝' : '📄'}
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-sm text-slate-800">ตอนที่ {index + 1}: {lesson.title}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lesson.type}</p>
                            </div>
                        <div className="flex items-center gap-2">
                            {lesson.type === 'quiz' && (
                                <button onClick={() => setSelectedQuizId(selectedQuizId === lesson.id ? null : lesson.id)} className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs rounded-xl transition">
                                    จัดการข้อสอบ
                                </button>
                            )}
                            <button onClick={() => handleDeleteLesson(lesson.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition opacity-0 group-hover:opacity-100">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    {selectedQuizId === lesson.id && (
                        <div className="bg-slate-50 border border-slate-100 border-t-0 -mt-4 pt-8 p-6 rounded-b-3xl mb-4 ml-6 mr-6">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="font-bold text-slate-800 text-sm">ข้อสอบทั้งหมด ({questions.length})</h4>
                                <button onClick={() => setShowCreateQuestion(true)} className="text-xs px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100">เพิ่มข้อสอบ</button>
                            </div>
                            
                            {showCreateQuestion && (
                                <form onSubmit={handleCreateQuestion} className="bg-white p-6 border border-indigo-100 rounded-2xl shadow-sm mb-6 space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-2">คำถาม</label>
                                        <input required value={qText} onChange={(e) => setQText(e.target.value)} className="w-full border border-slate-200 px-3 py-2 text-sm rounded-xl focus:border-indigo-500 outline-none block" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="block text-xs font-bold text-slate-700">ตัวเลือก (เลือกข้อที่ถูกด้านหน้า)</label>
                                        {qOptions.map((opt, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <input type="radio" required checked={qCorrect === i} onChange={() => setQCorrect(i)} name="correctOpt" className="w-4 h-4 text-indigo-600" />
                                                <input required value={opt} onChange={(e) => {
                                                    const newOpts = [...qOptions];
                                                    newOpts[i] = e.target.value;
                                                    setQOptions(newOpts);
                                                }} className="w-full border border-slate-200 px-3 py-2 text-sm rounded-xl focus:border-indigo-500 outline-none block" placeholder={`ตัวเลือกที่ ${i+1}`} />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 justify-end pt-4">
                                        <button type="button" onClick={() => setShowCreateQuestion(false)} className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold rounded-xl">ยกเลิก</button>
                                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold rounded-xl">บันทึกข้อสอบ</button>
                                    </div>
                                </form>
                            )}

                            <div className="space-y-3">
                                {questions.map((q, idx) => (
                                    <div key={q.id} className="bg-white p-4 border border-slate-100 rounded-2xl">
                                        <p className="font-bold text-sm text-slate-800 mb-3">{idx+1}. {q.text}</p>
                                        <ul className="space-y-2">
                                            {q.options.map((opt: string, i: number) => (
                                                <li key={i} className={`text-xs p-2.5 px-3 rounded-xl flex items-center gap-2 ${i === q.correctOptionIndex ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-100' : 'text-slate-600 bg-slate-50'}`}>
                                                    {i === q.correctOptionIndex ? <span className="text-emerald-500">✓</span> : <span className="w-3 h-3 rounded-full border border-slate-300 inline-block"></span>}
                                                    {opt}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                                {questions.length === 0 && !showCreateQuestion && (
                                    <div className="text-center py-6 text-slate-400 text-xs font-bold uppercase tracking-wider">ยังไม่มีข้อสอบ</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ))}
            {lessons.length === 0 && !showCreateLesson && (
                    <div className="text-center py-8 text-slate-400 text-sm font-bold border-2 border-dashed border-indigo-100 rounded-2xl cursor-default">
                        ยังไม่มีบทเรียน กดปุ่มเพิ่มบทเรียนเพื่อเริ่มต้น
                    </div>
                )}
            </div>
        </div>
        </div>
    );
}
