#!/usr/bin/env node

import { Command } from 'commander';
import { Server } from "./server";
import path from "path";

const program = new Command();

program
  .name('trillo')
  .description('Trillo CLI - https://trillojs.dev')
  .version('1.0.0');

program.command('serve')
  .description('serve a Trillo project')
  .argument('<pathname>', 'path to docroot')
  .option('-p, --port <number>', 'port number, default: 3000')
  // .option('-l, --live', 'enable auto reload on page changes')
  .action((pathname, options) => {
    const root = path.normalize(path.join(process.cwd(), pathname));
    const port = parseInt(options.port) || 3000;
    // const live = options.live || false;
    new Server({
      port: port,
      rootPath: root,
      trustProxy: false,
      assumeHttps: false,
      pageLimit: {
        windowMs: 5000,
        maxRequests: 50
      },
      liveUpdate: true,
    });
  });

program.parse();
