import React from 'react';
import './globals.css';
import AuthProvider from './components/AuthProvider'; // අලුතින් ගෙනාවා

export const metadata = {
  title: 'AI Prompt Builder',
  description: 'Build optimized prompts and chat in real-time',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 min-h-screen font-sans">
        {/* AuthProvider එකෙන් wrap කරනවා */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}