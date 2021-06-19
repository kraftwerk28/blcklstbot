import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./emoji-categories.json', 'utf-8'));
const categories = Object.entries(data.enabled)
  .filter(e => e[1])
  .map(e => e[0]);
// console.log(categories);

Array.prototype.random = function() {
  const i = Math.floor(Math.random() * this.length);
  return this[i];
}

Array.prototype.insert = function(item, index) {
  const after = this.slice(index);
  this[index] = item;
  for (let i = 0; i < after.length; i++) this[index + i + 1] = after[i];
};

function generate() {
  const cat1 = data.categories.random();
  const cat2 = data.categories.random();
  const emojis = [cat1.emojis.random(), cat1.emojis.random(), cat1.emojis.random()];
  emojis.insert(cat2.emojis.random(), Math.floor(Math.random() * emojis.length));
  console.log(emojis)
  console.log(emojis.map(e => e.emoji).join(' '))
  console.log()
}

generate();
generate();
generate();
generate();
generate();
generate();
generate();
generate()
