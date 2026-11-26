import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef} from 'react';
import {Gesture, GestureDetector, GestureHandlerRootView} from 'react-native-gesture-handler';
import Animated, {cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import type {SharedValue} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import type {LiftPreviewProps, RowGestureProps, RowPoint} from './todo-gesture-types';

const ScrollGesture = createContext<ReturnType<typeof Gesture.Native>|null>(null);
const CalendarPeriodContext=createContext<ReturnType<typeof Gesture.Pan>|null>(null);
const LiftCoordinates = createContext<SharedValue<RowPoint>|null>(null);
const easeOut = Easing.out(Easing.cubic);

export function TodoGestureRoot({children}:{children:React.ReactNode}) {
  return <GestureHandlerRootView style={{flex:1}}>{children}</GestureHandlerRootView>;
}
export function CalendarPeriodGesture({children,enabled,onDrag,onEnd}:{children:React.ReactElement;enabled:boolean;onDrag:(distance:number)=>void;onEnd:(distance:number)=>void}){
 const callbacks=useRef({onDrag,onEnd});callbacks.current={onDrag,onEnd};
 const drag=useCallback((distance:number)=>callbacks.current.onDrag(distance),[]);
 const end=useCallback((distance:number)=>callbacks.current.onEnd(distance),[]);
 const gesture=useMemo(()=>Gesture.Pan().enabled(enabled).maxPointers(1).activeOffsetX([-20,20]).failOffsetY([-16,16])
  .onUpdate(e=>{'worklet';scheduleOnRN(drag,e.translationX);})
  .onEnd((e,successful)=>{'worklet';scheduleOnRN(end,successful?e.translationX:0);}),[enabled,drag,end]);
 return <CalendarPeriodContext.Provider value={gesture}><GestureDetector gesture={gesture}>{children}</GestureDetector></CalendarPeriodContext.Provider>;
}
export function TodoGestureScroll({children}:{children:React.ReactElement}) {
  const scroll=useMemo(()=>Gesture.Native(),[]);
  return <ScrollGesture.Provider value={scroll}>
    <GestureDetector gesture={scroll}>{children}</GestureDetector>
  </ScrollGesture.Provider>;
}
export function TodoLiftScope({children}:{children:React.ReactNode}) {
  const coordinates=useSharedValue<RowPoint>({x:0,y:0});
  return <LiftCoordinates.Provider value={coordinates}>{children}</LiftCoordinates.Provider>;
}
export function TodoLiftPreview({testID='todo-drag-preview',geometry,reduced,style,children}:LiftPreviewProps) {
  const coordinates=useContext(LiftCoordinates);
  const scale=useSharedValue(1);
  useEffect(()=>{
    scale.value=reduced?1:withTiming(1.035,{duration:115,easing:easeOut});
  },[reduced,scale]);
  const {x,y,maxX,maxY,initial}=geometry;
  const movement=useAnimatedStyle(()=>{
    const point=coordinates?.value??initial;
    return {transform:[
      {translateX:Math.max(4,Math.min(maxX,point.x-x))},
      {translateY:Math.max(4,Math.min(maxY,point.y-y))},
      {scale:scale.value},
    ]};
  },[coordinates,x,y,maxX,maxY,initial]);
  return <Animated.View pointerEvents="none" aria-hidden importantForAccessibility="no-hide-descendants" testID={testID} style={[style,movement]}>
    {children}
  </Animated.View>;
}

export function TodoGestureRow(props:RowGestureProps) {
  const scroll=useContext(ScrollGesture),period=useContext(CalendarPeriodContext);
  const liftCoordinates=useContext(LiftCoordinates);
  const swipeOffset=useSharedValue(0);
  const lastHover=useSharedValue(0);
  const liftStarted=useSharedValue(false);
  const callbacks=useRef(props);
  callbacks.current=props;
  const startSwipe=useCallback(()=>callbacks.current.onSwipeStart(),[]);
  const finishSwipe=useCallback((distance:number,completed:boolean)=>callbacks.current.onSwipeEnd(distance,completed),[]);
  const startLift=useCallback((point:RowPoint)=>callbacks.current.onLift(point),[]);
  const dragHover=useCallback((point:RowPoint)=>callbacks.current.onDrag(point),[]);
  const finishLift=useCallback((point:RowPoint,completed:boolean)=>{
    callbacks.current.onDrag(point);
    callbacks.current.onDrop(completed);
  },[]);
  const {canSwipeLeft,canSwipeRight,canLift,reduced}=props;
  const gesture=useMemo(()=>{
    const swipe=Gesture.Pan()
      .enabled(canSwipeLeft||canSwipeRight)
      .maxPointers(1)
      .activeOffsetX(canSwipeLeft&&canSwipeRight?[-11,11]:canSwipeRight?11:-11)
      .failOffsetY([-18,18])
      .onStart(()=>{
        'worklet';
        cancelAnimation(swipeOffset);
        scheduleOnRN(startSwipe);
      })
      .onUpdate(e=>{
        'worklet';
        const length=Math.abs(e.translationX);
        swipeOffset.value=Math.sign(e.translationX)*Math.min(104,length<=72?length:72+(length-72)*0.32);
      })
      .onEnd((e,success)=>{
        'worklet';
        swipeOffset.value=reduced?0:withTiming(0,{duration:175,easing:easeOut});
        scheduleOnRN(finishSwipe,e.translationX,success);
      });
    const lift=Gesture.Pan()
      .enabled(canLift)
      .maxPointers(1)
      .minDistance(0)
      .activateAfterLongPress(320)
      .onStart(e=>{
        'worklet';
        const point={x:e.absoluteX,y:e.absoluteY};
        if(liftCoordinates)liftCoordinates.value=point;
        liftStarted.value=true;
        lastHover.value=0;
        scheduleOnRN(startLift,point);
      })
      .onUpdate(e=>{
        'worklet';
        const point={x:e.absoluteX,y:e.absoluteY};
        if(liftCoordinates)liftCoordinates.value=point;
        // Keep finger tracking on the UI thread. JS only evaluates possible destinations.
        if(Date.now()-lastHover.value>=32){
          lastHover.value=Date.now();
          scheduleOnRN(dragHover,point);
        }
      })
      .onFinalize((e,success)=>{
        'worklet';
        if(!liftStarted.value)return;
        liftStarted.value=false;
        scheduleOnRN(finishLift,{x:e.absoluteX,y:e.absoluteY},success);
      });
    if(scroll){
      swipe.blocksExternalGesture(scroll);
      lift.blocksExternalGesture(scroll);
    }
    if(period){swipe.blocksExternalGesture(period);lift.blocksExternalGesture(period);}
    if(!canSwipeLeft&&!canSwipeRight)return lift;
    return canLift?Gesture.Race(swipe,lift):swipe;
  },[canSwipeLeft,canSwipeRight,canLift,reduced,scroll,period,liftCoordinates,swipeOffset,lastHover,liftStarted,startSwipe,finishSwipe,startLift,dragHover,finishLift]);
  const movement=useAnimatedStyle(()=>({transform:[{translateX:swipeOffset.value}]}));
  return <GestureDetector gesture={gesture}>
    <Animated.View collapsable={false} style={[props.fill&&{flex:1},movement]}>{props.children}</Animated.View>
  </GestureDetector>;
}
