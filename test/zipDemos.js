/* eslint-disable */

/**
 * Zips any .dem files that are used for tests
 */

const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path')


const demosPath = path.resolve(__dirname, './demos');

const allFilesInDemoFolder = fs.readdirSync(demosPath)

const unzippedFilesInfolder = allFilesInDemoFolder.filter(_ => _.endsWith('.dem') && allFilesInDemoFolder.indexOf(`${_}.zip`) === -1);

for (const demoFile of unzippedFilesInfolder) {
    const dateStarted = Date.now();
    const zip = new AdmZip();
    const demoPath = path.resolve(demosPath, demoFile)
    console.log(`Compressing ${demoPath}`);
    zip.addLocalFile(demoPath);
    zip.writeZip(`${demoPath}.zip`);
    console.log(`Finished compression, took ${Date.now() - dateStarted} ms`);
}


