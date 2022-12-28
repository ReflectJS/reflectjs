import ServerImpl from "./server/server-impl";

new ServerImpl({
  port: 3001,
  rootPath: process.cwd(),
  trustProxy: false,
  assumeHttps: false,
  pageLimit: {
    windowMs: 5000,
    maxRequests: 50
  }
});
