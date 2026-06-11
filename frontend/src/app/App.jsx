import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Home from '../pages/Home';
import CreateSession from '../pages/CreateSession';
import JoinSession from '../pages/JoinSession';
import SessionRoom from '../pages/SessionRoom';
import ExpiredSession from '../pages/ExpiredSession';
import ErrorBoundary from '../components/ErrorBoundary';
import Header from '../components/Header';
import ToastContainer from '../components/Toast';
import useUiStore from '../store/uiStore';

export default function App() {
  const darkMode = useUiStore((s) => s.darkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<CreateSession />} />
              <Route path="/join" element={<JoinSession />} />
              <Route path="/session/:sessionId" element={<SessionRoom />} />
              <Route path="/expired" element={<ExpiredSession />} />
            </Routes>
          </main>
        </div>
        <ToastContainer />
      </BrowserRouter>
    </ErrorBoundary>
  );
}