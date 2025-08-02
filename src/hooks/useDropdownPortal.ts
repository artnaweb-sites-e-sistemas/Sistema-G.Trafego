import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface UseDropdownPortalProps {
  isOpen: boolean;
  triggerRef: React.RefObject<HTMLElement>;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

export const useDropdownPortal = ({ isOpen, triggerRef }: UseDropdownPortalProps) => {
  const [position, setPosition] = useState<DropdownPosition>({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen || !triggerRef.current || !mounted) return;

    const updatePosition = () => {
      const triggerElement = triggerRef.current;
      if (!triggerElement) return;

      const rect = triggerElement.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen, triggerRef, mounted]);

  const renderDropdown = (children: React.ReactNode) => {
    if (!mounted || !isOpen) return null;

    const dropdownContent = (
      <div
        style={{
          position: 'absolute',
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`,
          zIndex: 2147483647,
          transform: 'translate3d(0, 0, 0)',
        }}
        className="dropdown-portal"
      >
        {children}
      </div>
    );

    return createPortal(dropdownContent, document.body);
  };

  return { renderDropdown, position };
}; 