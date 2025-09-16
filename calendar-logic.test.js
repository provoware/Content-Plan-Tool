const { expandRangesAndRecurrence, parseCSV, toEvents } = require('./js/calendar-logic.js');

test('expandRangesAndRecurrence erweitert Serien und Deadlines im Monat', () => {
  const events = [
    {
      id: 'serie',
      title: 'Wöchentlicher Stream',
      start_date: '2024-01-01',
      end_date: '2024-01-01',
      status: 'productive',
      recurrence: { freq: 'WEEKLY', byweekday: ['MO'], interval: 1 },
      deadline: '2024-01-10'
    }
  ];
  const result = expandRangesAndRecurrence(events, 2024, 0);
  const dates = result.filter(ev => !ev._deadline).map(ev => ev.date).sort();
  expect(dates).toEqual([
    '2024-01-01',
    '2024-01-08',
    '2024-01-15',
    '2024-01-22',
    '2024-01-29'
  ]);
  const deadlines = result.filter(ev => ev._deadline).map(ev => ev.date);
  expect(deadlines).toEqual(['2024-01-10']);
});

test('parseCSV und toEvents verarbeiten Felder mit Anführungszeichen und Wiederholungen', () => {
  const csv = 'id,title,date,status,tags,rrule,freq,interval,byweekday\n' +
    '42,"Planung, Social","2024-03-05","done","planung;social","FREQ=MONTHLY;INTERVAL=2","weekly","2","MO|WE"';
  const rows = parseCSV(csv);
  expect(rows.length).toBe(2);
  const events = toEvents(rows);
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    id: '42',
    title: 'Planung, Social',
    date: '2024-03-05',
    status: 'done',
    tags: ['planung', 'social'],
    recurrence: {
      rrule: 'FREQ=MONTHLY;INTERVAL=2',
      freq: 'WEEKLY',
      interval: 2,
      byweekday: ['MO', 'WE']
    }
  });
});
