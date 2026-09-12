import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
/** @type {import('next').NextConfig} */
export default {
  outputFileTracingRoot: path.resolve(root, '../..'),
  poweredByHeader: false,
  webpack(config) {
    config.module.rules.push({ test: /\.(vert|frag|glsl)$/, type: 'asset/source' });
    return config;
  },
};
