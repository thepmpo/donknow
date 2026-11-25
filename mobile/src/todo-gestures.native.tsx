import React, {createContext, useContext, useMemo, useRef} from 'react';
import {Gesture, GestureDetector, GestureHandlerRootView} from 'react-native-gesture-handler';
import type {RowGestureProps} from './todo-gesture-types';

const ScrollGesture = createContext<ReturnType<typeof Gesture.Native>|null>(null);

export function TodoGestureRoot({children}:{children:React.ReactNode}) {
  return <GestureHandlerRootView style={{flex:1}}>{children}</GestureHandlerRootView>;
}

export function TodoGestureScroll({children}:{children:React.ReactElement}) {
  const scroll=useMemo(()=>Gesture.Native(),[]);
  return <ScrollGesture.Provider value={scroll}>
    <GestureDetector gesture={scroll}>{children}</GestureDetector>
  </ScrollGesture.Provider>;
}

export function TodoGestureRow(props:RowGestureProps) {
  const scroll=useContext(ScrollGesture);
  const callbacks=useRef(props);
  callbacks.current=props;
  const gesture=useMemo(()=>{
    const swipe=Gesture.Pan()
      .enabled(props.canSwipeLeft||props.canSwipeRight)
      .maxPointers(1)
      .activeOffsetX(props.canSwipeLeft&&props.canSwipeRight?[-11,11]:props.canSwipeRight?11:-11)
      .failOffsetY([-18,18])
      .runOnJS(true)
      .onStart(()=>callbacks.current.onSwipeStart())
      .onUpdate(e=>callbacks.current.onSwipeMove(e.translationX))
      .onEnd((e,success)=>callbacks.current.onSwipeEnd(e.translationX,success));
    const lift=Gesture.Pan()
      .enabled(props.canLift)
      .maxPointers(1)
      .activateAfterLongPress(320)
      .runOnJS(true)
      .onStart(e=>callbacks.current.onLift({x:e.absoluteX,y:e.absoluteY}))
      .onUpdate(e=>callbacks.current.onDrag({x:e.absoluteX,y:e.absoluteY}))
      .onEnd((_,success)=>callbacks.current.onDrop(success));
    if(scroll){
      swipe.blocksExternalGesture(scroll);
      lift.blocksExternalGesture(scroll);
    }
    return Gesture.Race(swipe,lift);
  },[props.canSwipeRight,props.canSwipeLeft,props.canLift,scroll]);
  return <GestureDetector gesture={gesture}>{props.children}</GestureDetector>;
}
