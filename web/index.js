const ServerImpl = require("../dist/server/server-impl").default;

const CAT_FACTS = [
  { fact: "The cat who holds the record for the longest non-fatal fall is Andy. He fell from the 16th floor of an apartment building (about 200 ft/.06 km) and survived." },
  { fact: "Kittens remain with their mother till the age of 9 weeks." },
  { fact: "Cats can be right-pawed or left-pawed." },
  { fact: "Many cats cannot properly digest cow's milk. Milk and milk products give them diarrhea." },
  { fact: "In Siam, the cat was so revered that one rode in a chariot at the head of a parade celebrating the new king." },
  { fact: "Ancient Egyptian family members shaved their eyebrows in mourning when the family cat died." },
  { fact: "On average, a cat will sleep for 16 hours a day." },
  { fact: "Among many other diseases, cats can suffer from anorexia, senility, feline AIDS and acne." },
  { fact: "A group of cats is called a clowder." },
  { fact: "Abraham Lincoln loved cats. He had four of them while he lived in the White House." },
  { fact: "Normal body temperature for a cat is 102 degrees F." },
  { fact: "Long, muscular hind legs enable snow leopards to leap seven times their own body length in a single bound." },
  { fact: "Researchers are unsure exactly how a cat purrs. Most veterinarians believe that a cat purrs by vibrating vocal folds deep in the throat. To do this, a muscle in the larynx opens and closes the air passage about 25 times per second." },
  { fact: "In just 7 years, one un-spayed female cat and one un-neutered male cat and their offspring can result in 420,000 kittens." },
  { fact: "On average, cats spend 2/3 of every day sleeping. That means a nine-year-old cat has been awake for only three years of its life." },
  { fact: "According to a Gallup poll, most American pet owners obtain their cats by adopting strays." },
  { fact: "A cat’s jaw can’t move sideways, so a cat can’t chew large chunks of food." },
  { fact: "The ancestor of all domestic cats is the African Wild Cat which still exists today." },
  { fact: "Cats have been domesticated for half as long as dogs have been." },
  { fact: "The first official cat show in the UK was organised at Crystal Palace in 1871." },
  { fact: "Most cats adore sardines." },
  { fact: "Julius Ceasar, Henri II, Charles XI, and Napoleon were all afraid of cats." },
  { fact: "Cats are subject to gum disease and to dental caries. They should have their teeth cleaned by the vet or the cat dentist once a year." },
  { fact: "A cat's smell is their strongest sense, and they rely on this leading sense to identify people and objects; a feline's sense of smell is 14x better than a human's." },
  { fact: "In multi-cat households, cats of the opposite sex usually get along better." },
  { fact: "A cat can jump up to five times its own height in a single bound." },
  { fact: "Cats have 3 eyelids." },
  { fact: "A cat’s nose pad is ridged with a unique pattern, just like the fingerprint of a human." },
  { fact: "A cat has two vocal chords, and can make over 100 sounds." },
  { fact: "Grown cats have 30 teeth. Kittens have about 26 temporary teeth, which they lose when they are about 6 months old." },
  { fact: "A steady diet of dog food may cause blindness in your cat - it lacks taurine." },
  { fact: "A cat has more bones than a human being; humans have 206 and the cat has 230 bones." },
  { fact: "Many cats love having their forehead gently stroked." },
  { fact: "Cats are North America’s most popular pets: there are 73 million cats compared to 63 million dogs. Over 30% of households in North America own a cat." },
  { fact: "A happy cat holds her tail high and steady." },
  { fact: "Like humans, cats tend to favor one paw over another." },
  { fact: "The most traveled cat is Hamlet, who escaped from his carrier while on a flight. He hid for seven weeks behind a panel on the airplane. By the time he was discovered, he had traveled nearly 373,000 miles (600,000 km)." },
  { fact: "In the 1750s, Europeans introduced cats into the Americas to control pests." },
  { fact: "Tylenol and chocolate are both poisionous to cats." },
  { fact: "Cats with long, lean bodies are more likely to be outgoing, and more protective and vocal than those with a stocky build." },
  { fact: "A cat cannot see directly under its nose." },
  { fact: "Cat bites are more likely to become infected than dog bites." },
  { fact: "Cats see six times better in the dark and at night than humans." },
  { fact: "Some cats have survived falls of over 65 feet (20 meters), due largely to their “righting reflex.” The eyes and balance organs in the inner ear tell it where it is in space so the cat can land on its feet. Even cats without a tail have this ability." },
  { fact: "Cats step with both left legs, then both right legs when they walk or run." },
  { fact: "While it is commonly thought that the ancient Egyptians were the first to domesticate cats, the oldest known pet cat was recently found in a 9,500-year-old grave on the Mediterranean island of Cyprus. This grave predates early Egyptian art depicting cats by 4,000 years or more." },
  { fact: "A cat called Dusty has the known record for the most kittens. She had more than 420 kittens in her lifetime." },
  { fact: "Some common houseplants poisonous to cats include: English Ivy, iris, mistletoe, philodendron, and yew." },
  { fact: "Blue-eyed, pure white cats are frequently deaf." },
  { fact: "A cat's whiskers are thought to be a kind of radar, which helps a cat gauge the space it intends to walk through." },
  { fact: "Cats respond better to women than to men, probably due to the fact that women's voices have a higher pitch." },
  { fact: "The average lifespan of an outdoor-only cat is about 3 to 5 years while an indoor-only cat can live 16 years or much longer." },
  { fact: "Cats lap liquid from the underside of their tongue, not from the top." },
];

new ServerImpl({
  port: 3001,
  rootPath: process.cwd() + '/docroot',
  trustProxy: false,
  assumeHttps: false,
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
