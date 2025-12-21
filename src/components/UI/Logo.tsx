import React from 'react';

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showText?: boolean;
    textClassName?: string;
}

const sizeMap = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
};

const textSizeMap = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
};

const Logo: React.FC<LogoProps> = ({ 
    className = '', 
    size = 'md', 
    showText = true,
    textClassName = '' 
}) => {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <img 
                src="/logo.png" 
                alt="EndoSystem Logo" 
                className={`${sizeMap[size]} object-contain`}
            />
            {showText && (
                <span className={`font-bold ${textSizeMap[size]} ${textClassName}`}>
                    EndoSystem
                </span>
            )}
        </div>
    );
};

export default Logo;

