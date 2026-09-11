import React from 'react';
import OriginalContent from '@theme-original/DocItem/Content';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import DocReadingContext from '@site/src/components/DocReadingContext';
export default function Content(props) {
  const { frontMatter } = useDoc();
  return (
    <OriginalContent {...props}>
      {!frontMatter.landing && <DocReadingContext position="header" />}
      {props.children}
      {!frontMatter.landing && <DocReadingContext position="footer" />}
    </OriginalContent>
  );
}
