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
        aria-label={en ? 'Blog browsing' : '随笔导航'}>
        <Link to="/blog">{en ? 'Blog' : '随笔'}</Link>
        <Link to="/blog/tags">{en ? 'Tags' : '标签'}</Link>
        <Link to="/blog/archive">{en ? 'Archive' : '归档'}</Link>
      </nav>
      {props.children}
    </OriginalLayout>
  );
}
