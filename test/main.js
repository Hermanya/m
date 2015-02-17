function pathToModule (path) {
  return path;//.replace(/^\/base\//, '').replace(/\.js$/, '');
}

function isTestFile (file) {
  return /test-.+\.js$/i.test(file);
}
var allTestFiles = Object.keys(window.__karma__.files).filter(isTestFile).map(pathToModule);
var nodeModules = '../node_modules';

require.config({
  baseUrl: '/base/src',
  paths: {
    jquery: nodeModules + '/jquery/dist/jquery',
    underscore: nodeModules + '/underscore/underscore',
    backbone: nodeModules + '/backbone/backbone'
  },
  // dynamically load all test files
  deps: allTestFiles,


  // we have to kickoff jasmine, as it is asynchronous
  callback: window.__karma__.start
});
