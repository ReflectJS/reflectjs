#!/usr/bin/env node

import { Server } from "./server";

new Server({
  port: 3001,
  rootPath: process.cwd(),
  trustProxy: false,
  assumeHttps: false,
  pageLimit: {
    windowMs: 5000,
    maxRequests: 50
  }
});
