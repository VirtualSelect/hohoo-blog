import { translate } from '@docusaurus/Translate';
import React from 'react';
import OriginalLayout from '@theme-original/BlogLayout';
import Link from '@docusaurus/Link';
import { useEnglish } from '@site/src/components/ContentUI';
export default function BlogLayout(props) {
  const en = useEnglish();
  return (
    <OriginalLayout {...props}>
      <nav
        className="hh-blog-tools"
        aria-label={
          en
            ? 'Blog browsing'
            : translate({ id: 'ui.d045120de1', message: '随笔导航' })
        }>
        <Link to="/blog">
          {en ? 'Blog' : translate({ id: 'ui.78da4c85f9', message: '随笔' })}
        </Link>
        <Link to="/blog/tags">
          {en ? 'Tags' : translate({ id: 'ui.ae0a7afece', message: '标签' })}
        </Link>
        <Link to="/blog/archive">
          {en ? 'Archive' : translate({ id: 'ui.ddfde75bec', message: '归档' })}
        </Link>
      </nav>
      {props.children}
    </OriginalLayout>
  );
}
