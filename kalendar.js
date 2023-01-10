"use strict"
// TODO: Requiem Masses (see Ordo)
import {romanNumeral} from './roman_numeral.js';
import {addDays, diffDays, diffWeeks, addWeek, subWeek, addDay, subDay, leapYear} from './date_calcs.js';

export default class Kalendar {
  // y is the "base year" - others added as needed
  constructor(y) {
    this.k = {};
    var o = new KalendarYear(y);
    this.k[y] = o;    
  }

  static getMoveable(y, name) {
    var m = moveable[name];
    if("basis" in m) {
      // automatically figure out the right function
      return(addDays(eval("Kalendar.get" + m["basis"].substr(0, 1).toUpperCase() + 
                          m["basis"].substr(1))(y), m["diff"]));
    }
  }

  static findNextSunday(d) {
    var dow = d.getDay();
    return(addDays(d, 7 - dow));
  }

  static getAdvent(y) {
    var xmas = new Date(y, 11, 25); 
    var xmasdow = xmas.getDay(); // 0 = Sunday
    var weeks;
    if(xmasdow != 0) { weeks = 3; } else { weeks = 4 };
    return(addDays(xmas, 0 - xmasdow - 7 * weeks));
  }

  static getEpiphany(y) {
    return(new Date(y, 0, 6));
  }

  static getFirstSundayInEpiphany(y) {
    return(Kalendar.findNextSunday(Kalendar.getEpiphany(y)));
  }

  static getSeptuagesima(y) {
    return(Kalendar.getMoveable(y, "Septuagesima Sunday"));
  }

  static getAshWednesday(y) {
    return(Kalendar.getMoveable(y, "Ash Wednesday"));
  }

  static getHolySaturday(y) {
    return(Kalendar.getMoveable(y, "Holy Saturday"));
  }

  static getEaster(y) {
    var pfm = ["A5", "M25", "A13", "A2", "M22", 
               "A10", "M30", "A18", "A7", "M27", 
               "A15", "A4", "M24", "A12", "A1", 
               "M21", "A9", "M29", "A17"];
    var a = pfm[y % 19];
    var m = { M: 2, A: 3 };
    a = new Date(y, m[a.charAt(0)], Number(a.slice(1)));
    var b = (diffDays(a, new Date(y, 2, 21)) + 2) % 7;
    var cent = Math.floor(y / 100);
    var c = Math.abs(cent - 33) % 7;
    var x = y - cent * 100;
    var d = (x + Math.floor(x/4)) % 7;
    var e = 7 - ((b + c + d) % 7);
    var f = cent - 6 - Math.floor((cent - 12) / 4) + 1;
    return(addDays(a, e + f));
  }

  static getTrinity(y) {
    return(Kalendar.getMoveable(y, "The Feast of the Most Holy Trinity"));
  }

  static getTheKing(y) {
    var last_oct = new Date(y, 9, 31);
    return(addDays(last_oct, -last_oct.getDay())); 
  }

  static getEmber(y) {
    // First Wednesday after Holy Cross
    var hc = new Date(y, 8, 14);
    var hcdow = hc.getDay();
    if(hcdow < 3) {
      return(addDays(hc, 3 - hcdow)); 
    } else {
      return(addDays(hc, 7 - Math.abs(3 - hcdow)));
    }
  }

  static sundaysInEpiphany(y) {
    var s = Kalendar.getSeptuagesima(y);
    var ei = Kalendar.getFirstSundayInEpiphany(y);
    return(diffWeeks(s, ei)); 
  }

  static sundaysInPentecost(y) {
    return(diffWeeks(Kalendar.getAdvent(y), Kalendar.getTrinity(y))); 
  }

  getDate(date) {
    var y = date.getFullYear();
    if(!(y in this.k)) { 
      var o = new KalendarYear(y);
      this.k[y] = o;
    }
    var out = this.k[y].getDate(date);
    return(out ? out : "");
  }

  isAbstinence(date) {
    // if Friday and not Christmas or isFast
    return((date.getDay() == 5) && (!(date.getMonth() == 11 && date.getDate() == 25)) || this.isFast(date));
  }

  isFast(date) {
    // Mon, Wed, Fri in Advent
    var dow = date.getDay();
    if(date > Kalendar.getAdvent(date.getFullYear()) &&
       date < new Date(date.getFullYear(), 11, 25) &&
       (dow == 1 || dow == 3 || dow == 5)) {
      return(true);
    }
    // All days in Lent except Sundays
    if(date >= Kalendar.getAshWednesday(date.getFullYear()) &&
       date <= Kalendar.getHolySaturday(date.getFullYear()) &&
       dow != 0) {
      return(true);
    }
    var d = this.getDate(date);
    // Ember days
    if(d.search(/Ember/)) {
      return(true);
    }
    // Vigils
    var d2 = this.getDate(addDay(date)); // need tomorrow too
    var vexpr = "The Vigil of Pentecost|Vigil of the Assumption|Vigil of All Saints|Vigil of the Nativity of the Lord"
    if((d.match(vexpr) && dow != 0) || (d2.match(vexpr) && dow == 6)) {
      return(true);
    }
    return(false);
  }
}

class KalendarYear {

  constructor(year) {
    this.year = year;
    // one element per month
    this.dates = [[], [], [], [], [], [], [], [], [], [], [], []];
    // set up a variable to keep feasts that need translation in order
    this.toTranslate = []; 
    // initialize the calendar
    for (var m in moveable) {
      var d = Kalendar.getMoveable(year, m);
      this.addDate2(d, m);
    }
    var ly = leapYear(year);
    for (var f in fixed) {
      this.addDate(fixed[f]["m"], fixed[f]["d"] + (fixed[f]["addleap"] == "yes" && ly ? 1 : 0), f.trim());
    }
    this.addHolyNames(year);
    this.addSundaysAfterEpiphany();
    this.addSundaysAfterTrinity();
    this.addFerias();
    this.addGreaterLitanies();
    this.determineAnticipation();
    this.addSatOfficeOfBVM();
    this.determinePrecedence();
    this.specialDemotions();
    this.removeOctaves();
  }

  addHolyNames(y) {
    var holyname;
    var nyd = new Date(y, 0, 1);
    var first_sun = Kalendar.findNextSunday(subDay(nyd));
    if ([1, 6, 7].includes(first_sun.getDate())) {
      holyname = new Date(y, 0, 2)
    } else {
      holyname = first_sun
    }
    this.addDate2(holyname, "Most Holy Name of Jesus");
   
    var nat = new Date(y, 8, 8);
    first_sun = Kalendar.findNextSunday(subDay(nat));
    if (diffDays(first_sun, nat) == 1) { // first_sun is day after then need to move a week
      holyname = addDays(first_sun, 6)
    } else {
      holyname = addDays(first_sun, -1)
    }
    this.addDate2(holyname, "The Most Holy Name of Mary")
  }

  addDate(m, d, name) {
    return(this.addAtPosition(m - 1, d - 1, name));
  }

  addDate2(date, name) {
    return(this.addAtPosition(date.getMonth(), date.getDate() - 1, name));
  }

  addAtPosition(mp, dp, name) {
    if(!(dp in this.dates[mp])) {
      var o = new KalendarDate(name);
      var r = o.getCelebrations()[0];
      this.dates[mp][dp] = o;
      return r;
    } else {
      return(this.dates[mp][dp].push(name));
    }
  }

  getDate(date) {
    if(date.getFullYear() != this.year) { 
      throw new Error("Asking for a date outside this kalendar object's year:" + date); 
    }
    var out = this.dates[date.getMonth()][date.getDate() - 1];
    if(out == undefined) { 
      var o = new KalendarDate("");
      this.dates[date.getMonth()][date.getDate() - 1] = o;
      return(o); 
    } else {
      return(out);
    }
  }

  findDate(name) {
    var len = this.dates.length;
    while (len--) {
      var dates = this.dates[len];
      var dateslen = dates.length;
      while (dateslen--) {
        if(dates[dateslen] != undefined && dates[dateslen].search("^" + name + "$")) {
          return(new Date(this.year, len, dateslen + 1));
        }
      }
    }
  }

  addOctaveSunday(date, octavename) {    
    var odate = Kalendar.findNextSunday(date);
    if(odate.getFullYear() == this.year) { // necessary because for Nativity Octave may be outside this year
      var odateobj = this.getDate(odate);
      var oday = odate.getDate()
      var d
      if(octavename == "the Nativity") {
        // special handling 
        if (oday != 29 && oday != 30 && oday != 31 && oday != 1) {
          var d29 = new Date(this.year, 11, 29); 
          d = this.addDate2(d29, "Office of Sunday within the Octave of the Nativity");   
          //this.getDate(d29).removeMatch(/within[\d\D]+octave/i);
        } else {
          d = this.addDate2(odate, "The Sunday within the Octave of " + octavename);
          odateobj.removeMatch(/within[\d\D]+octave/i);
        }
        d.klass = "Sd2";
      } else {
        var i = odateobj.removeMatch(/within[\d\D]+octave/i);
        if(i != -1) { // not found - i.e., the Octave Day itself
          d = this.addDate2(odate, "The Sunday within the Octave of " + octavename);
          d.klass = "Sd2";
        }
      }
    }
  }

  addSunday(date, name, cls) {
    cls = typeof cls !== 'undefined' ? cls : "Sd3"; // default parameter
    var d = this.addDate2(date, name);
    d.klass = cls;
    d.office = "Sd";
    d.obligation = true;
  }

  addSundaysAfterEpiphany() {
    var s = Kalendar.getSeptuagesima(this.year); 
    var ei = Kalendar.getFirstSundayInEpiphany(this.year);
    var eo = this.findDate("Octave Day of the Epiphany");
    var suffix = " Sunday after the Epiphany"
    var n = 1; // to keep the Sunday number

    // handle Vigil of Epiphany?
    // MD p. 221 - Jan 2, 3, or 4 is a Sunday then that's when the Office of the
    // Vigil of the Epiphany is done

    // if the Octave Day of Epiphany is on Sunday, 
    // anticpate Sunday within MD p. 228; 
    if(eo.getDay() == 0) {  
      var d2 = this.addDate2(addDays(ei, -1), "Sunday within the Octave of the Epiphany (anticipated)");
    } else {
      var d2 = this.addDate2(ei, "Sunday within the Octave of the Epiphany");
      d2.obligation = true;
    }
    d2.klass = "Sd1";
    d2.office = "Sd";

    var w = Kalendar.sundaysInEpiphany(this.year);  
    var p = 23; // if 7 or less Sundays in Epiphany can leave this at 23rd Sun
    if(w == 8) {
      p = 22; // if 8 start at the 22nd
    }
    // add the rest
    while(addWeek(ei) < s) {
      ei = addWeek(ei);
      if(n < 6) {
        this.addSunday(ei, romanNumeral(++n) + suffix);
      } else {
        this.addSunday(ei, romanNumeral(p++) + " Sunday after Pentecost [" + 
                  romanNumeral(p - 2) + " Trinity] (Anticipated) [" + romanNumeral(++n) + " Epiphany]");
      }
    }
  } 

  // TODO: there can be 21 weeks in Pentecost in Orthodox Reckoning... what to do there??
  addSundaysAfterTrinity() {
    var t = Kalendar.getTrinity(this.year);
    var a = Kalendar.getAdvent(this.year);
    var w = Kalendar.sundaysInPentecost(this.year);

    var nepi = (w - 24); // number of Epiphany Sundays resumed
    var esun = 6 - (w - 25); // which one to start with
    var n = 0;
    var stdadd = function(o, t, n) {  // the usual name to add
      o.addSunday(t, romanNumeral(n + 1) + " Sunday after Pentecost [" + 
                  romanNumeral(n) + " Trinity]");
    };
    var mthadd = function(o, t) {  // add I, II, III... in August, in September, etc.
      if(t.getMonth() == 6 && t.getDate() >= 29 || // on or after July 29th (see p. 424 Monastic Diurnal)
         t.getMonth() > 6 && t.getMonth() < 11) { // August to November,
        var y = t.getFullYear();
        var m = t.getMonth();
        var first_of_current = new Date(y, m, 1);
        var first_of_next = new Date(y, m + 1, 1);
        var days_to_next = diffDays(first_of_next, t);
        var sun_in_month = diffWeeks(t, first_of_current) + 1;
        if(days_to_next <= 3) { // anticipated first Sunday
          m = m + 1;
          sun_in_month = 1;
        } else if (first_of_current.getDay() != 0 && 
                   first_of_current.getDay() <= 3) {
          sun_in_month += 1; // will have anticipated first Sunday in previous month
        } 
        if(t.getMonth() == 10 && 
           t.getDate() > 5 &&
           (![5, 12, 19, 26].includes(t.getDate()))) {
          sun_in_month += 1
        }

        var d = o.addDate2(t, "(" + romanNumeral(sun_in_month) + " of " + months[m] + ")");
        d.klass = " ";
      }
    };
    var sunnxt = subWeek(a);
    while(addWeek(t) < sunnxt) {
      t = addWeek(t);
      ++n;
      if(n < 23) {
        stdadd(this, t, n);
      } else if(nepi > 0) {
        this.addSunday(t, romanNumeral(esun) + " Sunday after Epiphany (Resumed) [" +
                       romanNumeral(n) + " Trinity]");
        --nepi;
        ++esun;
      } 
      mthadd(this, t);
    }

    this.addSunday(sunnxt, "XXIV and Last Sunday after Pentecost [Sunday Next Before Advent]");
    mthadd(this, sunnxt);
    var k = this.addDate2(Kalendar.getTheKing(this.year), "The Feast of Our Lord Jesus Christ the King");
    k.klass = "D1";
    k.obligation = true;

    var wepi = Kalendar.sundaysInEpiphany(this.year);
    // are there left over Sundays?
    var osun = w + wepi;
    if(osun > 30) alert("Unexpected error: more than 30 Epiphany + Pentecost Sundays");
    if(osun < 29) alert("Unexpected error: less than 29 Epiphany + Pentecost Sundays");
    if(osun == 29) {
      // yes, are they from Epiphany or Pentecost?
      if(wepi < 6) {
        this.addSunday(subDay(Kalendar.getSeptuagesima(this.year)), "Office of the " + romanNumeral(wepi + 1) + " Sunday After Epiphany");
      } else {
        this.addSunday(subDay(sunnxt), "Office of the " + romanNumeral(w) + " Sunday After Pentecost [" + romanNumeral(w - 1) + " Trinity]");
      }
    }

    // add the Sundays within Octaves of Ascension, Corpus Christi, and the Nativity
    this.addOctaveSunday(
      Kalendar.getMoveable(this.year, "The Ascension of Our Lord"), 
      "the Ascension");
    this.addOctaveSunday(
      Kalendar.getMoveable(this.year, "The Feast of the Most Holy Body of Christ"), 
      "Corpus Christi");
    this.addOctaveSunday(new Date(this.year, 11, 25), "the Nativity", "DiO3");
    // for this calendar year also check the Octave of the previous Christmas
    this.addOctaveSunday(new Date(this.year - 1, 11, 25), "the Nativity");
  }

  getTopRankedClass(d) {
    return(this.getDate(d).getCelebrations()[0].klass);
  }

  isInClasses(d, classes) {
    var topRank = this.getTopRankedClass(d);
    return(classes.indexOf(topRank) != -1);
  }

  isDouble(d) {
    return(this.isInClasses(d, ["D1", "D2", "Gd", "D"]));
  }

  isOctaveDay(d) {
    return(this.isInClasses(d, ["OD1", "OD2", "OD3", "ODC", "ODS"]));
  }

  isDayInOctave(d) {
    return(this.isInClasses(d, ["DiO1", "DiO2", "DiO3", "DiOC"]));
  }

  isSunday(d) {
    return(d.getDay() == 0);
  }

  isSundayClass(d) {
    return(this.isInClasses(d, ["Sd1", "Sd2", "Sd3"])); 
  }

  isVigil(d) {
    return(this.isInClasses(d, ["V1", "V2", "V"]));
  }

  isPrivilagedFeria(d) { 
    return(this.isInClasses(d, ["F2"]));
  }

  determineAnticipation() {
    // walk through the year and inspect for anything that needs to be anticipated
    var d = new Date(this.year, 0, 1);
    var nye = new Date(this.year, 11, 31);
    while(d < nye) {
      var d1 = addDay(d);
      // check Sundays that are not impeded by Saturday Doubles or Octave Days
      if(this.isSunday(d1)) {
        var d1obj = this.getDate(d1)
        var celes = d1obj.getCelebrations();
        var celesClasses = celes.map(c => c.klass);
        var vigilIndex = celesClasses.indexOf("V");
        if(vigilIndex != -1) {
          var vigil = celes[vigilIndex];
          d1obj.removeMatch(vigil.name);
          var v = this.addDate2(d, vigil.name);
          if (this.isDouble(d) || this.isOctaveDay(d)) {
            d.klass = "Comm"
          }
        }
      }
      d = d1;
    }
  }

  specialDemotions() {
    // All Feasts of Major Double [Gd], or lower Rite, 
    // are entirely omitted on Easter Sunday and on the Monday and Tuesday of Easter Week.
    // -- From Matters Liturgical, #613
    var demote = [ "Gd", "iv", "D", "Sd", "F2b", 
                 "DiO3", "DiOC", "Comm", "F3", "V", "ODS", "BVM",
                  "M", " " ]; // from ranksorter
    var d = Kalendar.getEaster(this.year)
    var e = addDays(Kalendar.getEaster(this.year), 3)
    while(d < e) {
      var o = this.getDate(d);
      o.getCelebrations().map(c => { if(demote.indexOf(c.klass) != -1 &&
                                        c.name != "The Greater Litanies") { c.nothing = true; }})
      d = addDay(d);
    }
  }

  removeOctaves() {
    // no octaves during Lent through Tuesday of Holy Week
    var d = Kalendar.getAshWednesday(this.year)
    var e = addDays(Kalendar.getEaster(this.year), 3)
    const v = ["ODC", "ODS", "DiOC"];
      
    var rmoct = function(d, e, k) {
      while(d < e) {
        var o = k.getDate(d);
        o.getCelebrations().map(c => { 
          if (v.indexOf(c.klass) != -1 || 
              (c.nothing && c.name.includes("Octave"))) 
            { o.removeMatch(c.name); }
          }
        );
        d = addDay(d);
      }
    }

    rmoct(d, e, this);

    // remove Pentecost Octaves
    d = addDays(Kalendar.getTrinity(this.year), -7);
    e = addDays(e, 9);
    rmoct(d, e, this);

    // remove Nativity Octaves
    d = new Date(this.year, 11, 17);
    e = new Date(this.year, 11, 26);
    rmoct(d, e, this);
  }

  addSatOfficeOfBVM() {
    // find first Saturday of the year
    var nyd = new Date(this.year, 0, 1);
    var sat = addDays(nyd, 6 - nyd.getDay());
    var nye = new Date(this.year, 11, 31);
    while(sat < nye) {
      var topRank = this.getDate(sat).getCelebrations()[0].klass;
      if((!(sat > Kalendar.getSeptuagesima(this.year) &&
            sat < Kalendar.getEaster(this.year))) &&
         (!(sat > Kalendar.getAdvent(this.year) &&
          sat < new Date(this.year, 11, 25))) && 
         // include Sundays because they can be anticipated
         ["Sd1", "Sd2", "Sd3", "D1", "D2", "Gd", "D", "V1", "V2", "V", "F2",
          "OD1", "OD2", "OD3", "ODC", "ODS", 
          "DiO1", "DiO2", "DiO3", "DiOC"].indexOf(topRank) == -1) {
        var a = this.addDate2(sat, "Saturday Office of the B.V.M.");
        a.klass = "BVM";
        a.office = "S";
      }
      sat = addWeek(sat);
    }
  }

  addFerias() {
    var start = Kalendar.getSeptuagesima(this.year);
    var end = Kalendar.getAshWednesday(this.year);
    var d = start;
    while(d < end) {
      if(!this.isSunday(d)) {
        var a = this.addDate2(d, "Septuagesimatide Feria");
        a.klass = "F3";
      }
      d = addDay(d);
    }
    var start = Kalendar.getAdvent(this.year);
    var end = new Date(this.year, 11, 24);
    var d = start;
    while(d < end) {
      if(!this.isSunday(d) && !this.getDate(d).search(/Ember/)) {
        var a = this.addDate2(d, "Advent Feria");
        a.klass = "F3"; 
      }
      d = addDay(d);
    }
  }
  
  addGreaterLitanies() {
    // Following a precedent from a 19th century Ordo, 
    // Fr Ed has approved moving the Greater Litanies to the Tuesday after Easter. 
    // (The MD rubric does not assume the Julian calendar with its idiosyncrasies.)
 
    // MD rubric is if Easter falls on April 25 transfer 
    // to the next Tuesday; based on above am transferring if Palm Sunday onwards
    var e = Kalendar.getEaster(this.year);
    var ps = addDays(e, -7);
    var d = new Date(this.year, 3, 25);
    if (d >= ps && d < addDays(e, 1)) {
      d = addDays(e, 2);
    } 
    this.addDate2(d, "The Greater Litanies");
  }

  removeTranslatedOctaves(o) {
    // if getCelebrations has an octave day in it 
    // of one of the feasts toTranslate then remove it
    var tt = this.toTranslate.map(c => c.name);
    var rm = o.getCelebrations().filter(c => tt.includes(c.feast));
    rm.map(c => o.removeMatch(c.name));
  } 

  doTranslations(o) {
    // check the class of the first in getCelebrations which is ordered to be highest rank
    var toprank = o.getCelebrations()[0].klass;
    var next2trans = this.toTranslate[0];
    var free = ["D1", "D2", "Sd1", "Sd2", "Sd3", "V1", "F1", "DiO1", "OD2"].
        indexOf(toprank) == -1; // if toprank isn't found here the day is free for a translation...
    if(next2trans != undefined) {
      // ... unless
      if(toprank == "DiO2" && next2trans.klass == "D2") { free = false; }
      this.removeTranslatedOctaves(o);
      if(free) {
        this.toTranslate.shift();
        var c = o.push(next2trans.name);
        c.transferred = true;
      }
    }
  }

  determinePrecedence() {
    // iterate over the entire calendar and sort out these issues
    var d = new Date(this.year, 0, 1);
    while(d.getFullYear() == this.year) {
      var o = this.getDate(d);
      this.doTranslations(o);
      if(o.getCelebrations().length > 1) {  // don't look unless more than one thing on same day
        var tl = o.needsTranslation();
        if(tl.length > 0) { 
          // save them for later translation
          this.toTranslate.push.apply(this.toTranslate, tl);
          // remove them from their current position
          tl.map(function(s) { o.removeMatch(s.name); }, this);
        }
        o.demoteToCommOrNothing();
        // TODO: for parity see if secondary = "y" or if day of obligation/devotion
      }
      d = addDay(d);
    }
  }
};



class KalendarDate {

  constructor(name) {
    this.celes = [];
    this.push(name);
  }

  // TODO: rank octaves with each other
  ranksorter(c1, c2) {
    var rank = [ "Sd1", "F1", "V1", "DiO1", "OD2", "D1", "Sd2", "DiO2", "D2", "F2",  
                 "Sd3", "OD3", "ODC",  
                 "V2", "Gd", "iv", "D", "Sd",
                 "F2b", // added for Friday after Octave of Ascension
                 "DiO3", "DiOC", "Comm", "F3", "V", "ODS", "BVM",
                  "M", " " ]; // cannot use blank string because has falsity
    var s1 = c1.klass;
    var s2 = c2.klass;
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
  }

  search(pattern) {
    return(this.celes.some(c => c.search(pattern) !== -1));
  }

  match(pattern) {
    return(this.celes.some(c => c.match(pattern)));
  }

  removeMatch(pattern) {
    var i = this.celes.findIndex( c => c.name.search(pattern) !== -1 );
    if(i != -1) { // not found
        this.celes = this.celes.slice(0, i).concat(this.celes.slice(i + 1));
    }
    return(i);
  }

  valueEqual(valname, value) {
    return(this.celes.some(c => c.getValue(valname) == value));
  }

  push(name) {
    var o = new KalendarCelebration(name);
    this.celes.push(o);
    return(o);
  }

  getCelebrations() {
    var o = this.celes.sort(this.ranksorter);
    var celesClasses = o.map(c => c.klass);
    var commIndex = celesClasses.indexOf("Comm");
    if(commIndex != -1) {
      // splice the comm out and put it at the second
      // (index = 1) position
      var comm = o.splice(commIndex, 1);
      o.splice(1, 0, comm[0]); 
    }
    return(o);
  }

  names() {
    return(this.celes.map(c => c.name));
  }

  makeClassTable() {
    // returns class name to count mapping falling on this day
    return(
      this.celes.
        map(o => o.klass).
        reduce(
          function(a, c) {
            // if the class has been seen... 
            if(c in a) {
              a[c] += 1;  // add one to current number of times seen
            } else {
              a[c] = 1;   // otherwise initalize it with 1
            }
            return(a);
          }, 
          {} // empty object as initial value
        )
    );
  }

  filterMaker(classes) {
      function filter(o) {
        var cstr = o.klass;
        return(classes.some(c => c == cstr)); 
      }
      return(filter);
  }

  lessWorthy(rank) {
    var rankedCeles = this.getCelebrations();
    var s = rankedCeles.filter(this.filterMaker([rank])).
        sort((o1, o2) => o1.rank - o2.rank);
    // the s.shift() below removes the highest rank (lowest number) from being
    // transferred/demoted
    // console.log("Preserved " + rank + ": " + s.shift().getName() +
    //            " vs. " + s.map(function(o) { return(o.getName()); }).toString());
    s.shift();
    return(s);
  }

  lessWorthies(classname) {
    var ct = this.makeClassTable();
    if(ct[classname] > 1) {
      return(this.lessWorthy(classname));
    } else {
      return([]);
    }
  }

  addCommOf(o) {
    o.name = "Commemoration of " + o.name; 
  }
  
  processDemotion(o) {
    if(o.klass == "F3") {
      this.addCommOf(o)
    } 
  }

  processNothing(o) {
    o.nothing = true
    o.klass = " "
  }

  demoteAndNothing(demoteIt, nothingIt) {
    var rankedCeles = this.getCelebrations();
    if(demoteIt.length > 0) {
      rankedCeles.
        filter(this.filterMaker(demoteIt)).
        forEach(o => this.processDemotion(o)); 
    }
    if(nothingIt.length > 0) {
      rankedCeles.
        filter(this.filterMaker(nothingIt)).
        forEach(o => this.processNothing(o));
    }
  }

  demoteToCommOrNothing() { 
    var topRank = this.getCelebrations()[0].klass;
    switch(topRank) {
      case "D1":
        this.demoteAndNothing(["Sd2", "Sd3", "V2", "ODC", "OD3", "Gd", 
                          "D", "DiO2", "DiO3", "F2b", "F3"],
                         ["DiOC", "ODS", "V", "M"]);
        break;
      case "D2":
        this.demoteAndNothing(["Sd3", "V2", "ODC", "OD3", "Gd", 
                          "D", "DiO3", "F2b", "F3", "ODS"],
                         ["DiOC"]);
        break;
      case "Sd1":  case "Sd2": case "Sd3":
      case "V1":   case "V2":
      case "F1":   case "F2":
      case "DiO1": case "OD2":  
        this.demoteAndNothing(["ODC", "Gd", "D", "DiOC", "ODS", "M", "F3"], ["V"]);
        break;
      case "ODC":
      case "OD3": 
        this.demoteAndNothing(["Gd"], []);
        this.lessWorthies("ODC").forEach(o => this.processDemotion(o));
        this.lessWorthies("OD3").forEach(o => this.processDemotion(o));
        //fall through
      case "Gd":
        this.lessWorthies("Gd").forEach(o => this.processDemotion(o));
        //fall through
      case "D":
        this.demoteAndNothing(["DiOC", "V", "ODS", "F3", "M"], []);
        this.lessWorthies("D").forEach(o => this.processDemotion(o));
        break;
      case "DiO2":
        this.demoteAndNothing(["ODC", "Gd", "D", "DiOC", "ODS", "V", "M", "F3"], []);
        break;
      case "DiO3": case "F2b": 
        this.demoteAndNothing(["DiOC", "ODS", "M", "F3"], []);
        break;
      case "DiOC":
        this.demoteAndNothing(["F3"], []);
        break;
      case "V":
        this.demoteAndNothing(["ODS"], ["F3"]);
        break;
      case "F3": 
        this.demoteAndNothing(["ODS", "M"], ["V"]);
        break;
      case "ODS":
        this.demoteAndNothing(["M"], []);
        this.lessWorthies("ODS").forEach(o => this.processDemotion(o));
        break;
      case "BVM":
        this.demoteAndNothing(["M"], []);
        break;
    }
  }

  needsTranslation() {
    var rankedCeles = this.getCelebrations();
    var topRank = rankedCeles[0].klass;
    var toTranslate = [];
    switch(topRank) {
      case "Sd1":
      case "F1":
      case "V1":
      case "DiO1":
      case "OD2":
        toTranslate = rankedCeles.filter(this.filterMaker(["D1", "D2"]));
        break;
      case "Sd2":
      case "DiO2":
      case "D1":
        toTranslate = rankedCeles.filter(this.filterMaker(["D2"]));  
        this.lessWorthies("D1").forEach(function(o) { toTranslate.push(o); });
        break;
      case "D2":
        this.lessWorthies("D2").forEach(function(o) { toTranslate.push(o); });
        break;
    }
    return(toTranslate);
  }
};

class KalendarCelebration {
  
  constructor(name) {
    this._name = name;
    this.metasetter("class", " ", "klass");
    this.metasetter("office", this._klass);
    this.metasetter("octave", "N");
    this.metasetter("feast", " ");
    this.metasetter("obligation", false);
    this.metasetter("devotion", false);
    this.metasetter("rank", 100);
    this.metasetter("secondary", false);
    this.metasetter("transferred", false);
    this.metasetter("nothing", false);
  }

  metasetter(name, defaultvalue, altname = name) {
    var m = meta[this._name];
    if(m != undefined && m[name] != undefined) {
      var val = m[name];
      if(m[name] == "y") val = true; 
      if(m[name] == "n") val = false; 
      this["_" + altname] = val;
    } else {
      this["_" + altname] = defaultvalue;
    }
  }

  get name() { return this._name; }
  set name(o) { this._name = o; }
  
  get klass() { return this._klass; }
  set klass(o) { this._klass = o; }

  get office() {
    if(this._office == " ") {
      return(this._klass);
    } else {
      return(this._office);
    }
  }

  set office(o) {
    this._office = o;
  }

  get octave() { return this._octave; }
  set octave(o) { this._octave = o; }

  get feast() { return this._feast; }
  set feast(o) { this._feast = o; }

  get obligation() { return this._obligation; }
  set obligation(o) { this._obligation = o; }

  get devotion() { return this._devotion; }
  set devotion(o) { this._devotion = o; }

  get secondary() { return this._secondary; }
  set secondary(o) { this._secondary = o; }

  get transferred() { return this._transferred; }
  set transferred(o) { this._transferred = o; }

  get nothing() { return this._nothing; }
  set nothing(o) { this._nothing = o; }
  
  search(pattern) { return this.name.search(pattern); }

  match(pattern) { return this.name.match(pattern); }

}
