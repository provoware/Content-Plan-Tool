(function(global){
  'use strict';
  function formatDateTime(date, hour12, locale){
    const opts = {dateStyle:'medium', timeStyle:'medium'};
    if (hour12 !== undefined) opts.hour12 = !!hour12;
    try {
      return new Intl.DateTimeFormat(locale || (global.navigator && global.navigator.language) || 'de-DE', opts).format(date);
    } catch (err) {
      return date.toISOString();
    }
  }
  if (typeof module !== 'undefined' && module.exports){
    module.exports = { formatDateTime };
  } else {
    global.formatDateTime = formatDateTime;
  }
})(typeof window !== 'undefined' ? window : globalThis);
