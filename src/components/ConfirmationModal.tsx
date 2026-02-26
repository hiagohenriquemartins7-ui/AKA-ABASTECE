import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Sim, excluir',
  cancelText = 'Cancelar',
  type = 'danger'
}: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                type === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
              }`}>
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">{title}</h3>
              <p className="text-stone-500 text-sm mb-8">{message}</p>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={onConfirm}
                  className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg ${
                    type === 'danger' 
                      ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-600/20' 
                      : 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-600/20'
                  }`}
                >
                  {confirmText}
                </button>
                <button
                  onClick={onCancel}
                  className="w-full py-3 rounded-xl font-bold text-stone-600 hover:bg-stone-100 transition-all"
                >
                  {cancelText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
