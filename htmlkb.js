'use strict';

const {promisify} = require('util');
const fs = require('fs');
const readFileAsync = promisify(fs.readFile);
const {minify} = require('html-minifier');
const cssnano = require('cssnano');
const Svgo = require('svgo');
const uglifyJs = require("uglify-js");

const constant = {
  encoding: 'utf-8',
};

let initialSize = 0

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

  const splittedPath = source.split('/');
  const dest = splittedPath[splittedPath.length - 1];
  fs.writeFile(`dist/${dest}`, compressedHtml, () => {
    console.log(`Compressed form ${initialSize}KB to ${fileSize(compressedHtml)}KB `)
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
  initialSize += fileSize(htmlFile);
  const html = minify(htmlFile, {collapseWhitespace: true});
  return html
}

async function compressCss(path) {
  const cssFile = await readFileAsync(path, constant.encoding);
  initialSize += fileSize(cssFile);
  return cssnano.process(cssFile, {}).then(e => {
    return e.css;
  });
}

async function compressJs(path) {
  const jsFile = await readFileAsync(path, constant.encoding);
  initialSize += fileSize(jsFile);
  return uglifyJs.minify(jsFile);
}

async function compressSvg(path) {
  const svgFile = await readFileAsync(path, constant.encoding);
  initialSize += fileSize(svgFile);
  const svgo = new Svgo();
  return svgo.optimize(svgFile, {path: path}).then(e => e.data);
}

function fileSize(file) {
  return Number((file.length / 1000).toFixed(2));
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
