import {test} from 'node:test';import assert from 'node:assert/strict';
import {publicAsset,realLanding,downloadable} from '../tools/website-reference/policy.mjs';
test('reference download is limited to public approved asset hosts, with no credentials or token query',()=>{
 for(const url of ['https://pickle.com/landing/image.webp','https://d3h202kifjtcwm.cloudfront.net/landing/video.mp4','https://fonts.gstatic.com/font.woff2'])assert.equal(publicAsset(url),true);
 for(const url of ['http://pickle.com/a','https://localhost/a','https://127.0.0.1/a','https://pickle.com.evil.test/a','https://u:p@pickle.com/a','https://pickle.com/a?access_token=private'])assert.equal(publicAsset(url),false);
});
test('source error, access gate and short metadata cannot be accepted as visual source',()=>{
 for(const text of ['Something went wrong Reload'.repeat(30),'Access Denied'.repeat(40),'피클 AI'])assert.equal(realLanding(text),false);
 assert.equal(realLanding('피클 AI 에이전트 소개 '+ '공개 홈페이지 내용 '.repeat(50)),true);
});
test('reference archive excludes partial/empty/oversized responses and caps total bytes',()=>{
 const base={status:200,type:'image/png',length:100,total:0};assert.equal(downloadable(base),true);
 for(const patch of [{status:206},{length:0},{length:26*1024*1024},{total:120*1024*1024},{type:'text/html'}])assert.equal(downloadable({...base,...patch}),false);
});
