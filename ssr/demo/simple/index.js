/**
 * Copyright 2017 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const glob = require('glob');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

const ampSSR = require('../../index.js');

// Transformers are easy to implement and integrate
class CustomTransformer {
  transform(tree, params) {
    const html = tree.root.firstChildByTag('html');
    if (!html) return;
    const head = html.firstChildByTag('head');
    if (!head) return;

    const desc = tree.createElement('meta', {
      name: 'description',
      content: 'this is just a demo'
    });

    head.appendChild(desc);
  }
}

// Configure the transformers to be used.
// otherwise a default configuration is used.
ampSSR.setConfig({
  transformers: [
    new CustomTransformer(),
    'AddAmpLink',
    'ServerSideRendering',
    'RemoveAmpAttribute',
    // needs to run after ServerSideRendering
    'AmpBoilerplateTransformer',
    // needs to run after ServerSideRendering
    'ReorderHeadTransformer',
    // needs to run after ReorderHeadTransformer
    'RewriteAmpUrls'
  ]
});

const SRC_DIR = 'src';
const DIST_DIR = 'dist';

// Collect all files in the src dir.
glob('/**/*.html', {root: SRC_DIR, nomount: true}, (err, files) => {
  if (err) { throw err; }
  files.forEach(copyAndTransform);
});

// Copy original and transformed AMP file into the dist dir.
function copyAndTransform(file) {
  fs.readFile(path.join(SRC_DIR, file), 'utf8', (err, originalHtml) => {
    if (err) { throw err; }
    const ampFile = file.substring(1, file.length)
      .replace('.html', '.amp.html');
    // The transformer needs the path to the original AMP document
    // to correctly setup AMP to canonical linking
    const ssrHtml = ampSSR.transformHtml(originalHtml, {
      ampUrl: ampFile
    });
    // We change the path of the original AMP file to match the new 
    // amphtml link and make the canonical link point to the transformed version.
    writeFile(ampFile, originalHtml);
    writeFile(file, ssrHtml);
  });
}

function writeFile(filePath, content) {
  filePath = path.join(DIST_DIR, filePath);
  mkdirp(path.dirname(filePath), err => {
    if (err) { throw err; }
    fs.writeFile(filePath, content, err => {
      if (err) { throw err; }
    });
  });
}



