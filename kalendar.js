"use strict"

function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function diffDays(date2, date1) {
  return(Math.round(date2 - date1)/(24 * 60 * 60 * 1000));
}

// returns the roman numeral; limited to a few thousand?
function roman_numeral(n) {
  var r = { "M": 1000, "CM": 900, "D": 500, "CD": 400, "C":100, "XC":90,
            "L": 50, "XL":40, "X":10, "IX":9, "V":5, "IV":4, "I":1 };
  var rn = "";
  for (var i in r) {
    while (n >= r[i] ) {
      rn += i;
      n -= r[i];
    }
  }
  return rn;
}

var Kalendar = {
  setup(baseyear) {
    this.k = {};
    var o = Object.create(KalendarYear);
    o.setup(baseyear);
    this.k[baseyear] = o;
  },
  getDate(date) {
    var y = date.getFullYear();
    if(!(y in this.k)) { 
      var o = Object.create(KalendarYear);
      o.setup(y);
      this.k[y] = o;
    }
    var out = this.k[y].getDate(date);
    return(out ? out : "");
  },
  isAbstinence(date) {
    // if Friday and not Christmas or isFast
    return((date.getDay() == 5) && (!(date.getMonth() == 11 && date.getDate() == 25)) || this.isFast(date));
  },
  isFast(date) {
    // Mon, Wed, Fri in Advent
    var dow = date.getDay();
    if(date > KalendarYear.getAdvent(date.getFullYear()) &&
       date < new Date(date.getFullYear(), 11, 25) &&
       (dow == 1 || dow == 3 || dow == 5)) {
      return(true);
    }
    // All days in Lent except Sundays
    if(date >= KalendarYear.getMoveable(date.getFullYear(), "Ash Wednesday") &&
       date <= KalendarYear.getMoveable(date.getFullYear(), "Holy Saturday") &&
       dow != 0) {
      return(true);
    }
    var d = this.getDate(date);
    // Ember days
    if(d.search(/Ember/)) {
      return(true);
    }
    // Vigils
    // TODO: FIX THIS re: 2020 Chistmas Vigil
    var d2 = this.getDate(addDays(date, 1)); // need tomorrow too
    var vexpr = "The Vigil of Pentecost|Vigil of the Assumption|Vigil of All Saints|Vigil of the Nativity of the Lord"
    if((d.match(vexpr) && dow != 0) || (d2.match(vexpr) && dow == 6)) {
      return(true);
    }
    return(false);
  }
}

// TODO: Sunday within the Octave of the Body of Christ...
// Better ways to do octaves in general??
// TODO: Saturday Office of the B.V.M.
var KalendarYear = {
  setup(year) {
    this.year = year;
    // one element per month
    this.dates = [[], [], [], [], [], [], [], [], [], [], [], []];
    // initialize the calendar
    for (var m in moveable) {
      var d = this.getMoveable(year, m);
      this.addDate2(d, m);
    }
    for (var f in fixed) {
      this.addDate(fixed[f]["m"], fixed[f]["d"], f);
    }
    this.addSundaysAfterEpiphany();
    this.addSundaysAfterTrinity();
  },
  addDate(m, d, name) {
    this.addAtPosition(m - 1, d - 1, name);
  },
  addDate2(date, name) {
    this.addAtPosition(date.getMonth(), date.getDate() - 1, name);
  },
  addAtPosition(mp, dp, name) {
    if(this.dates[mp][dp] == undefined) {
      var o = Object.create(KalendarDate);
      o.setup(name);
      this.dates[mp][dp] = o;
    } else {
      this.dates[mp][dp].push(name);
    }
  },
  getDate(date) {
    if(date.getFullYear() != this.year) { throw new Error("Asking for a date outside this kalendar object's year"); }
    var out = this.dates[date.getMonth()][date.getDate() - 1];
    if(out == undefined) { 
      var o = Object.create(KalendarDate);
      o.setup("");
      return(o); // anything better here?
    } else {
      return(out);
    }
  },
  findDate(name) {
    var len = this.dates.length;
    while (len--) {
      var dates = this.dates[len];
      var dateslen = dates.length;
      while (dateslen--) {
        if(dates[dateslen].getName() == name) {
          return(new Date(this.year, len, dateslen + 1));
        }
      }
    }
  },
  getEaster(y) {
    var pfm = ["A5", "M25", "A13", "A2", "M22", 
               "A10", "M30", "A18", "A7", "M27", 
               "A15", "A4", "M24", "A12", "A1", 
               "M21", "A9", "M29", "A17"];
    var a = pfm[y % 19];
    var m = { M: 2, A: 3 };
    a = new Date(y, m[a.charAt(0)], Number(a.slice(1)));
    var b = (diffDays(a, new Date(y, 2, 21)) + 2) % 7;
    var cent = Math.floor(y/100);
    var c = Math.abs(cent - 33) % 7;
    var x = y - cent * 100;
    var d = (x + Math.floor(x/4)) % 7;
    var e = 7 - ((b + c + d) % 7);
    var f = cent - 6 - Math.floor((cent - 12) / 4) + 1;
    return(addDays(a, e + f));
  },
  // TODO: Commemoration of Feria?
  // TODO: Rogation days...
  getMoveable(y, name) {
    var m = moveable[name];
    if("basis" in m) {
      return(addDays(eval("this.get" + m["basis"].substr(0, 1).toUpperCase() + 
                          m["basis"].substr(1))(y), m["diff"]));
    }
  },
  getAdvent(y) {
    var xmas = new Date(y, 11, 25); 
    var xmasdow = xmas.getDay(); // 0 = Sunday
    var weeks;
    if(xmasdow != 0) { weeks = 3; } else { weeks = 4 };
    return(addDays(xmas, 0 - xmasdow - 7 * weeks));
  },
  getEmber(y) {
    // First Wednesday after Holy Cross
    var hc = new Date(y, 8, 14);
    var hcdow = hc.getDay();
    if(hcdow < 4) {
      return(addDays(hc, 4 - hcdow)); 
    } else {
      return(addDays(hc, 7 - Math.abs(3 - hcdow)));
    }
  },
  // TODO: is the Octave itself treated special
  // see page xxviii re: removing other octave days
  addOctaveSunday(date, octavename) {    
    var odate = addDays(date, 7 - date.getDay());
    var odateobj = this.getDate(odate);
    odateobj.removeMatch(/within[\d\D]+octave/i);
    this.addDate2(odate, "The Sunday within the Octave of " + octavename);
  },
  addSundaysAfterEpiphany() {
    var suffix = " Sunday after the Epiphany"
    var e = new Date(this.year, 0, 6);
    var s = this.getMoveable(this.year, "The Sunday of Septuagesima");
    var n = 0;
    var edow = e.getDay();
    // add first one
    var ei = addDays(e, 7 - edow);
    this.addDate2(ei, "The Holy Family: Mary, Jesus & Joseph");
    this.addDate2(ei, roman_numeral(++n) + suffix);
    // add the rest
    while(addDays(ei, 7) < s) {
      ei = addDays(ei, 7);
      this.addDate2(ei, roman_numeral(++n) + suffix);
    }
  },
  // TODO: there can be 21 weeks in Pentecost in Orthodox Reckoning... what to do there??
  // TODO: deal with exceptions to typical metadata (e.g., demotion vs. translation)
  addSundaysAfterTrinity() {
    var t = this.getMoveable(this.year, "The Feast of the Most Holy Trinity");
    var a = this.getMoveable(this.year, "I Sunday in Advent");
    var w = Math.floor(diffDays(a, t) / 7); // How many weeks in Pentecost
    console.log(w);
    var nepi = (w - 24); // number of Epiphany Sundays resumed
    var esun = 6 - (w - 25); // which one to start with
    var n = 0;
    var stdadd = function(o, t, n) {  // the usual name to add
      o.addDate2(t, roman_numeral(n + 1) + " Sunday after Pentecost [" + 
                    roman_numeral(n) + " Trinity]");
    };
    // TODO: p. 424 explains that the I Sunday may be in the previous month
    var mthadd = function(o, t) {  // add I, II, III... in August, in September, etc.
      if(t.getMonth() > 6) { // August onwards
        var x = Math.floor(diffDays(t, new Date(t.getFullYear(), t.getMonth(), 1)) / 7) + 1;
        o.addDate2(t, "(" + roman_numeral(x) + " of " + months[t.getMonth()] + ")");
      }
    };
    while(addDays(t, 7) < a) {
      t = addDays(t, 7);
      ++n;
      if(n + 1 < 22) {
        stdadd(this, t, n);
      } else if(n + 1 == 22) {
        this.addDate2(t, "The Feast of Our Lord Jesus Christ the King");
        stdadd(this, t, n);
      } else if(n + 1 == 23) {
        if(w == 23) { // there are only 23 weeks in Pentecost
          this.addDate2(addDays(t, -1), "XXIII Sunday after Pentecost (Anticipated)");
          this.addDate2(t, "XXIV and Last Sunday after Pentecost (Anticipated) [Sunday Next Before Advent]");
        } else {
          stdadd(this, t, n)
        }
      } else if(nepi > 0) {
        this.addDate2(t, roman_numeral(esun) + " Sunday after Epiphany (Resumed) [" +
                      roman_numeral(n) + " Trinity]");
        --nepi;
        ++esun;
      } else {
        this.addDate2(t, "XXIV and Last Sunday after Pentecost [Sunday Next Before Advent]");
      }
      mthadd(this, t);
    }
    // add the Sunday within Octave of the Nativity, Corpus Christi
    this.addOctaveSunday(new Date(this.year, 11, 25), "the Nativity");
    this.addOctaveSunday(this.getMoveable(this.year, "The Feast of the Most Holy Body of Christ"), "Corpus Christi");
    this.addOctaveSunday(this.getMoveable(this.year, "The Ascension of Our Lord"), "the Ascension");
  }
};

var KalendarDate = {
  setup(name) {
    this.celes = [];
    this.push(name);
  },
  celesort(c1, c2) {
    var rank = [ "Sd1", "F1", "V1", "D1", "Sd2", "F2", "D2", 
                 "Sd", "V2", "Gd", "D", "iv", "F3", "V", "S",
                 "Comm", "M", "" ];
    var s1 = c1.getValueAsString("class");
    var s2 = c2.getValueAsString("class");
    var class1 = rank.indexOf(s1);
    var class2 = rank.indexOf(s2);
    if(class1 == -1) {
      console.log(s1 + " not found in rank.");
      class1 = 100;
    }
    if(class2 == -1) { 
      console.log(s2 + " not found in rank.");
      class2 = 100;
    }
    return(class1 - class2);
  },
  search(pattern) {
    return(this.celes.some(function(c) { return(c.search(pattern) !== -1); }));
  },
  match(pattern) {
    return(this.celes.some(function(c) { return(c.match(pattern)); }));
  },
  removeMatch(pattern) {
    var i = this.celes.findIndex(function(c) { return(c.getName().search(pattern) !== -1)  });
    this.celes = this.celes.slice(0, i).concat(this.celes.slice(i + 1));
  },
  valueEqual(valname, value) {
    return(this.celes.some(function(c) { 
      return(c.getValue(valname) == value);
    }));
  },
  push(name) {
    var o = Object.create(KalendarCelebration);
    o.setup(name);
    this.celes.push(o);
  },
  getCelebrations() {
    return(this.celes.sort(this.celesort));
  },
  names() {
    return(this.celes.map(function(c) { return(c.getName()); }));
  },
  namesWith(valnames) {
    out = this.celes.map(function(c) {
      var o = { "name": c.getName() };
      valnames.map(function(v) { 
        o[v] = c.getValue(v);
      });
      return(o);
    });
    return(out); 
  }
};

var KalendarCelebration = {
  setup(name) {
    this.cele = { "name": name };
  },
  getName() {
    return(this.cele["name"]);
  },
  getValue(valname) {
    var name = this.getName();
    if(this.cele[valname]) {
      return(this.cele[valname]);
    } else if(meta[name] == undefined) {
      console.log(name + " not found in meta");
      return(undefined);
    } else {
      return(meta[name][valname]);
    }
  },
  setValue(valname, value) {
    this.cele[valname] = value;
  },
  getValueAsString(valname) {
    var o = this.getValue(valname);
    return(o == undefined ? "" : o); 
  },
  search(pattern) {
    return(this.getName().search(pattern));
  },
  match(pattern) {
    return(this.getName().match(pattern));
  },
  isObligation() {
    return(this.getValue("obligation") == "y");
  },
  isDevotion() {
    return(this.getValue("devotion") == "y");
  }
};
