import React from 'react';
import OriginalMenu from '@theme-original/Navbar/MobileSidebar/PrimaryMenu';
import { useNavbarMobileSidebar } from '@docusaurus/theme-common/internal';
import { translate } from '@docusaurus/Translate';
export default function PrimaryMenu(props) {
  const sidebar = useNavbarMobileSidebar();
  return (
    <>
      <OriginalMenu {...props} />
      <button
        type="button"
        className="menu__link hh-mobile-search"
        onClick={() => {
          sidebar.toggle();
          window.dispatchEvent(new Event('hohoo-search'));
        }}>
        {translate({ id: 'ui.f04090805c', message: '搜索' })} →
      </button>
    </>
  );
}
