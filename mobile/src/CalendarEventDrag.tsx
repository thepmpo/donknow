import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {Animated,Platform,StyleSheet,Text,View} from 'react-native';
import type {PressableProps,StyleProp,ViewStyle} from 'react-native';
import {MotionPressable,useReducedMotion} from './motion';
import {TodoGestureRow,TodoLiftPreview,TodoLiftScope} from './todo-gestures';
import type {LiftPreviewProps,RowPoint} from './todo-gesture-types';
import type {CalendarEvent} from './calendar-model';
import {colors,typography} from './theme';

type Target={day:string;node:React.ComponentRef<typeof View>};
type Bounds={x:number;y:number;width:number;height:number;day:string};
type Session={event:CalendarEvent;anchor:string;point:RowPoint;boxes:Bounds[];preview?:LiftPreviewProps['geometry'];origin:RowPoint};
const within=(point:RowPoint,box:Bounds)=>point.x>=box.x&&point.x<box.x+box.width&&point.y>=box.y&&point.y<box.y+box.height;
const Context=createContext<ReturnType<typeof useCalendarEventDrag>|null>(null);
const noop=()=>{};

export function useCalendarEventDrag(enabled:boolean,onMove:(event:CalendarEvent,anchor:string,day:string)=>void){
 const root=useRef<React.ComponentRef<typeof View>>(null),targets=useRef(new Set<Target>()),session=useRef<Session|null>(null);
 const [lifted,setLifted]=useState<{id:string;title:string;geometry:LiftPreviewProps['geometry'];width:number}|null>(null),[hover,setHover]=useState('');
 const position=useRef(new Animated.ValueXY()).current,scale=useRef(new Animated.Value(1)).current;
 const reduced=useReducedMotion(),availability=useRef(enabled);availability.current=enabled;
 function finish(completed:boolean){
  const current=session.current;session.current=null;setLifted(null);setHover('');
  if(!enabled||!current||!completed||Math.hypot(current.point.x-current.origin.x,current.point.y-current.origin.y)<8)return;
  const day=current.boxes.find(box=>within(current.point,box))?.day;
  const anchor=current.boxes.find(box=>within(current.origin,box))?.day??current.anchor;
  if(day&&day!==anchor)onMove(current.event,anchor,day);
 }
 useEffect(()=>{if(!enabled&&session.current)finish(false);},[enabled]);
 function move(point:RowPoint){
  const current=session.current;if(!current)return;
  current.point=point;
  setHover(current.boxes.find(box=>within(point,box))?.day??'');
  if(Platform.OS==='web'&&current.preview){
   const g=current.preview;position.setValue({x:Math.max(4,Math.min(g.maxX,point.x-g.x)),y:Math.max(4,Math.min(g.maxY,point.y-g.y))});
  }
 }
 function start(event:CalendarEvent,anchor:string,point:RowPoint){
  if(!availability.current||session.current)return;
  const current:Session={event,anchor,origin:point,point,boxes:[]};session.current=current;
  for(const target of targets.current)target.node.measureInWindow((x,y,width,height)=>{
   if(session.current===current&&width>0&&height>0)current.boxes.push({x,y,width,height,day:target.day});
  });
  root.current?.measureInWindow((x,y,width,height)=>{
   if(session.current!==current||width<=0||height<=0)return;
   const cardWidth=Math.min(192,Math.max(100,width-8));
   const geometry={x:x+cardWidth*.35,y:y+22,maxX:width-cardWidth-4,maxY:height-48,initial:point};
   current.preview=geometry;move(current.point);
   setLifted({id:event.id,title:event.title,geometry,width:cardWidth});
  });
 }
 return {root,targets,session,start,move,finish,lifted,hover,enabled,reduced,position,scale};
}

export function CalendarDragSurface({drag,children,testID,style,onLayout}:{drag:ReturnType<typeof useCalendarEventDrag>;children:React.ReactNode;testID?:string;style?:StyleProp<ViewStyle>;onLayout?:React.ComponentProps<typeof View>['onLayout']}){
 return <TodoLiftScope><Context.Provider value={drag}><View ref={drag.root} collapsable={false} testID={testID} style={style} onLayout={onLayout}>
  {children}
  {drag.lifted&&<TodoLiftPreview testID="calendar-drag-preview" geometry={drag.lifted.geometry} reduced={drag.reduced} fallbackPosition={drag.position} fallbackScale={drag.scale} style={[styles.preview,{width:drag.lifted.width}]}>
   <Text numberOfLines={1} style={styles.previewText}>{drag.lifted.title}</Text>
  </TodoLiftPreview>}
 </View></Context.Provider></TodoLiftScope>;
}

export function CalendarDropDate({day,children,style,enabled=true}:{day:string;children?:React.ReactNode;style?:StyleProp<ViewStyle>;enabled?:boolean}){
 const drag=useContext(Context),ref=useRef<React.ComponentRef<typeof View>>(null),targets=drag?.targets;
 useEffect(()=>{
  const node=ref.current;if(!targets||!node||!enabled)return;
  const target={day,node};targets.current.add(target);return()=>{targets.current.delete(target);};
 },[day,targets,enabled]);
 return <View ref={ref} collapsable={false} testID={'calendar-drop-'+day} style={[style,enabled&&drag?.hover===day&&styles.target]}>{children}</View>;
}

export function CalendarDraggableEvent({event,day,style,contentStyle,fill=false,dragEnabled=true,...props}:Omit<PressableProps,'style'>&{event:CalendarEvent;day:string;style?:StyleProp<ViewStyle>;contentStyle?:StyleProp<ViewStyle>;fill?:boolean;dragEnabled?:boolean}){
 const drag=useContext(Context),reduced=useReducedMotion(),blockPress=useRef(false);
 const canLift=!!(drag?.enabled&&dragEnabled&&event.canWrite&&event.eventId&&event.etag&&!event.saveState);
 const pointer=useRef<{id:number;origin:RowPoint;timer:ReturnType<typeof setTimeout>;held:boolean;releaseScroll?:()=>void}|null>(null);
 function clear(){if(pointer.current){clearTimeout(pointer.current.timer);pointer.current.releaseScroll?.();}pointer.current=null;}
 useEffect(()=>{if(!canLift)clear();return clear;},[canLift]);
 const web=Platform.OS==='web'&&canLift?{
  onContextMenu:(e:MouseEvent)=>e.preventDefault(),
  onPointerDown:(pointerEvent:React.PointerEvent<HTMLElement>)=>{
   const e=pointerEvent.nativeEvent;
   if(e.button!==0||!e.isPrimary)return;clear();blockPress.current=false;
   const node=pointerEvent.currentTarget,origin={x:e.clientX,y:e.clientY},id=e.pointerId;
   const pending:NonNullable<typeof pointer.current>={id,origin,held:false,timer:setTimeout(()=>{
    pending.held=true;blockPress.current=true;
    if(e.pointerType==='touch'){
     const stopScrolling=(touch:TouchEvent)=>{if(touch.cancelable)touch.preventDefault();};
     node.addEventListener('touchmove',stopScrolling,{passive:false});
     pending.releaseScroll=()=>node.removeEventListener('touchmove',stopScrolling);
    }
    node.setPointerCapture?.(id);
    drag?.start(event,day,origin);
   },320)};
   pointer.current=pending;
  },
  onPointerMove:(pointerEvent:React.PointerEvent<HTMLElement>)=>{
   const e=pointerEvent.nativeEvent,pending=pointer.current;if(!pending||pending.id!==e.pointerId)return;
   if(pending.held)drag?.move({x:e.clientX,y:e.clientY});
   else if(Math.hypot(e.clientX-pending.origin.x,e.clientY-pending.origin.y)>9)clear();
  },
  onPointerUp:(pointerEvent:React.PointerEvent<HTMLElement>)=>{
   const e=pointerEvent.nativeEvent;
   if(pointer.current?.held){drag?.move({x:e.clientX,y:e.clientY});drag?.finish(true);}
   clear();
  },
  onPointerCancel:()=>{if(pointer.current?.held)drag?.finish(false);clear();},
 }:undefined;
 return <View {...(web as unknown as React.ComponentProps<typeof View>)} style={[style,drag?.lifted?.id===event.id&&styles.lifted,Platform.OS==='web'&&({userSelect:'none'} as ViewStyle)]}>
  <TodoGestureRow fill={fill} canSwipeLeft={false} canSwipeRight={false} canLift={canLift} reduced={reduced} onSwipeStart={noop} onSwipeEnd={noop}
   onLift={point=>{blockPress.current=true;drag?.start(event,day,point);}} onDrag={point=>drag?.move(point)} onDrop={completed=>drag?.finish(completed)}>
   <MotionPressable {...props} onPressIn={e=>{blockPress.current=false;props.onPressIn?.(e);}} onPress={e=>{e.stopPropagation();if(!blockPress.current)props.onPress?.(e);}} style={[fill&&{flex:1},contentStyle]}/>
  </TodoGestureRow>
 </View>;
}
const styles=StyleSheet.create({
 target:{backgroundColor:colors.todoSelection},
 lifted:{opacity:.5},
 preview:{position:'absolute',top:0,left:0,zIndex:20,minHeight:44,justifyContent:'center',paddingHorizontal:12,borderRadius:12,backgroundColor:colors.todoSelection,shadowColor:'#101828',shadowOpacity:.18,shadowRadius:11,shadowOffset:{width:0,height:4},elevation:9},
 previewText:{...typography.detail,color:colors.text,fontWeight:'600'},
});
