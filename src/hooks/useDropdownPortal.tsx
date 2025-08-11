import React, { useState, useEffect } from 'react';
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
      const viewportWidth = window.innerWidth;
      const horizontalMargin = 8; // margem da viewport
      const verticalOffset = 8; // espaço entre trigger e menu

      // Largura alvo: pelo menos a largura do trigger, permitindo menus mais largos
      const targetWidth = Math.max(rect.width, 360);

      // Clamp para evitar overflow à direita
      let left = rect.left;
      if (left + targetWidth + horizontalMargin > viewportWidth) {
        left = Math.max(horizontalMargin, viewportWidth - targetWidth - horizontalMargin);
      }

      setPosition({
        top: rect.bottom + verticalOffset,
        left,
        width: targetWidth,
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
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
          minWidth: `${position.width}px`,
          maxWidth: 'min(560px, calc(100vw - 16px))',
          zIndex: 2147483647,
          transform: 'translate3d(0, 0, 0)',
        }}
        className="dropdown-portal"
      >
        {/* Backdrop para permitir clique dentro do portal sem fechar */}
        <div className="relative">
          {children}
        </div>
      </div>
    );

    return createPortal(dropdownContent, document.body);
  };

  return { renderDropdown, position };
};


