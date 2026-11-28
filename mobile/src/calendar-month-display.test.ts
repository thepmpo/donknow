import test from 'node:test';
import assert from 'node:assert/strict';
import {monthDayLayout,monthEventPalette,monthStartLabel} from './calendar-month-display.ts';
import type {CalendarEvent} from './calendar-model.ts';

const day='2026-11-28';
const timed:CalendarEvent={id:'timed',title:'시간 일정',dueDate:day,startAt:day+'T05:30:00Z',endAt:day+'T06:30:00Z'};
const allDay:CalendarEvent={id:'all-day',title:'종일 일정',dueDate:day,allDay:true};

test('month cards use Korean local time and show continuation without the previous day’s start',()=>{
 assert.equal(monthStartLabel(timed,day,'Asia/Seoul'),'오후 2:30');
 assert.equal(monthStartLabel({...timed,startAt:day+'T00:00:00Z'},day,'Asia/Seoul'),'오전 9시');
 assert.equal(monthStartLabel(timed,'2026-11-29','Asia/Seoul'),'계속');
 assert.equal(monthStartLabel(allDay,day,'Asia/Seoul'),'');
});
test('month layout fits the most titles first, then adds time and wrapping as space allows',()=>{
 const tall=monthDayLayout([timed,allDay],0,74,1);
 assert.deepEqual(tall.cards.map(card=>[card.event.id,card.titleLines,card.showTime]),[['all-day',1,false],['timed',2,true]]);
 const compact=monthDayLayout([timed,allDay],2,59,1);
 assert.equal(compact.cards.length,2);
 assert.equal(compact.remaining,2);
 assert.ok(compact.cards.reduce((height,card)=>height+card.height+3,13)<=59);
 const noRoom=monthDayLayout([timed],0,13,1);
 assert.deepEqual([noRoom.cards.length,noRoom.overflowFits,noRoom.remaining],[0,true,1]);
});
test('source-derived month colors maintain text contrast in light and dark',()=>{
 function luminance(hex:string){
  const channels=[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16)/255)
   .map(channel=>channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4);
  return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
 }
 for(const color of ['#ffffff','#000000','#1b64da','#ff0000','#008f99','#ffff00','#ff00ff']){
  for(const dark of [false,true]){
   const {text,background}=monthEventPalette(color,dark)!;
   const [darker,lighter]=[luminance(text),luminance(background)].sort((a,b)=>a-b);
   assert.ok((lighter+.05)/(darker+.05)>=4.5);
  }
 }
});
