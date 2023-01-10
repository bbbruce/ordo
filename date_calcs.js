export function leapYear(year) {
  return (year & 3) == 0 && ((year % 25) != 0 || (year & 15) == 0);
}

export function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function subDay(date) {
  return(addDays(date, -1));
}

export function addDay(date) {
  return(addDays(date, 1));
}

export function subWeek(date) {
  return(addDays(date, -7));
}

export function addWeek(date) {
  return(addDays(date, 7));
}

export function diffDays(date2, date1) {
  return(Math.round(date2 - date1)/(24 * 60 * 60 * 1000));
}

export function diffWeeks(date2, date1) {
  return(Math.floor(diffDays(date2, date1) / 7));
}
