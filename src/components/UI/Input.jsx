import React from 'react';

const Input = ({ label, error, className = '', ...props }) => {
    return (
        <div className={`mb-4 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <input
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow ${error ? 'border-red-300 focus:ring-red-200' : 'border-gray-300'
                    }`}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
};

export default Input;
