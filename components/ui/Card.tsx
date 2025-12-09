
import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  className?: string;
};

const Card: React.FC<CardProps> = ({ children, className = '', ...rest }) => {
  return (
    <div
      {...rest}
      className={`bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 p-6 transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
