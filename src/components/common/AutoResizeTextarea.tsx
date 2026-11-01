import React, { useEffect, useRef } from 'react';

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  minHeight?: number;
}

export const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({
  value,
  minHeight = 28,
  className = '',
  onChange,
  onInput,
  ...props
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`;
  };

  useEffect(() => {
    resize();
  }, [value]);

  // Handle window resizing or orientation change
  useEffect(() => {
    const handleResize = () => resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onInput={(e) => {
        resize();
        onInput?.(e);
      }}
      className={`overflow-hidden resize-y ${className}`}
      style={{ minHeight: `${minHeight}px`, fieldSizing: 'content' as any }}
      {...props}
    />
  );
};
