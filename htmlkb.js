'use strict';

const {promisify} = require('util');
const fs = require('fs');
const readFileAsync = promisify(fs.readFile);
const {minify} = require('html-minifier');
const cssnano = require('cssnano');
const Svgo = require('svgo');
const uglifyJs = require('uglify-es');

const constant = {
  encoding: 'utf-8',
};

async function main(source) {
  const html = await readFileAsync(source, constant.encoding);
  const [svgPaths, cssPaths, jsPaths] = extractPaths({
    fromFile: html,
    extensions: ['svg', 'css', 'js'],
  });
  let [
    compressedHtml,
    compressedCss,
    compressedJs,
    compressedSvg,
  ] = await compressFiles(html, cssPaths, jsPaths, svgPaths);

  compressedHtml = injectCompressedFiles(compressedHtml, compressedJs, jsPaths);
  compressedHtml = injectCompressedFiles(
    compressedHtml,
    compressedCss,
    cssPaths,
  );
  compressedHtml = injectCompressedFiles(
    compressedHtml,
    compressedSvg,
    svgPaths,
  );

  const dest = source.split('/')[1];
  fs.writeFile(`dist/${dest}`, compressedHtml, () => {
    const f = fs.statSync(`dist/${dest}`);
    console.log('SIZE: ', (f['size'] / 1000).toFixed(2), 'K');
  });
}

async function compressFiles(html, cssPaths, jsPaths, svgPaths) {
  return Promise.all([
    compressHtml(html),
    compressor(cssPaths, compressCss),
    compressor(jsPaths, compressJs),
    compressor(svgPaths, compressSvg),
  ]);
}

function extractPaths({fromFile, extensions}) {
  let paths = [];
  for (let extension of extensions) {
    paths.push(
      fromFile.match(
        new RegExp(`(?<=<!-- )[\\w\\/]*.${extension}(?= -->)`, 'gm'),
      ) || [],
    );
  }
  return paths;
}

function compressor(paths, squidge) {
  return Promise.all(paths.map(path => squidge(path)));
}

async function compressHtml(htmlFile) {
  return minify(htmlFile, {collapseWhitespace: true});
}

async function compressCss(path) {
  const cssFile = await readFileAsync(path, constant.encoding);
  return cssnano.process(cssFile, {}).then(e => e.css);
}

async function compressJs(path) {
  const jsFile = await readFileAsync(path, constant.encoding);
  return uglifyJs.minify(jsFile).code;
}

async function compressSvg(path) {
  const svgFile = await readFileAsync(path, constant.encoding);
  const svgo = new Svgo();
  return svgo.optimize(svgFile, {path: path}).then(e => e.data);
}

function injectCompressedFiles(html, compressedFiles, pathFiles) {
  for (let i = 0; i < pathFiles.length; i++) {
    html = html.replace(
      new RegExp(`<!-- ${pathFiles[i]} -->`),
      compressedFiles[i],
    );
  }

  return html;
}

main(process.argv[2]);
