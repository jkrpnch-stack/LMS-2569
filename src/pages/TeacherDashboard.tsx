import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { Plus, BookOpen, Settings, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TeacherDashboard() {
    const { profile } = useAuthStore();
    const navigate = useNavigate();
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newCourseTitle, setNewCourseTitle] = useState('');
    const [newCourseDesc, setNewCourseDesc] = useState('');

    useEffect(() => {
        if (!profile?.id) return;
        
        const q = query(collection(db, 'courses'), where('teacherId', '==', profile.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const courseData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCourses(courseData);
            setLoading(false);
        }, (error) => {
            handleFirestoreError(error, OperationType.LIST, 'courses');
        });

        return () => unsubscribe();
    }, [profile]);

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id || !newCourseTitle) return;

        const courseId = `course-${Date.now()}`;
        try {
            await setDoc(doc(db, 'courses', courseId), {
                title: newCourseTitle,
                description: newCourseDesc,
                teacherId: profile.id,
                isPublished: false,
                createdAt: Date.now()
            });
            setShowCreate(false);
            setNewCourseTitle('');
            setNewCourseDesc('');
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'courses');
        }
    };

    const handleDeleteCourse = async (courseId: string) => {
        if (!window.confirm("ต้องการลบวิชานี้ใช่หรือไม่?")) return;
        try {
            await deleteDoc(doc(db, 'courses', courseId));
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `courses/${courseId}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-indigo-900">แผงควบคุมคุณครู</h1>
                    <div className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full inline-block mt-2">Active Courses</div>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition"
                >
                    <Plus className="h-5 w-5" />
                    <span>เพิ่มวิชาใหม่</span>
                </button>
            </div>

            {showCreate && (
                <div className="bg-white rounded-[32px] p-8 shadow-sm border border-indigo-50 mb-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">สร้างวิชาใหม่</h3>
                    <form onSubmit={handleCreateCourse} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อวิชา</label>
                            <input
                                type="text"
                                required
                                value={newCourseTitle}
                                onChange={(e) => setNewCourseTitle(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder="เช่น Mathematics M.3"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">คำอธิบาย</label>
                            <textarea
                                value={newCourseDesc}
                                onChange={(e) => setNewCourseDesc(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder="รายละเอียดรายวิชาเบื้องต้น..."
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-3 justify-end mt-6">
                            <button type="button" onClick={() => setShowCreate(false)} className="px-5 py-2.5 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl">ยกเลิก</button>
                            <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">บันทึก</button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div>กำลังโหลดข้อมูล...</div>
            ) : courses.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-[32px] border border-dashed border-indigo-200 shadow-sm border-indigo-50">
                    <BookOpen className="mx-auto h-12 w-12 text-indigo-300" />
                    <h3 className="mt-4 text-sm font-bold text-indigo-900">ยังไม่มีวิชาเรียน</h3>
                    <p className="mt-1 text-sm text-slate-500">เริ่มต้นสร้างวิชาเรียนแรกของคุณเลย</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course, idx) => {
                        const gradients = [
                            'from-indigo-50 to-blue-50 border-indigo-100',
                            'from-emerald-50 to-teal-50 border-emerald-100',
                            'from-amber-50 to-orange-50 border-amber-100',
                            'from-pink-50 to-rose-50 border-pink-100',
                        ];
                        const textColors = ['text-indigo-900', 'text-emerald-900', 'text-amber-900', 'text-pink-900'];
                        const gIdx = idx % gradients.length;
                        return (
                        <div key={course.id} className={`rounded-[24px] bg-gradient-to-br ${gradients[gIdx]} border p-6 flex flex-col hover:shadow-md transition-shadow`}>
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-3xl">📚</span>
                                <span className={`px-2 py-1 text-[10px] font-bold rounded-lg border bg-white ${course.isPublished ? 'text-emerald-600 border-emerald-100' : 'text-slate-400 border-slate-200'}`}>
                                    {course.isPublished ? 'PUBLISHED' : 'DRAFT'}
                                </span>
                            </div>
                            <h4 className={`font-bold text-lg mb-1 ${textColors[gIdx]} hover:underline cursor-pointer`} onClick={() => navigate(`/teacher/course/${course.id}`)}>
                                {course.title}
                            </h4>
                            <p className="text-xs text-slate-500 mb-6 flex-1 line-clamp-2">{course.description || '-'}</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => navigate(`/teacher/course/${course.id}`)}
                                    className="flex-1 py-2 bg-white/60 hover:bg-white rounded-xl text-sm font-bold text-slate-700 border border-white/50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Settings className="h-4 w-4" /> จัดการ
                                </button>
                                <button
                                    onClick={() => handleDeleteCourse(course.id)}
                                    className="p-2 bg-white/60 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl border border-white/50 transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )})}
                </div>
            )}
        </div>
    );
}
