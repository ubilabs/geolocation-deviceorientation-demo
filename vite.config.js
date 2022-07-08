import path from 'path';

const rootDir = path.resolve(__dirname);

export default {
  base: './',
  envDir: rootDir,
  envPrefix: ['GOOGLE_MAPS', 'VITE'],
  resolve: {
    alias: {'~': rootDir}
  }
};
