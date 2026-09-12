import React from 'react';
import { ParticleProvider } from '@site/src/components/ParticleField';

export default function Root({ children }) {
  return <ParticleProvider>{children}</ParticleProvider>;
}
