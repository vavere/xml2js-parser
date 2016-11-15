const tape = require('tape');
const processors = require('../').processors;

tape('test normalize', (t) => {
  const demo = 'This shOUld BE loWErcase';
  const result = processors.normalize(demo);
  t.is(result, 'this should be lowercase');
  t.end();
})

tape('test firstCharLowerCase', (t) => {
  const demo = 'ThiS SHould OnlY LOwercase the fIRST cHar';
  const result = processors.firstCharLowerCase(demo);
  t.is(result, 'thiS SHould OnlY LOwercase the fIRST cHar');
  t.end();
})

tape('test stripPrefix', (t) => {
  const demo = 'stripMe:DoNotTouch';
  const result = processors.stripPrefix(demo);
  t.is(result, 'DoNotTouch');
  t.end();
})

tape('test stripPrefix, ignore xmlns', (t) => {
  const demo = 'xmlns:shouldHavePrefix';
  const result = processors.stripPrefix(demo);
  t.is(result, 'xmlns:shouldHavePrefix');
  t.end();
})

tape('test parseNumbers', (t) => {
  t.is(processors.parseNumbers('0'), 0);
  t.is(processors.parseNumbers('123'), 123);
  t.is(processors.parseNumbers('15.56'), 15.56);
  t.is(processors.parseNumbers('10.00'), 10);
  t.end();
})

tape('test parseBooleans', (t) => {
  t.is(processors.parseBooleans('true'), true);
  t.is(processors.parseBooleans('True'), true);
  t.is(processors.parseBooleans('TRUE'), true);
  t.is(processors.parseBooleans('false'), false);
  t.is(processors.parseBooleans('False'), false);
  t.is(processors.parseBooleans('FALSE'), false);
  t.is(processors.parseBooleans('truex'), 'truex');
  t.is(processors.parseBooleans('xtrue'), 'xtrue');
  t.is(processors.parseBooleans('x'), 'x');
  t.is(processors.parseBooleans(''), '');
  t.end();
})
