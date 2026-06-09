"use strict"
import {addDays, diffDays, diffWeeks, addWeek, subWeek, addDay, subDay} from './date_calcs.js';

export default function updateKalendar(d, k) {
  var i = 1;
  var head = true;
  var timewidget = '<tr><td colspan="5" align="center"><div class="timenav"> \
      <div> \
      <button title="Back one year" onclick="d = new Date(d.getFullYear() - 1, d.getMonth(), d.getDate()); updateKalendar(d, k);">&lt;&lt;&lt;</button> \
      <button title="Back 28 days" onclick="d = addDays(d, -28); updateKalendar(d, k);">&lt;&lt;</button> \
      <button title="Back 1 day" onclick="d = addDays(d, -1); updateKalendar(d, k);">&lt;</button> \
      <button onclick="d = new Date(); updateKalendar(d, k);">Today</button> \
      <button title="Forward 1 day" onclick="d = addDays(d, 1); updateKalendar(d, k);">&gt;</button> \
      <button title="Forward 28 days" onclick="d = addDays(d, 28); updateKalendar(d, k);">&gt;&gt;</button> \
      <button title="Forward 1 year" onclick="d = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()); updateKalendar(d, k);">&gt;&gt;&gt;</button> \
      </div> \
    </div></td></tr>';
  var makeClassSpan = function(fldstr) {
    var rn = ranknames[fldstr];
    return("<span" + (rn == undefined ? ">" : (" title='" + rn + "'>")) +
           fldstr + "</span>");
  }
  var makeCelebrationTable = function(d) {
    var cc = k.getDate(d).getCelebrations();
    var m = cc.map(
      function(c, i) {
        return(
          "<tr" +
            (d.getDay() == 0 & i == 0 ? " style='font-weight: 700;'>" : ">") +
            "<td style='width: 1em'>" +
            (c.obligation ? "<span class='obligation' title='Day of Obligation'>†</span>" : "") +
            (c.devotion ? "<span class='devotion' title='Day of Devotion'>‡</span>" : "") +
            "</td><td>" +
            (c.nothing ? "<span style='color: gray; text-decoration: line-through;'>" : "") +
            (d.getDay() == 0 & i == 0 ? c.name.toUpperCase() : c.name) +
            (c.transferred ? " (transferred)" : "") +
            (c.nothing ? "</span>" : "") +
            "</td><td align='right' style='width: 3em'>" +
            makeClassSpan(c.office) +
            "</td></tr>");
      }
    );
    return("<table class='celetab'>" + m.join("") + "</table>");
  }
  $("#kalendar").children().remove();

  $("#kalendar").append(timewidget);

  while (i < 366) {
    if(d.getMonth() == 0 && d.getDate() == 1 || head) {
      $("#kalendar").append('<tr><td colspan="5" class="year">' +  d.getFullYear()  +  "</td><tr>");
    }
    if(d.getDate() == 1 || head) {
      $("#kalendar").append('<tr><td colspan="5" class="month">' +  months[d.getMonth()] +  "</td><tr>");
      head = false;
    }
    $("#kalendar").
      append("<tr" +
             (d.getDay() == 0 ? " style='font-weight: 700;'>" : ">") +
             "<td class='date'>" + d.getDate() + "</td><td class='dow'>" +
             daysofweek[d.getDay()] + "</td><td>" +
             (k.isAbstinence(d) ? '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="35.812px" height="10.458px" viewBox="14.991 13.46 35.812 10.458" enable-background="new 14.991 13.46 35.812 10.458" xml:space="preserve"><g transform="matrix(8,0,0,-8,12,18)"><path d="M1.143-0.038c0.091,0,0.163,0.073,0.163,0.163c0,0.092-0.072,0.164-0.163,0.164c-0.09,0-0.162-0.073-0.162-0.164 C0.981,0.035,1.053-0.038,1.143-0.038 M0.378-0.244L0.378-0.244C0.375-0.241,0.374-0.237,0.374-0.233 c0,0.009,0.007,0.017,0.016,0.017l0.476-0.001c0.024,0,0.043,0.019,0.043,0.042c0,0.017-0.009,0.03-0.026,0.039L0.451,0.069 C0.443,0.074,0.437,0.083,0.437,0.093c0,0.008,0.003,0.016,0.008,0.02c0,0,1.133,1.002,3.64,0.03L4.774,0.48 c0.007,0.003,0.014,0.006,0.023,0.006c0.029,0,0.053-0.024,0.053-0.053c0-0.011-0.003-0.02-0.008-0.028L4.436-0.1l0.407-0.506 C4.847-0.613,4.85-0.623,4.85-0.634c0-0.029-0.024-0.053-0.053-0.053c-0.009,0-0.016,0.002-0.023,0.005L4.085-0.344 C4.085-0.344,1.688-1.298,0.378-0.244"/></g><title>Day of Abstinence</title></svg>' : "") +
             "</td><td>" +
             (k.isFast(d) ? "<span class='fasting' title='Day of Fasting'>§</span>" : "") +
             "</td><td>" +
             makeCelebrationTable(d) + // inner table for celebrations
             "</td></tr>"
      );
    d = addDays(d, 1);
    i++;
  }
  // remove the border from the last row
  $("#kalendar td.year").parent().prev().find("td").css("border", "0");
  $("#kalendar td.month").parent().prev().find("td:not(.year)").css("border", "0");

  $("#kalendar").append(timewidget);
}
