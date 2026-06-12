'use client';

import React, { createContext, useContext, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface AlertContextType {
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'alert' | 'confirm'>('alert');
  
  const resolverRef = useRef<((value?: any) => void) | null>(null);

  const showAlert = (msg: string): Promise<void> => {
    setMessage(msg);
    setType('alert');
    setIsOpen(true);
    return new Promise<void>((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const showConfirm = (msg: string): Promise<boolean> => {
    setMessage(msg);
    setType('confirm');
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      if (type === 'confirm') {
        resolverRef.current(true);
      } else {
        resolverRef.current();
      }
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(false);
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            onClick={type === 'alert' ? handleConfirm : handleCancel}
          />
          
          {/* Card */}
          <div className="relative w-full max-w-sm rounded-3xl border border-zinc-800/80 bg-zinc-900/90 backdrop-blur-xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-zinc-100 space-y-4">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
            
            <h3 className="text-xs font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent uppercase tracking-wider">
              {type === 'confirm' ? 'Confirmation' : 'Information'}
            </h3>
            
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
              {message}
            </p>
            
            <div className="flex justify-end gap-2 pt-2">
              {type === 'confirm' && (
                <Button 
                  type="button"
                  variant="ghost"
                  onClick={handleCancel}
                  className="h-9 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-xl px-4"
                >
                  Annuler
                </Button>
              )}
              <Button 
                type="button"
                onClick={handleConfirm}
                className="h-9 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-4 font-semibold shadow-md shadow-violet-500/10"
              >
                {type === 'confirm' ? 'Confirmer' : 'D\'accord'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
