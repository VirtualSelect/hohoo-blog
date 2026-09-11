import React, { useEffect } from 'react';
import OriginalSidebar from '@theme-original/Navbar/MobileSidebar';
import { useNavbarMobileSidebar } from '@docusaurus/theme-common/internal';

export default function MobileSidebar(props) {
  const { shown, toggle } = useNavbarMobileSidebar();
  useEffect(() => {
    if (!shown) return undefined;
    const panel = document.querySelector('.navbar-sidebar');
    const trigger = document.querySelector('.navbar__toggle');
    panel?.querySelector('.navbar-sidebar__close')?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        toggle();
      } else if (event.key === 'Tab' && panel) {
        const bounds = panel.getBoundingClientRect();
        const targets = [
          ...panel.querySelectorAll(
            'a[href], button:not(:disabled), [tabindex="0"]',
          ),
        ].filter((node) => {
          const rect = node.getBoundingClientRect();
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.left >= bounds.left &&
            rect.right <= bounds.right &&
            getComputedStyle(node).visibility !== 'hidden'
          );
        });
        const first = targets[0],
          last = targets[targets.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      trigger?.focus();
    };
  }, [shown, toggle]);
  return <OriginalSidebar {...props} />;
}
