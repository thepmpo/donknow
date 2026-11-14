import React,{forwardRef,useImperativeHandle,useLayoutEffect,useRef,useState} from 'react';
import {Animated,Easing,Platform,StyleSheet,View} from 'react-native';
import {useReducedMotion} from './motion';
export type CalendarPeriodMotionHandle={drag:(x:number)=>void;cancel:()=>void};
// A presentation-only outgoing grid cannot duplicate test IDs or interactive targets.
function snapshot(node:React.ReactNode):React.ReactNode{return React.Children.map(node,child=>React.isValidElement(child)?React.cloneElement(child as React.ReactElement<any>,{testID:undefined,focusable:false,tabIndex:-1},snapshot((child.props as {children?:React.ReactNode}).children)):child);}
/** Keep the old grid on screen until the adjacent period has slid into its place. */
export const CalendarPeriodMotion=forwardRef<CalendarPeriodMotionHandle,{identity:string;sequence:number;direction:number;width:number;enabled:boolean;preview?:(direction:number)=>React.ReactNode;children:React.ReactNode}>(function CalendarPeriodMotion({identity,sequence,direction,width,enabled,preview,children},ref){
 const reduced=useReducedMotion(),incoming=useRef(new Animated.Value(0)).current;
 const [peek,setPeek]=useState(0);
 const [old,setOld]=useState<{node:React.ReactNode;offset:number}|null>(null),token=useRef(0),dragX=useRef(0),dragging=useRef(false),seen=useRef({identity,sequence,node:children}),pending=useRef<{node:React.ReactNode;directional:boolean}|null>(null);
 if(seen.current.identity!==identity||seen.current.sequence!==sequence){pending.current={node:seen.current.node,directional:seen.current.sequence!==sequence};seen.current={identity,sequence,node:children};}else seen.current.node=children;
 function stop(){token.current++;incoming.stopAnimation();}
 useImperativeHandle(ref,()=>({drag:x=>{if(!enabled||reduced)return;if(!dragging.current){stop();setOld(null);dragging.current=true;}dragX.current=Math.max(-width,Math.min(width,x));setPeek(x<0?1:-1);incoming.setValue(dragX.current);},cancel:()=>{stop();dragging.current=false;dragX.current=0;const run=token.current;setOld(null);Animated.timing(incoming,{toValue:0,duration:reduced?0:240,easing:Easing.out(Easing.cubic),useNativeDriver:Platform.OS!=='web'}).start(()=>{if(run===token.current){setOld(null);setPeek(0);}});}}),[enabled,reduced,width]);
 useLayoutEffect(()=>{
  stop();setPeek(0);dragging.current=false;const run=token.current,p=pending.current;pending.current=null;
  if(!p||!enabled||reduced){setOld(null);incoming.setValue(0);dragX.current=0;return;}
  const options={duration:Math.round(240+80*(1-Math.min(1,Math.abs(dragX.current)/Math.max(1,width)))),easing:Easing.bezier(.32,0,.2,1),useNativeDriver:Platform.OS!=='web'};
  // Both pages share ONE translation: their seam stays exactly one pane-width apart.
  // The outgoing page starts at the held drag offset, never at a second velocity.
  if(direction&&p.directional){const sign=Math.sign(direction),offset=dragX.current;setOld({node:snapshot(p.node),offset:sign*width});incoming.setValue(sign*width+offset);Animated.timing(incoming,{...options,toValue:0}).start(({finished})=>{if(finished&&run===token.current)setOld(null);});}
  else {setOld(null);incoming.setValue(0);}
  dragX.current=0;return stop;
 },[identity,sequence,width,enabled,reduced]);
 return <View testID="calendar-period-motion" style={s.root}>
  {peek!==0&&preview&&<Animated.View testID="calendar-period-preview" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={[s.old,{width,transform:[{translateX:Animated.add(incoming,peek*width)}]}]}>{snapshot(preview(peek))}</Animated.View>}
  {old&&<Animated.View testID="calendar-period-outgoing" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={[s.old,{width,transform:[{translateX:Animated.subtract(incoming,old.offset)}]}]}>{old.node}</Animated.View>}
  <Animated.View testID="calendar-period-current" style={{transform:[{translateX:incoming}]}}>{children}</Animated.View>
 </View>;
});
const s=StyleSheet.create({root:{overflow:'hidden'},old:{position:'absolute',left:0,top:0}});
