const util = require('util');
const os = require('os');
const path = require('path');
const fs = require('fs');
const tape = require('tape');
const xml2js = require('../');

const fileName = path.join(__dirname, '/fixtures/sample.xml');

function skeleton(options, checks) {
  const xmlString = options ? options.__xmlString : null;
  if (options != null) delete options.__xmlString;
  
  const x2js = new xml2js.Parser(options);
  x2js.on('end', (res) => checks(res));
  if (xmlString) return x2js.parseString(xmlString);
  fs.readFile(fileName, 'utf8', function(err, data) {
    if (err) throw err;
    data = data.split(os.EOL).join('\n');
    x2js.parseString(data);
  });
};

function nameToUpperCase(name) {
  return name.toUpperCase();
};

function nameCutoff(name) {
  return name.substr(0, 4);
};

/*
The `validator` function validates the value at the XPath. It also transforms the value
if necessary to conform to the schema or other validation information being used. If there
is an existing value at this path it is supplied in `currentValue` (e.g. this is the second or
later item in an array).
If the validation fails it should throw a `ValidationError`.
 */

function validator(xpath, currentValue, newValue) {
  if (xpath === '/sample/validatortest/numbertest') {
    return Number(newValue);
  } else if (xpath === '/sample/arraytest' || xpath === '/sample/validatortest/emptyarray' || xpath === '/sample/validatortest/oneitemarray') {
    if (!newValue || !('item' in newValue)) {
      return {
        'item': []
      };
    }
  } else if (xpath === '/sample/arraytest/item' || xpath === '/sample/validatortest/emptyarray/item' || xpath === '/sample/validatortest/oneitemarray/item') {
    if (!currentValue) {
      return newValue;
    }
  } else if (xpath === '/validationerror') {
    throw new xml2js.ValidationError("Validation error!");
  }
  return newValue;
};

tape('test parse with defaults', (t) => {
  skeleton(null, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.chartest[0].$.desc, 'Test for CHARs');
    t.is(r.sample.chartest[0]._, 'Character data here!');
    t.is(r.sample.cdatatest[0].$.desc, 'Test for CDATA');
    t.is(r.sample.cdatatest[0].$.misc, 'true');
    t.is(r.sample.cdatatest[0]._, 'CDATA here!');
    t.is(r.sample.nochartest[0].$.desc, 'No data');
    t.is(r.sample.nochartest[0].$.misc, 'false');
    t.is(r.sample.listtest[0].item[0]._, '\n            This  is\n            \n            character\n            \n            data!\n            \n        ');
    t.is(r.sample.listtest[0].item[0].subitem[0], 'Foo(1)');
    t.is(r.sample.listtest[0].item[0].subitem[1], 'Foo(2)');
    t.is(r.sample.listtest[0].item[0].subitem[2], 'Foo(3)');
    t.is(r.sample.listtest[0].item[0].subitem[3], 'Foo(4)');
    t.is(r.sample.listtest[0].item[1], 'Qux.');
    t.is(r.sample.listtest[0].item[2], 'Quux.');
    t.is(Object.keys(r.sample.tagcasetest[0]).length, 3);
    t.end();
  })
});

tape('test parse with explicitCharkey', (t) => {
  skeleton({explicitCharkey: true}, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.chartest[0].$.desc, 'Test for CHARs');
    t.is(r.sample.chartest[0]._, 'Character data here!');
    t.is(r.sample.cdatatest[0].$.desc, 'Test for CDATA');
    t.is(r.sample.cdatatest[0].$.misc, 'true');
    t.is(r.sample.cdatatest[0]._, 'CDATA here!');
    t.is(r.sample.nochartest[0].$.desc, 'No data');
    t.is(r.sample.nochartest[0].$.misc, 'false');
    t.is(r.sample.listtest[0].item[0]._, '\n            This  is\n            \n            character\n            \n            data!\n            \n        ');
    t.is(r.sample.listtest[0].item[0].subitem[0]._, 'Foo(1)');
    t.is(r.sample.listtest[0].item[0].subitem[1]._, 'Foo(2)');
    t.is(r.sample.listtest[0].item[0].subitem[2]._, 'Foo(3)');
    t.is(r.sample.listtest[0].item[0].subitem[3]._, 'Foo(4)');
    t.is(r.sample.listtest[0].item[1]._, 'Qux.');
    t.is(r.sample.listtest[0].item[2]._, 'Quux.');
    t.end();
  })
});

tape('test parse with mergeAttrs', (t) => {
  skeleton({mergeAttrs: true}, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.chartest[0].desc[0], 'Test for CHARs');
    t.is(r.sample.chartest[0]._, 'Character data here!');
    t.is(r.sample.cdatatest[0].desc[0], 'Test for CDATA');
    t.is(r.sample.cdatatest[0].misc[0], 'true');
    t.is(r.sample.cdatatest[0]._, 'CDATA here!');
    t.is(r.sample.nochartest[0].desc[0], 'No data');
    t.is(r.sample.nochartest[0].misc[0], 'false');
    t.is(r.sample.listtest[0].item[0].subitem[0], 'Foo(1)');
    t.is(r.sample.listtest[0].item[0].subitem[1], 'Foo(2)');
    t.is(r.sample.listtest[0].item[0].subitem[2], 'Foo(3)');
    t.is(r.sample.listtest[0].item[0].subitem[3], 'Foo(4)');
    t.is(r.sample.listtest[0].item[1], 'Qux.');
    t.is(r.sample.listtest[0].item[2], 'Quux.');
    t.is(r.sample.listtest[0].single[0], 'Single');
    t.is(r.sample.listtest[0].attr[0], 'Attribute');
    t.end();
  });
});  

tape('test parse with mergeAttrs and not explicitArray', (t) => {
  skeleton({
    mergeAttrs: true, 
    explicitArray: false
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.chartest.desc, 'Test for CHARs');
    t.is(r.sample.chartest._, 'Character data here!');
    t.is(r.sample.cdatatest.desc, 'Test for CDATA');
    t.is(r.sample.cdatatest.misc, 'true');
    t.is(r.sample.cdatatest._, 'CDATA here!');
    t.is(r.sample.nochartest.desc, 'No data');
    t.is(r.sample.nochartest.misc, 'false');
    t.is(r.sample.listtest.item[0].subitem[0], 'Foo(1)');
    t.is(r.sample.listtest.item[0].subitem[1], 'Foo(2)');
    t.is(r.sample.listtest.item[0].subitem[2], 'Foo(3)');
    t.is(r.sample.listtest.item[0].subitem[3], 'Foo(4)');
    t.is(r.sample.listtest.item[1], 'Qux.');
    t.is(r.sample.listtest.item[2], 'Quux.');
    t.is(r.sample.listtest.single, 'Single');
    t.is(r.sample.listtest.attr, 'Attribute');
    t.end();
  });
});

tape('test parse with explicitChildren', (t) => {
  skeleton({explicitChildren: true}, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.$$.chartest[0].$.desc, 'Test for CHARs');
    t.is(r.sample.$$.chartest[0]._, 'Character data here!');
    t.is(r.sample.$$.cdatatest[0].$.desc, 'Test for CDATA');
    t.is(r.sample.$$.cdatatest[0].$.misc, 'true');
    t.is(r.sample.$$.cdatatest[0]._, 'CDATA here!');
    t.is(r.sample.$$.nochartest[0].$.desc, 'No data');
    t.is(r.sample.$$.nochartest[0].$.misc, 'false');
    t.is(r.sample.$$.listtest[0].$$.item[0]._, '\n            This  is\n            \n            character\n            \n            data!\n            \n        ');
    t.is(r.sample.$$.listtest[0].$$.item[0].$$.subitem[0], 'Foo(1)');
    t.is(r.sample.$$.listtest[0].$$.item[0].$$.subitem[1], 'Foo(2)');
    t.is(r.sample.$$.listtest[0].$$.item[0].$$.subitem[2], 'Foo(3)');
    t.is(r.sample.$$.listtest[0].$$.item[0].$$.subitem[3], 'Foo(4)');
    t.is(r.sample.$$.listtest[0].$$.item[1], 'Qux.');
    t.is(r.sample.$$.listtest[0].$$.item[2], 'Quux.');
    t.is(r.sample.$$.nochildrentest[0].$$, void 0);
    t.is(Object.keys(r.sample.$$.tagcasetest[0].$$).length, 3);
    t.end();
  });
});

tape('test parse with explicitChildren and preserveChildrenOrder', (t) => {
 skeleton({
  explicitChildren: true, 
  preserveChildrenOrder: true
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.$$[10]['#name'], 'ordertest');
    t.is(r.sample.$$[10].$$[0]['#name'], 'one');
    t.is(r.sample.$$[10].$$[0]._, '1');
    t.is(r.sample.$$[10].$$[1]['#name'], 'two');
    t.is(r.sample.$$[10].$$[1]._, '2');
    t.is(r.sample.$$[10].$$[2]['#name'], 'three');
    t.is(r.sample.$$[10].$$[2]._, '3');
    t.is(r.sample.$$[10].$$[3]['#name'], 'one');
    t.is(r.sample.$$[10].$$[3]._, '4');
    t.is(r.sample.$$[10].$$[4]['#name'], 'two');
    t.is(r.sample.$$[10].$$[4]._, '5');
    t.is(r.sample.$$[10].$$[5]['#name'], 'three');
    t.is(r.sample.$$[10].$$[5]._, '6');
    t.end();
  });
 });

tape('test parse with explicitChildren and charsAsChildren and preserveChildrenOrder', (t) => {
 skeleton({
    explicitChildren: true,
    preserveChildrenOrder: true,
    charsAsChildren: true
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.$$[10]['#name'], 'ordertest');
    t.is(r.sample.$$[10].$$[0]['#name'], 'one');
    t.is(r.sample.$$[10].$$[0]._, '1');
    t.is(r.sample.$$[10].$$[1]['#name'], 'two');
    t.is(r.sample.$$[10].$$[1]._, '2');
    t.is(r.sample.$$[10].$$[2]['#name'], 'three');
    t.is(r.sample.$$[10].$$[2]._, '3');
    t.is(r.sample.$$[10].$$[3]['#name'], 'one');
    t.is(r.sample.$$[10].$$[3]._, '4');
    t.is(r.sample.$$[10].$$[4]['#name'], 'two');
    t.is(r.sample.$$[10].$$[4]._, '5');
    t.is(r.sample.$$[10].$$[5]['#name'], 'three');
    t.is(r.sample.$$[10].$$[5]._, '6');
    t.is(r.sample.$$[17]['#name'], 'textordertest');
    t.is(r.sample.$$[17].$$[0]['#name'], '__text__');
    t.is(r.sample.$$[17].$$[0]._, 'this is text with ');
    t.is(r.sample.$$[17].$$[1]['#name'], 'b');
    t.is(r.sample.$$[17].$$[1]._, 'markup');
    t.is(r.sample.$$[17].$$[2]['#name'], 'em');
    t.is(r.sample.$$[17].$$[2]._, 'like this');
    t.is(r.sample.$$[17].$$[3]['#name'], '__text__');
    t.is(r.sample.$$[17].$$[3]._, ' in the middle');
    t.end();
  });
});

tape('test parse with explicitChildren and charsAsChildren and preserveChildrenOrder and includeWhiteChars', (t) => {
  skeleton({
    explicitChildren: true,
    preserveChildrenOrder: true,
    charsAsChildren: true,
    includeWhiteChars: true
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.$$[35]['#name'], 'textordertest');
    t.is(r.sample.$$[35].$$[0]['#name'], '__text__');
    t.is(r.sample.$$[35].$$[0]._, 'this is text with ');
    t.is(r.sample.$$[35].$$[1]['#name'], 'b');
    t.is(r.sample.$$[35].$$[1]._, 'markup');
    t.is(r.sample.$$[35].$$[2]['#name'], '__text__');
    t.is(r.sample.$$[35].$$[2]._, '   ');
    t.is(r.sample.$$[35].$$[3]['#name'], 'em');
    t.is(r.sample.$$[35].$$[3]._, 'like this');
    t.is(r.sample.$$[35].$$[4]['#name'], '__text__');
    t.is(r.sample.$$[35].$$[4]._, ' in the middle');
    t.end();
  });
});

tape('test parse with explicitChildren and charsAsChildren and preserveChildrenOrder and includeWhiteChars and normalize', (t) => {
  skeleton({
    explicitChildren: true,
    preserveChildrenOrder: true,
    charsAsChildren: true,
    includeWhiteChars: true,
    normalize: true
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.$$[35]['#name'], 'textordertest');
    t.is(r.sample.$$[35].$$[0]['#name'], '__text__');
    t.is(r.sample.$$[35].$$[0]._, 'this is text with');
    t.is(r.sample.$$[35].$$[1]['#name'], 'b');
    t.is(r.sample.$$[35].$$[1]._, 'markup');
    t.is(r.sample.$$[35].$$[2]['#name'], '__text__');
    t.is(r.sample.$$[35].$$[2]._, '');
    t.is(r.sample.$$[35].$$[3]['#name'], 'em');
    t.is(r.sample.$$[35].$$[3]._, 'like this');
    t.is(r.sample.$$[35].$$[4]['#name'], '__text__');
    t.is(r.sample.$$[35].$$[4]._, 'in the middle');
    t.end();
  });
});

tape('test element without children', (t) => {
  skeleton({
    explicitChildren: true
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.$$.nochildrentest[0].$$, void 0);
    t.end();
  });
});

tape('test parse with explicitChildren and charsAsChildren', (t) => {
 skeleton({
    explicitChildren: true,
    charsAsChildren: true
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.$$.chartest[0].$$._, 'Character data here!');
    t.is(r.sample.$$.cdatatest[0].$$._, 'CDATA here!');
    t.is(r.sample.$$.listtest[0].$$.item[0].$$._, '\n            This  is\n            \n            character\n            \n            data!\n            \n        ');
    t.is(Object.keys(r.sample.$$.tagcasetest[0].$$).length, 3);
    t.end();
  });
 });

tape('test text trimming, normalize', (t) => {
  skeleton({
    trim: true,
    normalize: true
  }, (r) => {
    t.is(r.sample.whitespacetest[0]._, 'Line One Line Two');
    t.end();
  });
});

tape('test text trimming, no normalizing', (t) => {
  skeleton({
    trim: true,
    normalize: false
  }, (r) => {
    t.is(r.sample.whitespacetest[0]._, 'Line One\n        Line Two');
    t.end()
  });
});

tape('test text no trimming, normalize', (t) => {
  skeleton({
    trim: false,
    normalize: true
  }, (r) => {
    t.is(r.sample.whitespacetest[0]._, 'Line One Line Two');
    t.end()
  });
});

tape('test text no trimming, no normalize', (t) => {
  skeleton({
    trim: false,
    normalize: false
  }, (r) => {
    t.is(r.sample.whitespacetest[0]._, '\n        Line One\n        Line Two\n    ');
    t.end();
  });
});

tape('test enabled root node elimination', (t) => {
  skeleton({
    __xmlString: '<root></root>',
    explicitRoot: false
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.deepEqual(r, '');
    t.end();
  });
});

tape('test disabled root node elimination', (t) => {
 skeleton({
    __xmlString: '<root></root>',
    explicitRoot: true
  }, (r) => {
    t.deepEqual(r, {
      root: ''
    });
    t.end();
  });
});

tape('test default empty tag result', (t) => {
  skeleton(null, (r) => {
    t.deepEqual(r.sample.emptytest, ['']);
    t.end();
  });
});

tape('test empty tag result specified null', (t) => {
 skeleton({
    emptyTag: null
  }, (r) => {
    t.is(r.sample.emptytest[0], null);
    t.end();
  });
});

tape('test invalid empty XML file', (t) => {
 skeleton({
    __xmlString: ' '
  }, (r) => {
    t.is(r, null);
    t.end();
  });
});

tape('test enabled normalizeTags', (t) => {
  skeleton({
    normalizeTags: true
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(Object.keys(r.sample.tagcasetest).length, 1);
    t.end();
  });
});

tape('test parse with custom char and attribute object keys', (t) => {
  skeleton({
    attrkey: 'attrobj',
    charkey: 'charobj'
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.chartest[0].attrobj.desc, 'Test for CHARs');
    t.is(r.sample.chartest[0].charobj, 'Character data here!');
    t.is(r.sample.cdatatest[0].attrobj.desc, 'Test for CDATA');
    t.is(r.sample.cdatatest[0].attrobj.misc, 'true');
    t.is(r.sample.cdatatest[0].charobj, 'CDATA here!');
    t.is(r.sample.cdatawhitespacetest[0].charobj, '   ');
    t.is(r.sample.nochartest[0].attrobj.desc, 'No data');
    t.is(r.sample.nochartest[0].attrobj.misc, 'false');
    t.end();
  });
});

tape('test child node without explicitArray', (t) => {
  skeleton({
    explicitArray: false
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.arraytest.item[0].subitem, 'Baz.');
    t.is(r.sample.arraytest.item[1].subitem[0], 'Foo.');
    t.is(r.sample.arraytest.item[1].subitem[1], 'Bar.');
    t.end();
  });
});

tape('test child node with explicitArray', (t) => {
  skeleton({
    explicitArray: true
  }, (r) => {
    //console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.arraytest[0].item[0].subitem[0], 'Baz.');
    t.is(r.sample.arraytest[0].item[1].subitem[0], 'Foo.');
    t.is(r.sample.arraytest[0].item[1].subitem[1], 'Bar.'); 
    t.end();
  });
});

tape('test ignore attributes', (t) => {
  skeleton({
    ignoreAttrs: true
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.chartest[0], 'Character data here!');
    t.is(r.sample.cdatatest[0], 'CDATA here!');
    t.is(r.sample.nochartest[0], '');
    t.is(r.sample.listtest[0].item[0]._, '\n            This  is\n            \n            character\n            \n            data!\n            \n        ');
    t.is(r.sample.listtest[0].item[0].subitem[0], 'Foo(1)');
    t.is(r.sample.listtest[0].item[0].subitem[1], 'Foo(2)');
    t.is(r.sample.listtest[0].item[0].subitem[2], 'Foo(3)');
    t.is(r.sample.listtest[0].item[0].subitem[3], 'Foo(4)');
    t.is(r.sample.listtest[0].item[1], 'Qux.');
    t.is(r.sample.listtest[0].item[2], 'Quux.');
    t.end()
  });
});

tape('test simple callback mode', (t) => {
  const x2js = new xml2js.Parser();
  fs.readFile(fileName, (err, data) => {
    t.is(err, null);
    x2js.parseString(data, (err, r) => {
      t.is(err, null);
      t.is(r.sample.chartest[0]._, 'Character data here!');
      t.end();
    });
  });
});

tape('test simple callback with options', (t) => {
  fs.readFile(fileName, (err, data) => {
    xml2js.parseString(data, {
      trim: true,
      normalize: true
    }, (err, r) => {
      t.is(r.sample.whitespacetest[0]._, 'Line One Line Two');
      t.end();
    });
  });
});

tape('test double parse', (t) => {
  const x2js = new xml2js.Parser();
  fs.readFile(fileName, (err, data) => {
    t.is(err, null);
    x2js.parseString(data, (err, r) => {
      t.is(err, null);
      t.is(r.sample.chartest[0]._, 'Character data here!');
      x2js.parseString(data, (err, r) => {
        t.is(err, null);
        t.is(r.sample.chartest[0]._, 'Character data here!');
        t.end();
      });
    });
  });
});

tape('test element with garbage XML', (t) => {
  const x2js = new xml2js.Parser();
  const xmlString = "<<>fdfsdfsdf<><<><??><<><>!<>!<!<>!.";
  x2js.parseString(xmlString, (err) => {
    t.notEqual(err, null);
    t.end();
  });
});

tape('test simple function without options', (t) => {
  fs.readFile(fileName, (err, data) => {
    xml2js.parseString(data, (err, r) => {
      t.is(err, null);
      t.is(r.sample.chartest[0]._, 'Character data here!');
      t.end();
    });
  });
});

tape('test simple function with options', (t) => {
  fs.readFile(fileName, function(err, data) {
    xml2js.parseString(data, {}, function(err, r) {
      t.is(err, null);
      t.is(r.sample.chartest[0]._, 'Character data here!');
      t.end();
    });
  });
});

tape('test async execution', (t) => {
  fs.readFile(fileName, (err, data) => {
    xml2js.parseString(data, {
      async: true
  }, (err, r) => {
      t.is(err, null);
      t.is(r.sample.chartest[0]._, 'Character data here!');
      t.end();
    });
  });
});

tape('test validator', (t) => {
 skeleton({
    validator: validator
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(typeof r.sample.validatortest[0].stringtest[0], 'string');
    t.is(typeof r.sample.validatortest[0].numbertest[0], 'number');
    t.ok(r.sample.validatortest[0].emptyarray[0].item instanceof Array);
    t.is(r.sample.validatortest[0].emptyarray[0].item.length, 0);
    t.ok(r.sample.validatortest[0].oneitemarray[0].item instanceof Array);
    t.is(r.sample.validatortest[0].oneitemarray[0].item.length, 1);
    t.is(r.sample.validatortest[0].oneitemarray[0].item[0], 'Bar.');
    t.ok(r.sample.arraytest[0].item instanceof Array);
    t.is(r.sample.arraytest[0].item.length, 2);
    t.is(r.sample.arraytest[0].item[0].subitem[0], 'Baz.');
    t.is(r.sample.arraytest[0].item[1].subitem[0], 'Foo.');
    t.is(r.sample.arraytest[0].item[1].subitem[1], 'Bar.');
    t.end();
  });
});

tape('test validation error', (t) => {
  const x2js = new xml2js.Parser({
    validator: validator
  });
  x2js.parseString('<validationerror/>', (err, r) => {
    t.is(err.message, 'Validation error!');
    t.end();
  });
});

tape('test error throwing', (t) => {
  const xml = '<?xml version="1.0" encoding="utf-8"?><test>content is ok<test>';
  try {
    xml2js.parseString(xml, function(err, parsed) {
      throw new Error('error throwing in callback');
    });
    throw new Error('error throwing outside');
  } catch (error) {
    e = error;
    t.is(e.message, 'error throwing in callback');
    t.end();
  }
});

tape('test error throwing after an error (async)', (t) => {
  const xml = '<?xml version="1.0" encoding="utf-8"?><test node is not okay>content is ok</test node is not okay>';
  let nCalled = 0;
  xml2js.parseString(xml, {
    async: true
  }, (err, parsed) => {
    ++nCalled;
    if (nCalled > 1) {
      t.fail('callback called multiple times');
    }
    setTimeout(() => t.end());
  });
});

tape('test xmlns', (t) => {
  skeleton({
    xmlns: true
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample["pfx:top"][0].$ns.local, 'top');
    t.is(r.sample["pfx:top"][0].$ns.uri, 'http://foo.com');
    t.is(r.sample["pfx:top"][0].$["pfx:attr"].value, 'baz');
    t.is(r.sample["pfx:top"][0].$["pfx:attr"].local, 'attr');
    t.is(r.sample["pfx:top"][0].$["pfx:attr"].uri, 'http://foo.com');
    t.is(r.sample["pfx:top"][0].middle[0].$ns.local, 'middle');
    t.is(r.sample["pfx:top"][0].middle[0].$ns.uri, 'http://bar.com');
    t.end();
  });
});

tape('test callback should be called once', (t) => {
  const xml = '<?xml version="1.0" encoding="utf-8"?><test>test</test>';
  let i = 0;
  try {
    xml2js.parseString(xml, function(err, parsed) {
      i = i + 1;
      throw new Error('Custom error message');
    });
  } catch (error) {
    e = error;
    t.is(i, 1);
    t.is(e.message, 'Custom error message');
    t.end();
  }
});

tape('test no error event after end', (t) => {
  const xml = '<?xml version="1.0" encoding="utf-8"?><test>test</test>';
  let i = 0;
  const x2js = new xml2js.Parser();
  x2js.on('error', function() {
    return i = i + 1;
  });
  x2js.on('end', function() {
    throw new Error('some error in user-land');
  });
  try {
    x2js.parseString(xml);
  } catch (error) {
    const e = error;
    t.is(e.message, 'some error in user-land');
  }
  t.is(i, 0);
  t.end();
});

tape('test empty CDATA', (t) => {
  const xml = '<xml><Label><![CDATA[]]></Label><MsgId>5850440872586764820</MsgId></xml>';
  xml2js.parseString(xml, function(err, parsed) {
    t.is(parsed.xml.Label[0], '');
    t.end();
  });
});

tape('test CDATA whitespaces result', (t) => {
  const xml = '<spacecdatatest><![CDATA[ ]]></spacecdatatest>';
  xml2js.parseString(xml, function(err, parsed) {
    t.is(parsed.spacecdatatest, ' ');
    t.end();
  });
});

tape('test escaped CDATA result', (t) => {
  const xml = '<spacecdatatest><![CDATA[]]]]><![CDATA[>]]></spacecdatatest>';
  xml2js.parseString(xml, function(err, parsed) {
    t.is(parsed.spacecdatatest, ']]>');
    t.end()
  });
});

tape('test escaped CDATA result', (t) => {
  const xml = '<spacecdatatest><![CDATA[]]]]><![CDATA[>]]></spacecdatatest>';
  xml2js.parseString(xml, function(err, parsed) {
    t.is(parsed.spacecdatatest, ']]>');
    t.end();
  });
});

tape('test non-strict parsing', (t) => {
  const html = '<html><head></head><body><br></body></html>';
  xml2js.parseString(html, {
    strict: false
  }, (err, parsed) => {
    t.is(err, null);
    t.end();
  });
});

tape('test construction with new and without', (t) => {
  const demo = '<xml><foo>Bar</foo></xml>';
  const withNew = new xml2js.Parser;
  withNew.parseString(demo, (err, resWithNew) => {
    t.is(err, null);
    const withoutNew = xml2js.Parser();
    withoutNew.parseString(demo, (err, resWithoutNew) => {
      t.is(err, null);
      t.deepEqual(resWithNew, resWithoutNew);
      t.end();
    });
  });
});

 tape('test not closed but well formed xml', (t) => {
  const xml = "<test>";
  xml2js.parseString(xml, (err, parsed) => {
    t.is(err.message, 'Unclosed root tag\nLine: 0\nColumn: 6\nChar: ');
    t.end();
  });
});

tape('test cdata-named node', (t) => {
  const xml = "<test><cdata>hello</cdata></test>";
  xml2js.parseString(xml, (err, parsed) => {
    t.is(parsed.test.cdata[0], 'hello');
    t.end();
  });
});

tape('test onend with empty xml', (t) => {
  const xml = "<?xml version=\"1.0\"?>";
  xml2js.parseString(xml, (err, parsed) => {
    t.is(parsed, null);
    t.end();
  });
});

tape('test parsing null', (t) => {
  const xml = null;
  xml2js.parseString(xml, (err, parsed) => {
    t.notEqual(err, null);
    t.end();
  });
});

tape('test parsing undefined', (t) => {
  const xml = undefined;
  xml2js.parseString(xml, (err, parsed) => {
    t.notEqual(err, null);
    t.end();
  });
});

tape('test chunked processing', (t) => {
  const xml = "<longstuff>abcdefghijklmnopqrstuvwxyz</longstuff>";
  xml2js.parseString(xml, {
    chunkSize: 10
  }, (err, parsed) => {
    t.is(err, null);
    t.is(parsed.longstuff, 'abcdefghijklmnopqrstuvwxyz');
    t.end();
  });
});

tape('test single attrNameProcessors', (t) => {
  skeleton({
    attrNameProcessors: [nameToUpperCase]
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.attrNameProcessTest[0].$.hasOwnProperty('CAMELCASEATTR'), true);
    t.is(r.sample.attrNameProcessTest[0].$.hasOwnProperty('LOWERCASEATTR'), true);
    t.end();
  });
});

tape('test multiple attrNameProcessors', (t) => {
  skeleton({
    attrNameProcessors: [nameToUpperCase, nameCutoff]
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.attrNameProcessTest[0].$.hasOwnProperty('CAME'), true);
    t.is(r.sample.attrNameProcessTest[0].$.hasOwnProperty('LOWE'), true);
    t.end();
  });
});

tape('test single attrValueProcessors', (t) => {
  skeleton({
    attrValueProcessors: [nameToUpperCase]
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.attrValueProcessTest[0].$.camelCaseAttr, 'CAMELCASEATTRVALUE');
    t.is(r.sample.attrValueProcessTest[0].$.lowerCaseAttr, 'LOWERCASEATTRVALUE');
    t.end();
  });
});

tape('test multiple attrValueProcessors', (t) => {
  skeleton({
    attrValueProcessors: [nameToUpperCase, nameCutoff]
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.attrValueProcessTest[0].$.camelCaseAttr, 'CAME');
    t.is(r.sample.attrValueProcessTest[0].$.lowerCaseAttr, 'LOWE');
    t.end();
  });
});

tape('test single valueProcessor', (t) => {
  skeleton({
    valueProcessors: [nameToUpperCase]
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.valueProcessTest[0], 'SOME VALUE');
    t.end();
  });
});

tape('test multiple valueProcessor', (t) => {
  skeleton({
    valueProcessors: [nameToUpperCase, nameCutoff]
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.sample.valueProcessTest[0], 'SOME');
    t.end();
  });
});

tape('test single tagNameProcessors', (t) => {
  skeleton({
    tagNameProcessors: [nameToUpperCase]
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.hasOwnProperty('SAMPLE'), true);
    t.is(r.SAMPLE.hasOwnProperty('TAGNAMEPROCESSTEST'), true);
    t.end(); 
  });
});

tape('test single tagNameProcessors in simple callback', (t) => {
  fs.readFile(fileName, (err, data) => {
    xml2js.parseString(data, {
      tagNameProcessors: [nameToUpperCase]
    }, (err, r) => {
      // console.log('Result object: ' + util.inspect(r, false, 10));
      t.is(r.hasOwnProperty('SAMPLE'), true);
      t.is(r.SAMPLE.hasOwnProperty('TAGNAMEPROCESSTEST'), true);
      t.end();
    });
  });
});

tape('test multiple tagNameProcessors', (t) => {
  skeleton({
    tagNameProcessors: [nameToUpperCase, nameCutoff]
  }, (r) => {
    // console.log('Result object: ' + util.inspect(r, false, 10));
    t.is(r.hasOwnProperty('SAMP'), true);
    t.is(r.SAMP.hasOwnProperty('TAGN'), true);
    t.end();
  });
});