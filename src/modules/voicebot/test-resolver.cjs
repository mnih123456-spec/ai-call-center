const resolve = require('resolve')

// Natywny resolver Jesta nie laduje sie na tym Windowsie (ERR_DLOPEN_FAILED).
// Node zachowuje exports pakietow, a resolver JS dopelnia rozszerzenia TS.
module.exports = (request, options) => {
  try {
    return require.resolve(request, { paths: [options.basedir] })
  } catch {
    return resolve.sync(request, {
      basedir: options.basedir,
      extensions: options.extensions,
      moduleDirectory: options.moduleDirectory,
      paths: options.paths,
    })
  }
}
