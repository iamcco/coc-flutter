/* eslint-disable @typescript-eslint/no-var-requires */
async function start(watch) {
  await require('esbuild').build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    watch,
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV === 'development',
    define: {},
    mainFields: ['module', 'main'],
    external: ['coc.nvim'],
    platform: 'node',
    // keep same node version which coc.nvim support
    target: 'node10.12',
    outfile: 'out/index.js',
    plugins: [],
  });
}

let watch = false;

if (process.argv.length > 2 && process.argv[2] === '--watch') {
  console.log('watching...');
  watch = {
    onRebuild(error) {
      if (error) {
        console.error('watch build failed:', error);
      } else {
        console.log('watch build succeeded');
      }
    },
  };
}

start(watch)
  .then(() => {
    console.log('build succeeded');
  })
  .catch(() => {
    console.error('build failed');
  });
