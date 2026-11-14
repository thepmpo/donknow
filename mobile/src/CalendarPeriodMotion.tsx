import React,{forwardRef,useImperativeHandle,useLayoutEffect,useRef,useState} from 'react';
import {Animated,Easing,Platform,StyleSheet,View} from 'react-native';
import {motion,useReducedMotion} from './motion';
export type CalendarPeriodMotionHandle={drag:(x:number)=>void;cancel:()=>void};
// A presentation-only outgoing grid cannot duplicate test IDs or interactive targets.
function snapshot(node:React.ReactNode):React.ReactNode{return React.Children.map(node,child=>React.isValidElement(child)?React.cloneElement(child as React.ReactElement<any>,{testID:undefined},snapshot((child.props as {children?:React.ReactNode}).children)):child);}
/** Keep the old grid on screen until the adjacent period has slid into its place. */
export const CalendarPeriodMotion=forwardRef<CalendarPeriodMotionHandle,{identity:string;sequence:number;direction:number;width:number;enabled:boolean;children:React.ReactNode}>(function CalendarPeriodMotion({identity,sequence,direction,width,enabled,children},ref){
 const reduced=useReducedMotion(),incoming=useRef(new Animated.Value(0)).current,outgoing=useRef(new Animated.Value(0)).current,zoom=useRef(new Animated.Value(1)).current;
 const [old,setOld]=useState<React.ReactNode>(null),token=useRef(0),dragX=useRef(0),seen=useRef({identity,sequence,node:children}),pending=useRef<{node:React.ReactNode}|null>(null);
 if(seen.current.identity!==identity||seen.current.sequence!==sequence){pending.current={node:seen.current.node};seen.current={identity,sequence,node:children};}else seen.current.node=children;
 function stop(){token.current++;incoming.stopAnimation();outgoing.stopAnimation();zoom.stopAnimation();}
 useImperativeHandle(ref,()=>({drag:x=>{if(!enabled||reduced)return;stop();setOld(null);dragX.current=Math.max(-width,Math.min(width,x));incoming.setValue(dragX.current);zoom.setValue(1);},cancel:()=>{stop();dragX.current=0;const run=token.current;Animated.timing(incoming,{toValue:0,duration:reduced?0:240,easing:Easing.out(Easing.cubic),useNativeDriver:Platform.OS!=='web'}).start(()=>{if(run===token.current)setOld(null);});}}),[enabled,reduced,width]);
 useLayoutEffect(()=>{
  stop();const run=token.current,p=pending.current;pending.current=null;
  if(!p||!enabled||reduced){setOld(null);incoming.setValue(0);outgoing.setValue(0);zoom.setValue(1);dragX.current=0;return;}
  const options={duration:motion.page,easing:Easing.bezier(.32,0,.2,1),useNativeDriver:Platform.OS!=='web'};
  if(direction){const sign=Math.sign(direction),offset=dragX.current;setOld(snapshot(p.node));outgoing.setValue(offset);incoming.setValue(sign*width+offset);zoom.setValue(1);Animated.parallel([Animated.timing(incoming,{...options,toValue:0}),Animated.timing(outgoing,{...options,toValue:-sign*width})]).start(({finished})=>{if(finished&&run===token.current)setOld(null);});}
  else {setOld(null);incoming.setValue(0);zoom.setValue(.975);Animated.timing(zoom,{...options,toValue:1}).start();}
  dragX.current=0;return stop;
 },[identity,sequence,width,enabled,reduced]);
 return <View testID="calendar-period-motion" style={s.root}>
  {old&&<Animated.View testID="calendar-period-outgoing" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={[s.old,{width,transform:[{translateX:outgoing}]}]}>{old}</Animated.View>}
  <Animated.View testID="calendar-period-current" style={{transform:[{translateX:incoming},{scale:zoom}]}}>{children}</Animated.View>
 </View>;
});
const s=StyleSheet.create({root:{overflow:'hidden'},old:{position:'absolute',left:0,top:0}});
