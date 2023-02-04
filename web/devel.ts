import ServerImpl from "../src/server/server-impl";

const CAT_FACTS = [
  { fact: "The cat who holds the record for the longest non-fatal fall is Andy. He fell from the 16th floor of an apartment building (about 200 ft/.06 km) and survived." },
  { fact: "Kittens remain with their mother till the age of 9 weeks." },
  { fact: "Cats can be right-pawed or left-pawed." }
];

new ServerImpl({
  port: 3002,
  rootPath: process.cwd() + '/docroot',
  trustProxy: false,
  assumeHttps: false,
  clientJsFilePath: '../dist/client.js',
  pageLimit: {
    windowMs: 5000,
    maxRequests: 50
  },
  init: (_, app) => {
    app.get('/cat-facts', (req, res, next) => {
      const i = Math.floor(Math.random() * CAT_FACTS.length);
      const fact = CAT_FACTS[i];
			res.header("Content-Type",'application/json');
      res.send(JSON.stringify(fact));
    });
  }
});
