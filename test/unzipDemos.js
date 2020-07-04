/* eslint-disable */

/**
 * Unzips any .dem files that are used for tests
 */

const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path')

const demosPath = path.resolve(__dirname, './demos');

const allFilesInDemoFolder = fs.readdirSync(demosPath)

const zippedFilesInfolder = allFilesInDemoFolder.filter(_ => _.endsWith('.zip') && allFilesInDemoFolder.indexOf(_.replace('.zip', '')) === -1);

for (const fileToUnzip of zippedFilesInfolder) {
    const dateStarted = Date.now();
    const pathToUnzip = path.resolve(demosPath, fileToUnzip)
    const zip = new AdmZip(pathToUnzip);

    for (const entry of zip.getEntries()) {
        console.log(`Decompressing ${pathToUnzip}`);
        zip.extractEntryTo(entry.entryName, demosPath);
        console.log(`Finished decompression, took ${Date.now() - dateStarted} ms`);

    }

}