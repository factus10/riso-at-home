// The project lives under ~/Documents, which iCloud Drive syncs. The sync
// daemon stamps extended attributes (com.apple.FinderInfo, etc.) onto
// freshly-written build output, which codesign refuses to sign over. Strip
// them right after packaging and before electron-builder signs the app.
const { execFileSync } = require('child_process');

exports.default = async function afterPack(context) {
  execFileSync('xattr', ['-cr', context.appOutDir]);
};
