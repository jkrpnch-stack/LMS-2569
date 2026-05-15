/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { useAuthStore } from './store/authStore';

import { Login } from './pages/Login';
import { RoleSelection } from './pages/RoleSelection';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentCourse } from './pages/StudentCourse';
import { StudentLesson } from './pages/StudentLesson';
import { TeacherCourse } from './pages/TeacherCourse';
import { Leaderboard } from './pages/Leaderboard';
import { Layout } from './components/Layout';

export default function App() {
  const { user, profile, loading, setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile({ id: docSnap.id, ...docSnap.data() } as any);
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setProfile, setLoading]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        
        {/* Protected Routes */}
        <Route path="/" element={
           !user ? <Navigate to="/login" /> :
           (!profile ? <Navigate to="/role-selection" /> : 
            (profile.role === 'teacher' ? <Navigate to="/teacher" /> : <Navigate to="/student" />))
        } />
        
        <Route path="/role-selection" element={!user ? <Navigate to="/login" /> : (profile ? <Navigate to="/" /> : <RoleSelection />)} />

        <Route element={<Layout />}>
          <Route path="/teacher" element={profile?.role === 'teacher' ? <TeacherDashboard /> : <Navigate to="/" />} />
          <Route path="/teacher/course/:courseId" element={profile?.role === 'teacher' ? <TeacherCourse /> : <Navigate to="/" />} />
          
          <Route path="/student" element={profile?.role === 'student' ? <StudentDashboard /> : <Navigate to="/" />} />
          <Route path="/student/course/:courseId" element={profile?.role === 'student' ? <StudentCourse /> : <Navigate to="/" />} />
          <Route path="/student/lesson/:lessonId" element={profile?.role === 'student' ? <StudentLesson /> : <Navigate to="/" />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
