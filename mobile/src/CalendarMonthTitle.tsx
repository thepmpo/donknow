import React,{useLayoutEffect,useRef,useState} from 'react';
import {I18nManager,Platform,StyleSheet,Text,View} from 'react-native';
import type {ViewStyle} from 'react-native';
import {monthLabelScale,monthTitleLine} from './calendar-month-display';

export function CalendarMonthTitle({title,lines,color,background,fontScale}:{
 title:string;lines:number;color:string;background:string;fontScale:number;
}){
 const textRef=useRef<React.ComponentRef<typeof Text>>(null);
 const [measured,setMeasured]=useState<{title:string;lines:number;clipped:boolean}>();
 const clipped=measured?.title===title&&measured.lines===lines&&measured.clipped;
 function report(next:boolean){
  setMeasured(previous=>previous?.title===title&&previous.lines===lines&&previous.clipped===next?previous:{title,lines,clipped:next});
 }
 useLayoutEffect(()=>{
  if(Platform.OS!=='web'||!textRef.current)return;
  const node=textRef.current as unknown as HTMLElement;
  let alive=true;
  const measure=()=>{
   if(alive)report(node.scrollHeight>node.clientHeight+1||node.scrollWidth>node.clientWidth+1);
  };
  measure();
  const observer=new ResizeObserver(measure);
  observer.observe(node);
  void document.fonts?.ready.then(measure);
  return()=>{alive=false;observer.disconnect();};
 },[title,lines,fontScale]);

 const direction=I18nManager.isRTL?'left':'right';
 const gradient=`linear-gradient(to ${direction}, transparent, ${background})`;
 const fade:ViewStyle=Platform.OS==='web'?{backgroundImage:gradient} as ViewStyle:{experimental_backgroundImage:gradient};
 return <View>
  <Text ref={textRef} numberOfLines={lines} ellipsizeMode="tail" maxFontSizeMultiplier={monthLabelScale} style={[styles.title,{color}]}>{title}</Text>
  {Platform.OS!=='web'&&<Text pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
   maxFontSizeMultiplier={monthLabelScale} style={[styles.title,styles.measure]} onTextLayout={event=>report(event.nativeEvent.lines.length>lines)}>{title}</Text>}
  {clipped&&<View testID="month-title-fade" pointerEvents="none" style={[styles.fade,{height:Math.ceil(monthTitleLine*Math.min(fontScale,monthLabelScale))},fade]}/>}
 </View>;
}
const styles=StyleSheet.create({
 title:{fontSize:13,lineHeight:monthTitleLine,fontWeight:'600'},
 measure:{position:'absolute',start:0,end:0,top:0,opacity:0},
 fade:{position:'absolute',end:0,bottom:0,width:12,opacity:.72},
});
