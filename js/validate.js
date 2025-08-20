/* assets/validate.js – JSON-Schema-Check (leichtgewichtig, offline) */
export function validateEvents(data, schema){
  const errors = [];
  if(!Array.isArray(data)) return [{path:'/', msg:'Events-Datei muss ein Array sein.'}];
  const req = (schema && schema.items && schema.items.required) ? new Set(schema.items.required) : new Set(['id','title','date','status']);
  const props = (schema && schema.items && schema.items.properties) ? schema.items.properties : {};
  const validDate = (s)=> /^\d{4}-\d{2}-\d{2}$/.test(s);
  const validStatus = (s)=> ['planned','productive','done'].includes(s);
  const validWeekday = new Set(['MO','TU','WE','TH','FR','SA','SU']);

  data.forEach((ev, idx)=>{
    const path = `/[${idx}]`;
    // Required
    [...req].forEach(r=>{ if(!(r in ev)) errors.push({path, msg:`Pflichtfeld fehlt: ${r}`}); });
    // Base
    if('date' in ev && ev.date && !validDate(ev.date)) errors.push({path, msg:'date muss YYYY-MM-DD sein'});
    if('status' in ev && ev.status && !validStatus(ev.status)) errors.push({path, msg:'status muss planned|productive|done sein'});
    if('tags' in ev && !Array.isArray(ev.tags)) errors.push({path, msg:'tags muss Array sein'});
    if('platform' in ev && ev.platform!=null && typeof ev.platform!=='string') errors.push({path, msg:'platform muss String sein'});
    // Ranges
    if('start_date' in ev && ev.start_date && !validDate(ev.start_date)) errors.push({path, msg:'start_date muss YYYY-MM-DD sein'});
    if('end_date' in ev && ev.end_date && !validDate(ev.end_date)) errors.push({path, msg:'end_date muss YYYY-MM-DD sein'});
    if(ev.start_date && ev.end_date && ev.start_date>ev.end_date) errors.push({path, msg:'start_date darf nicht nach end_date liegen'});
    if('deadline' in ev && ev.deadline && !validDate(ev.deadline)) errors.push({path, msg:'deadline muss YYYY-MM-DD sein'});
    // Recurrence (simple)
    if('recurrence' in ev && ev.recurrence){
      const r = ev.recurrence;
      if(r.byweekday){
        if(!Array.isArray(r.byweekday) || r.byweekday.some(d=>!validWeekday.has(d))) errors.push({path, msg:'recurrence.byweekday ungültig'});
      }
      if(r.interval && (typeof r.interval!=='number' || r.interval<1)) errors.push({path, msg:'recurrence.interval muss Zahl >=1'});
      if(r.count && (typeof r.count!=='number' || r.count<1)) errors.push({path, msg:'recurrence.count muss Zahl >=1'});
      if(r.until && !validDate(r.until)) errors.push({path, msg:'recurrence.until muss YYYY-MM-DD sein'});
      if(r.rrule && typeof r.rrule!=='string') errors.push({path, msg:'recurrence.rrule muss String sein'});
    }
  });
  return errors;
}