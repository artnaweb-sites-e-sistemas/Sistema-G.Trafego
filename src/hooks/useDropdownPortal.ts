import { useState, useEffect, useRef, useCallback } from 'react';
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
  const updatePositionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const updatePosition = useCallback(() => {
    const triggerElement = triggerRef.current;
    if (!triggerElement) return;

    const rect = triggerElement.getBoundingClientRect();
    setPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, [triggerRef]);

  // Store the update function in a ref to avoid recreating it
  updatePositionRef.current = updatePosition;

  useEffect(() => {
    if (!isOpen || !triggerRef.current || !mounted) return;

    // Initial position update
    updatePosition();

    // Throttled event listeners to improve performance
    let resizeTimeout: number;
    let scrollTimeout: number;

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        if (updatePositionRef.current) {
          updatePositionRef.current();
        }
      }, 16); // ~60fps
    };

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        if (updatePositionRef.current) {
          updatePositionRef.current();
        }
      }, 16); // ~60fps
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(resizeTimeout);
      clearTimeout(scrollTimeout);
    };
  }, [isOpen, triggerRef, mounted, updatePosition]);

  const renderDropdown = useCallback((children: React.ReactNode) => {
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
  }, [mounted, isOpen, position]);

  return { renderDropdown, position };
}; 