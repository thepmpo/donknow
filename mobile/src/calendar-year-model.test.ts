import {test} from 'node:test';
import assert from 'node:assert/strict';
import {boundedYear,miniMonthWeeks,yearMonths,yearZoomTransform} from './calendar-year-model.ts';

test('year navigation stays within the supported date range',()=>{
 assert.equal(boundedYear(1899),1900);assert.equal(boundedYear(2101),2100);
 assert.deepEqual(yearMonths(2026),Array.from({length:12},(_,i)=>'2026-'+String(i+1).padStart(2,'0')));
});
test('miniature November shares correct weekday positions with the real calendar',()=>{
 const weeks=miniMonthWeeks('2026-11');assert.equal(weeks.length,6);assert.equal(weeks[0][0],'2026-11-01');assert.equal(weeks[1][6],'2026-11-14');assert.deepEqual(weeks[4],['2026-11-29','2026-11-30',null,null,null,null,null]);
 assert.ok(weeks[5].every(day=>day===null));
 assert.equal(miniMonthWeeks('2026-11',1)[0][6],'2026-11-01');
});
test('miniatures preserve Gregorian leap-year rules including century boundaries',()=>{
 assert.equal(miniMonthWeeks('1900-02').flat().filter(Boolean).length,28);
 assert.equal(miniMonthWeeks('2000-02').flat().filter(Boolean).length,29);
});
test('zoom uses pane-local centers and uniform scale without stretching text',()=>{
 assert.deepEqual(yearZoomTransform({width:400,height:600},{x:200,y:100,width:180,height:150}),{scale:.25,x:90,y:-125});
 const tiny=yearZoomTransform({width:0,height:0},{x:0,y:0,width:0,height:0});assert.ok(Number.isFinite(tiny.scale)&&tiny.scale>0);
});
