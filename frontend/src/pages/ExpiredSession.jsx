import React from 'react';
import { Link } from 'react-router-dom';

export default function ExpiredSession() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h2 className="text-2xl font-semibold mb-2">Session Expired</h2>
      <p className="text-gray-500 mb-4">This session is no longer active.</p>
      <Link to="/" className="text-blue-600 underline">
        Create a new session
      </Link>
    </div>
  );
}