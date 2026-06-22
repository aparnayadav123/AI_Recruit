import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const Unauthorized: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl border-2 border-blue-200/80 max-w-md w-full text-center animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600 mb-6">
                    You do not have permission to view this page. This area is restricted to authorized personnel only.
                </p>
                <Link
                    to="/"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Return to Dashboard
                </Link>
            </div>
        </div>
    );
};

export default Unauthorized;
