import React from 'react';
import Card from './Card';
import { XIcon } from '../icons/Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex items-center justify-center p-4 transition-opacity duration-300"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="relative w-full max-w-md"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <Card>
          <div className="flex justify-between items-center pb-3 border-b border-emerald-200 mb-4">
            <h2 className="text-xl font-semibold text-emerald-800">{title}</h2>
            <button 
              onClick={onClose} 
              className="p-1 rounded-full text-slate-400 hover:bg-emerald-100 hover:text-slate-600 transition-colors"
              aria-label="Close modal"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
          {children}
        </Card>
      </div>
    </div>
  );
};

export default Modal;
