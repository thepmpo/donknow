import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef} from 'react';
import {Gesture, GestureDetector, GestureHandlerRootView} from 'react-native-gesture-handler';
import Animated, {cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import type {SharedValue} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import type {LiftPreviewProps, RowGestureProps, RowPoint} from './todo-gesture-types';

const ScrollGesture = createContext<ReturnType<typeof Gesture.Native>|null>(null);
const CalendarPeriodContext=createContext<ReturnType<typeof Gesture.Pan>|null>(null);
const CalendarLiftActive=createContext<SharedValue<boolean>|null>(null);
const CalendarTranslation=createContext<SharedValue<number>|null>(null);
export function useCalendarTranslation(){return useContext(CalendarTranslation);}
const LiftCoordinates = createContext<SharedValue<RowPoint>|null>(null);
const easeOut = Easing.out(Easing.cubic);

export function TodoGestureRoot({children}:{children:React.ReactNode}) {
  return <GestureHandlerRootView style={{flex:1}}>{children}</GestureHandlerRootView>;
}
export function CalendarPeriodGesture({children,enabled,reduced=false,width,showPreview,onDrag,onEnd}:{children:React.ReactElement;enabled:boolean;reduced?:boolean;width?:number;showPreview?:boolean;onDrag:(distance:number)=>void;onEnd:(distance:number)=>void}){
 const callbacks=useRef({onDrag,onEnd});callbacks.current={onDrag,onEnd};
 const peek=useCallback((distance:number)=>callbacks.current.onDrag(distance),[]);
 const end=useCallback((distance:number)=>callbacks.current.onEnd(distance),[]);
 const translation=useSharedValue(0),previousDirection=useSharedValue(0),origin=useSharedValue(0),active=useSharedValue(false),liftActive=useSharedValue(false);
 const gesture=useMemo(()=>Gesture.Pan().enabled(enabled).maxPointers(1).activeOffsetX([-20,20]).failOffsetY([-16,16])
  .onStart(()=>{'worklet';if(liftActive.value)return;cancelAnimation(translation);origin.value=translation.value;active.value=true;previousDirection.value=0;})
  .onUpdate(e=>{
   'worklet';
   if(reduced||!active.value||liftActive.value)return;
   const limit=width??400;
   const position=Math.max(-limit,Math.min(limit,origin.value+e.translationX));
   translation.value=position;
   const direction=position<0?1:-1;
   if(showPreview&&previousDirection.value!==direction){previousDirection.value=direction;scheduleOnRN(peek,position);}
  })
  .onFinalize((e,successful)=>{
   'worklet';
   if(!active.value)return;
   active.value=false;
   const distance=successful&&!liftActive.value?e.translationX:0;
   if(!showPreview&&Math.abs(distance)<=55)translation.value=reduced?0:withTiming(0,{duration:220,easing:easeOut});
   scheduleOnRN(end,distance);
  }),[enabled,reduced,width,showPreview,translation,active,liftActive,origin,previousDirection,peek,end]);
 return <CalendarPeriodContext.Provider value={gesture}><CalendarLiftActive.Provider value={liftActive}><CalendarTranslation.Provider value={translation}><GestureDetector gesture={gesture}>{children}</GestureDetector></CalendarTranslation.Provider></CalendarLiftActive.Provider></CalendarPeriodContext.Provider>;
}
export function TodoGestureScroll({children}:{children:React.ReactElement}) {
  const period=useContext(CalendarPeriodContext);
  const scroll=useMemo(()=>{const gesture=Gesture.Native();return period?gesture.simultaneousWithExternalGesture(period):gesture;},[period]);
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
  const liftCoordinates=useContext(LiftCoordinates),calendarLift=useContext(CalendarLiftActive);
  const swipeOffset=useSharedValue(0);
  const lastHover=useSharedValue(0);
  const liftStarted=useSharedValue(false);
  const down=useSharedValue<RowPoint>({x:0,y:0}),lastPoint=useSharedValue<RowPoint>({x:0,y:0});
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
    function pickup(x:number,y:number){
      'worklet';
      const point={x,y};
      lastPoint.value=point;
      if(liftCoordinates)liftCoordinates.value=point;
      liftStarted.value=true;
      if(calendarLift)calendarLift.value=true;
      lastHover.value=0;
      scheduleOnRN(startLift,point);
    }
    function track(x:number,y:number){
      'worklet';
      const point={x,y};
      lastPoint.value=point;
      if(liftCoordinates)liftCoordinates.value=point;
      // JS only evaluates possible destinations. The preview follows on the UI thread.
      if(Date.now()-lastHover.value>=32){
        lastHover.value=Date.now();
        scheduleOnRN(dragHover,point);
      }
    }
    function release(success:boolean){
      'worklet';
      if(!liftStarted.value)return;
      liftStarted.value=false;
      scheduleOnRN(finishLift,lastPoint.value,success);
      if(calendarLift)calendarLift.value=false;
    }

    // Stop early movement before pickup, then keep tracking beyond the original card.
    const lift=period?Gesture.LongPress().enabled(canLift)
      .minDuration(320).maxDistance(10000).shouldCancelWhenOutside(false)
      .onTouchesDown((e,state)=>{
        'worklet';
        const point=e.allTouches[0];
        if(e.numberOfTouches!==1||!point){state.fail();return;}
        down.value={x:point.absoluteX,y:point.absoluteY};
      })
      .onTouchesMove((e,state)=>{
        'worklet';
        const point=e.allTouches[0];
        if(!point)return;
        if(liftStarted.value){track(point.absoluteX,point.absoluteY);return;}
        if(Math.hypot(point.absoluteX-down.value.x,point.absoluteY-down.value.y)>10)state.fail();
      })
      .onTouchesUp(e=>{
        'worklet';
        const point=e.changedTouches[0];
        if(liftStarted.value&&point)lastPoint.value={x:point.absoluteX,y:point.absoluteY};
      })
      .onStart(e=>{'worklet';pickup(e.absoluteX,e.absoluteY);})
      .onFinalize((_,success)=>{'worklet';release(success);})
      :Gesture.Pan().enabled(canLift).maxPointers(1).minDistance(0).activateAfterLongPress(320)
        .onStart(e=>{'worklet';pickup(e.absoluteX,e.absoluteY);})
        .onUpdate(e=>{'worklet';track(e.absoluteX,e.absoluteY);})
        .onFinalize((e,success)=>{
          'worklet';
          if(liftStarted.value&&success)lastPoint.value={x:e.absoluteX,y:e.absoluteY};
          release(success);
        });
    if(scroll&&(canSwipeLeft||canSwipeRight))swipe.blocksExternalGesture(scroll);
    if(scroll&&canLift)lift.blocksExternalGesture(scroll);
    if(period&&(canSwipeLeft||canSwipeRight))swipe.blocksExternalGesture(period);
    if(period&&canLift)lift.simultaneousWithExternalGesture(period);
    if(!canSwipeLeft&&!canSwipeRight)return lift;
    return canLift?Gesture.Race(swipe,lift):swipe;
  },[canSwipeLeft,canSwipeRight,canLift,reduced,scroll,period,liftCoordinates,calendarLift,swipeOffset,lastHover,liftStarted,down,lastPoint,startSwipe,finishSwipe,startLift,dragHover,finishLift]);
  const movement=useAnimatedStyle(()=>({transform:[{translateX:swipeOffset.value}]}));
  return <GestureDetector gesture={gesture}>
    <Animated.View collapsable={false} style={[props.fill&&{flex:1},movement]}>{props.children}</Animated.View>
  </GestureDetector>;
}
