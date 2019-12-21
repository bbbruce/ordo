import Kalendar from './kalendar.js';
import Kalendar_old from './kalendar_old.js';
import {addDay} from './date_calcs.jsm';

QUnit.test("Match new vs. old", function( assert ) {
  function testYear(year) {
    var d = new Date(year, 0, 1);
    var y = d.getFullYear();
    var o = new Kalendar_old(y); 
    var n = new Kalendar(y); 
    while(d.getFullYear() == y) {
      var oc = o.getDate(d).getCelebrations();
      var nc = n.getDate(d).getCelebrations();
      assert.deepEqual(nc.map(c => c.name), oc.map(c => c.name), d);
      d = addDay(d);
    }
  }
  [2017, 2018].map(testYear);
});
QUnit.test("Advent", function( assert ) {
  function testAdvent(y, m, d) {
    var e = Kalendar.getAdvent(y);
    assert.equal(e.getMonth(), m - 1);
    assert.equal(e.getDate(), d);
  }
  testAdvent(2015, 11, 29);
  testAdvent(2016, 11, 27);
  testAdvent(2017, 12, 3);
  testAdvent(2018, 12, 2);
  testAdvent(2019, 12, 1);
  testAdvent(2020, 11, 29);
  testAdvent(2021, 11, 28);
  testAdvent(2022, 11, 27);
  testAdvent(2023, 12, 3);
});

QUnit.test("Eastern Easter", function( assert ) {
  function testEaster(y, m, d) {
    var e = Kalendar.getEaster(y);
    assert.equal(e.getMonth(), m - 1);
    assert.equal(e.getDate(), d);
  }
  testEaster(2015, 4, 12);
  testEaster(2016, 5, 1);
  testEaster(2017, 4, 16);
  testEaster(2018, 4, 8);
  testEaster(2019, 4, 28);
  testEaster(2020, 4, 19);
  testEaster(2021, 5, 2);
  testEaster(2022, 4, 24);
  testEaster(2023, 4, 16);
});
QUnit.test("Number of weeks in Pentecost", function( assert ) {
  function testNWP(y, n) {
    assert.equal(Kalendar.sundaysInPentecost(y), n)
  }
  testNWP(2015, 25);
  testNWP(2016, 22);
  testNWP(2017, 25);
  testNWP(2018, 26);
  testNWP(2019, 23);  
  testNWP(2020, 24);  
  testNWP(2021, 22);  
  testNWP(2022, 23);  
  testNWP(2023, 25);  
});
QUnit.test("Number of weeks in Epiphany", function( assert ) {
  function testNWE(y, n) {
    assert.equal(Kalendar.sundaysInEpiphany(y), n)
  }
  testNWE(2015, 4);
  testNWE(2016, 7);
  testNWE(2017, 5);
  testNWE(2018, 4);
  testNWE(2019, 6);  
  testNWE(2020, 5);  
  testNWE(2021, 7);  
  testNWE(2022, 6);  
  testNWE(2023, 5);  
});
