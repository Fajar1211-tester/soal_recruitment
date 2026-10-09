try {
  if (Number(process.versions.node.split('.')[0]) < 24) {
    throw new Error('Talenta memerlukan Node.js 24 atau lebih baru.');
  }
  require('node:sqlite');
} catch (error) {
  console.error('Runtime belum siap:', error.message);
  process.exit(1);
}
