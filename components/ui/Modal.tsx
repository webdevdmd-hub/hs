import React from 'react';
import Card from './Card';
import { XIcon } from '../icons/Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'md' }) => {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex items-center justify-center p-4 transition-opacity duration-300"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`relative w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <Card className="flex flex-col max-h-full overflow-hidden">
          <div className="flex justify-between items-center pb-3 border-b border-emerald-200 mb-3 flex-shrink-0">
            <h2 className="text-lg font-semibold text-emerald-800">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:bg-emerald-100 hover:text-slate-600 transition-colors"
              aria-label="Close modal"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-y-auto overflow-x-hidden flex-1">
            {children}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Modal;
