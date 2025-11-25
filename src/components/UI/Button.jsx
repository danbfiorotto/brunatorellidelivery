import React from 'react';

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    };

    return (
        <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
