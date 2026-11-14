import React,{forwardRef,useEffect,useRef,useState} from 'react';
import {Animated,Platform,ScrollView,StyleSheet} from 'react-native';
import type {ScrollViewProps} from 'react-native';
import {colors} from './theme';
import {useDuoScene} from './DuoChrome';
import {useReducedMotion} from './motion';

/** Retains the native scroll/ref node; the decorative thumb scrolls in content coordinates. */
export const ScrollArea=forwardRef<React.ComponentRef<typeof ScrollView>,ScrollViewProps>(function ScrollArea({children,onScroll,onLayout,onContentSizeChange,onScrollBeginDrag,onMomentumScrollBegin,style,testID,...props},ref){
 const {scene,showScroll,clearScroll}=useDuoScene(),id=useRef(Symbol()),progress=useRef(new Animated.Value(0)).current;
 const reduced=useReducedMotion(),opacity=useRef(new Animated.Value(0)).current,y=useRef(new Animated.Value(0)).current;
 const dimensions=useRef({viewport:0,content:0,offset:0}),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),[metrics,setMetrics]=useState({viewport:0,content:0});
 const overflow=!props.horizontal&&metrics.content>metrics.viewport+1&&metrics.viewport>0,track=Math.max(0,metrics.viewport-8),thumb=Math.min(track,Math.max(18,track*metrics.viewport/Math.max(1,metrics.content)));
 const current=useRef({reduced,thumb});current.current={reduced,thumb};
 function position(){const d=dimensions.current,offset=Math.max(0,Math.min(Math.max(0,d.content-d.viewport),d.offset)),height=Math.max(0,d.viewport-8),length=Math.min(height,Math.max(18,height*d.viewport/Math.max(1,d.content)));progress.setValue(d.content>d.viewport?offset/(d.content-d.viewport):0);y.setValue(d.offset+4+(d.content>d.viewport?offset/(d.content-d.viewport)*(height-length):0));}
 function show(){const d=dimensions.current;if(d.viewport<=0||d.content<=d.viewport+1||props.horizontal)return;if(scene)showScroll({id:id.current,opacity,progress,fraction:d.viewport/d.content});if(timer.current)clearTimeout(timer.current);opacity.stopAnimation();opacity.setValue(.65);timer.current=setTimeout(()=>{if(current.current.reduced)opacity.setValue(0);else Animated.timing(opacity,{toValue:0,duration:240,useNativeDriver:Platform.OS!=='web'}).start();},1000);}
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);opacity.stopAnimation();y.stopAnimation();clearScroll(id.current);},[clearScroll]);
 useEffect(()=>{if(!overflow||!scene)clearScroll(id.current);},[overflow,!!scene,clearScroll]);
 return <ScrollView {...props} ref={ref} testID={testID} style={[{zIndex:0},style]} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} scrollEventThrottle={props.scrollEventThrottle??16}
  onLayout={e=>{dimensions.current.viewport=e.nativeEvent.layout.height;setMetrics(v=>({...v,viewport:e.nativeEvent.layout.height}));position();onLayout?.(e);}}
  onContentSizeChange={(width,height)=>{dimensions.current.content=height;setMetrics(v=>({...v,content:height}));position();onContentSizeChange?.(width,height);}}
  onScroll={e=>{dimensions.current.offset=e.nativeEvent.contentOffset.y;position();if(dimensions.current.content>dimensions.current.viewport+1)show();onScroll?.(e);}}
  onScrollBeginDrag={e=>{show();onScrollBeginDrag?.(e);}} onMomentumScrollBegin={e=>{show();onMomentumScrollBegin?.(e);}}>
  {children}
  {overflow&&!scene&&<Animated.View testID={testID?testID+'-indicator':'scroll-indicator'} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden pointerEvents="none" style={[s.thumb,{height:thumb,opacity,transform:[{translateY:y}]}]}/>}
 </ScrollView>;
});
const s=StyleSheet.create({thumb:{position:'absolute',top:0,right:2,width:3,borderRadius:2,backgroundColor:colors.muted,zIndex:1}});
