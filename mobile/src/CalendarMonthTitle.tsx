import React,{useLayoutEffect,useRef,useState} from 'react';
import {I18nManager,Text,View} from 'react-native';
import type {TextStyle,ViewStyle} from 'react-native';
import {monthLabelScale,monthTitleFadeWidth,monthTitleLine} from './calendar-month-display';

export function CalendarMonthTitle({title,lines,color,fontScale}:{
 title:string;lines:number;color:string;fontScale:number;
}){
 const clip=useRef<React.ComponentRef<typeof View>>(null);
 const [clipped,setClipped]=useState(false);
 const lineHeight=Math.ceil(monthTitleLine*Math.min(fontScale,monthLabelScale));
 useLayoutEffect(()=>{
  const node=clip.current as unknown as HTMLElement|null;
  if(!node)return;
  let alive=true;
  const measure=()=>{
   if(alive)setClipped(node.scrollHeight>node.clientHeight+1||node.scrollWidth>node.clientWidth+1);
  };
  measure();
  const observer=new ResizeObserver(measure);
  observer.observe(node);
  void document.fonts?.ready.then(measure);
  return()=>{alive=false;observer.disconnect();};
 },[title,lines,lineHeight]);

 const direction=I18nManager.isRTL?'left':'right';
 const fade=`linear-gradient(to ${direction}, black calc(100% - ${monthTitleFadeWidth}px), transparent)`;
 const mask={
  maskImage:lines===1?fade:fade+', linear-gradient(black, black)',
  maskSize:lines===1?'100% 100%':`100% ${lineHeight}px, 100% calc(100% - ${lineHeight}px)`,
  maskPosition:'bottom, top',maskRepeat:'no-repeat',
 } as ViewStyle;
 return <View ref={clip} testID={clipped?'month-title-fade':undefined} style={[{maxHeight:lineHeight*lines,overflow:'hidden'},clipped&&mask]}>
  <Text maxFontSizeMultiplier={monthLabelScale} style={[
   {fontSize:13,lineHeight,fontWeight:'600',color},
   lines===1&&({whiteSpace:'nowrap'} as TextStyle),
  ]}>{title}</Text>
 </View>;
}
