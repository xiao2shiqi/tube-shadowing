import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  onDone: () => void;
}

export default function Toast({ message, onDone }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 200);
    }, 1500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-hovered border border-line-strong text-sm text-ink rounded-md shadow-lg transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {message}
    </div>
  );
}
