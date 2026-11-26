import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarGestureAxis} from './calendar-gesture-axis.ts';

test('calendar paging accepts a diagonal thumb swipe and preserves vertical scrolling',()=>{
 const start={x:146,y:200};
 assert.equal(calendarGestureAxis(start,{x:138,y:205}),'undecided');
 assert.equal(calendarGestureAxis(start,{x:124,y:216}),'horizontal');
 assert.equal(calendarGestureAxis(start,{x:169,y:217}),'horizontal');
 assert.equal(calendarGestureAxis(start,{x:134,y:229}),'vertical');
});
