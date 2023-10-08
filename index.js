#!/usr/bin/env node
/**
 * Copyright (c) 2023 Jonathan Hale
 *
 * MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files
 * (the "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
/**
 * Script to publish to HeyVR.
 *
 * API documentation here:
 * https://docs.heyvr.io/en/developer-area/publish-a-game#h-2-upload-via-api
 */

import axios from 'axios';
import FormData from 'form-data';
import archiver from 'archiver';
import fs from 'node:fs';
import stream from 'stream';
import { parseArgs } from 'node:util';

function zipDeployFolder(path) {
    const archive = archiver.create('zip', {
        zlib: { level: 9 }
    });

    const output = new stream.PassThrough();

    const promise = new Promise((res, rej) => {
        const buffers = [];
        archive.pipe(output);

        /* Add contents of given path, deploy or public */
        archive.directory(path, false);
        archive.on('error', rej);

        output.on('data', (d) => {
            buffers.push(d);
        });
        output.on('end', () => {
            res(Buffer.concat(buffers));
        });

        archive.finalize();
    });

    return promise;
}

function printUsage() {
    console.log("");
    console.log("# Usage");
    console.log("heyvr --version <version> --gameId <gameId>");
    console.log("");
    console.log("version  x.y.z, converted into 'minor'/'major'/'patch'.");
    console.log("gameId   Game ID for heyVR.");
    console.log("path     Path to the game, index.html required at root.");
    console.log("         Default deploy/ or public/.");
    console.log("");
    console.log("The command expects 'HEYVR_ACCESS_TOKEN' environment");
    console.log("variable for authentication.");
}

async function main() {
    const options = {
        'version': { type: 'string' },
        'path': { type: 'string' },
        'gameId': { type: 'string' },
        'sdkVersion': { type: 'string' },
    };
    const args = parseArgs({ options });

    const errors = new Array();
    if(!args.values.version) {
        errors.push("Missing 'version' argument.");
    }
    if(!args.values.gameId) {
        errors.push("Missing 'gameId' argument.");
    }

    const path = args.values.path || (fs.existsSync('deploy') && 'deploy')
        || (fs.existsSync('public') && 'public');
    if(!path) {
        errors.push("No such path: deploy/ or public/\nPass a path via --path argument.");
    } else if(!fs.existsSync(path)) {
        errors.push("Provided path " + path + " does not exist.");
    } else if(!fs.existsSync(path + "/index.html")) {
        errors.push("Provided path " + path + " does not contain an index.html.");
    }

    const accessToken = process.env.HEYVR_ACCESS_TOKEN;
    if(!accessToken) {
        errors.push("'HEYVR_ACCESS_TOKEN' environment variable not set.");
    }

    if(errors.length != 0) {
        console.error("Found " + errors.length + " errors:");
        for(const e of errors) {
            console.error("✘ " + e);
        }
        printUsage();
        process.exit(1);
    }

    let version = 'patch';
    if(process.argv[2].endsWith('.0.0')) {
        version = 'major';
    } else if(process.argv[2].endsWith('.0')) {
        version = 'minor';
    }

    const gameFile = await zipDeployFolder(path).catch(console.error);
    console.log('Publishing', version, `version (${gameFile.length/1000} kB)`);

    const gameId = args.values.gameId;
    const buildData = new FormData();
    buildData.append( 'game_slug', gameId );
    buildData.append( 'game_file', gameFile, 'game.zip' );
    buildData.append( 'version', version );
    buildData.append( 'sdk_version', Number.parseInt(args.values.sdkVersion || 1) );

    console.log(`Publishing ${version} version of ${gameId} to HeyVR.`);
    axios({
        method: 'post',
        url: 'https://heyvr.io/api/developer/game/upload-build',
        data: buildData,
        headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + accessToken,
        },
        onUploadProgress: (e) => {
            console.log('Upload progress:', 100*e.progress.toFixed(2), '%');
        }
    })
        .then(res => {
            if(res.status === 200) {
                console.log('Done.');
            } else {
                console.log('Upload failed with code', res.status);
                console.log(res.data)
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Request failed with error:');
            console.error(error.toString(), `(${error.response?.statusText})`);
            console.log(error.response.data);
            process.exit(1);
        })
}
main();
