const tape = require('tape');
const xml2js = require('../');

tape('test decoded BOM', (t) => {
  const demo = '\uFEFF<xml><foo>bar</foo></xml>';
  xml2js.parseString(demo, (err, res) => {
    t.ok(!err);
    t.equal(res.xml.foo[0], 'bar');
    t.end()
  });
});

