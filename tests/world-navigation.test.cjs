const test = require('node:test');
const assert = require('node:assert/strict');
const {homepageTarget} = require('../assets/site-v5.js');
test('Legacy homepage search and project bookmarks open the complete catalog with intact query values', () => {
  for (const search of ['q=poczta','technologia=.NET','etap=Prototyp','typ=product','kategoria=mobile&projekt=glikemia-premium']) {
    const destination = new URL(homepageTarget('https://progresskit.pl/?'+search+'#projekty'));
    assert.equal(destination.origin, 'https://progresskit.pl');
    assert.equal(destination.pathname, '/projekty/');
    assert.equal(destination.search, '?'+search);
    assert.equal(destination.hash, '#projekty');
  }
});
test('Campaign-only and empty bookmarks remain on the homepage', () => {
  for (const search of ['', '?utm_source=linkedin', '?q=&kategoria=']) assert.equal(homepageTarget('https://progresskit.pl/'+search), null);
});
test('Legacy filters never turn user search text into a navigation origin', () => {
  const destination=new URL(homepageTarget('https://progresskit.pl/?q=https%3A%2F%2Fexample.com&projekt=progresskit-mail'));
  assert.equal(destination.origin,'https://progresskit.pl');
  assert.equal(destination.searchParams.get('q'),'https://example.com');
});
