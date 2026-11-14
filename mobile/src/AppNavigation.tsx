import React,{type ComponentRef,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Animated,AppState,Easing,PanResponder,Platform,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {LayoutRectangle} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {useReducedMotion} from './motion';
import {colors,palette,layout,navigationMotion} from './theme';
import {useDuoNavigationPortal,useDuoScene} from './DuoChrome';
import {NavigationGlass} from './NavigationGlass';
import {lensPosition,shouldScrub,tabAtPoint} from './navigation-geometry';
export const appTabs=[
 {id:'calendar',name:'캘린더',label:'캘린더',icon:'calendar-outline'},
 {id:'todos',name:'Todo 리스트',label:'할 일',icon:'checkmark-circle-outline'},
 {id:'duck',name:'duckduck',label:'덕',icon:'chatbubble-outline'},
 {id:'log',name:'log',label:'log',icon:'time-outline'},
 {id:'profile',name:'ME',label:'ME',icon:'person-outline'},
] as const;
export type AppTab=typeof appTabs[number]['id'];
type Props={tab:AppTab;onSelect:(tab:AppTab)=>void;onCalendarLongPress?:()=>void;duo:boolean;bottomInset?:number;small?:boolean;unread?:number};
const native=Platform.OS!=='web';
function NavigationBar({tab,onSelect,onCalendarLongPress,duo,bottomInset=0,unread=0}:Props){
 const reduced=useReducedMotion(),[frames,setFrames]=useState<Partial<Record<AppTab,LayoutRectangle>>>({});
 const [preview,setPreview]=useState<AppTab|null>(null),[dragging,setDragging]=useState(false),[viewport,setViewport]=useState({width:0,height:0});
 const items=useRef<ComponentRef<typeof View>>(null),origin=useRef<{x:number;y:number}|null>(null),drag=useRef(false),suppress=useRef(false),generation=useRef(0);
 const x=useRef(new Animated.Value(0)).current,y=useRef(new Animated.Value(0)).current,scale=useRef(new Animated.Value(1)).current;
 const initialized=useRef(false),direction=useRef(duo),frame=frames[preview??tab];
 const bounds=Object.values(frames).reduce((b,f)=>({width:Math.max(b.width,f.x+f.width),height:Math.max(b.height,f.y+f.height)}),{width:0,height:0});
 const overflow=duo?bounds.height>viewport.height+1:bounds.width>viewport.width+1;
 const indicator=frame?{width:duo?layout.duoNavigationItemSize:Math.min(64,frame.width-4),height:duo?layout.duoNavigationItemSize:Math.min(54,frame.height-4)}:null;
 const targetX=frame&&indicator?frame.x+(frame.width-indicator.width)/2:0,targetY=frame&&indicator?frame.y+(frame.height-indicator.height)/2:0;
 const stop=()=>{x.stopAnimation();y.stopAnimation();scale.stopAnimation();};
 const settle=()=>{generation.current++;drag.current=false;origin.current=null;setDragging(false);setPreview(null);};
 const current=useRef({frames,bounds,indicator,reduced,duo,overflow,onSelect,settle});
 current.current={frames,bounds,indicator,reduced,duo,overflow,onSelect,settle};
 useLayoutEffect(()=>{
  if(direction.current!==duo){drag.current=false;origin.current=null;setDragging(false);setPreview(null);}
  if(drag.current)return;
  stop();if(!frame)return;
  if(reduced||!initialized.current||direction.current!==duo){x.setValue(targetX);y.setValue(targetY);scale.setValue(1);}
  else Animated.parallel([
   Animated.timing(x,{toValue:targetX,duration:navigationMotion.travel,easing:Easing.out(Easing.cubic),useNativeDriver:native}),
   Animated.timing(y,{toValue:targetY,duration:navigationMotion.travel,easing:Easing.out(Easing.cubic),useNativeDriver:native}),
   Animated.timing(scale,{toValue:preview?navigationMotion.pressedScale:1,duration:preview?navigationMotion.press:navigationMotion.release,easing:Easing.out(Easing.cubic),useNativeDriver:native}),
  ]).start();
  initialized.current=true;direction.current=duo;
  return stop;
 },[targetX,targetY,!!frame,reduced,duo,preview,dragging,x,y,scale]);
 useLayoutEffect(()=>()=>{stop();origin.current=null;drag.current=false;},[]);
 function begin(id:AppTab){
  suppress.current=false;setPreview(id);const token=++generation.current;
  items.current?.measureInWindow((left,top)=>{if(token===generation.current)origin.current={x:left,y:top};});
 }
 useEffect(()=>{const subscription=AppState.addEventListener('change',state=>{if(state!=='active'){suppress.current=true;current.current.settle();}});return()=>subscription.remove();},[]);
 const responder=useRef(PanResponder.create({
  onMoveShouldSetPanResponderCapture:(_,g)=>{const capture=g.numberActiveTouches===1&&!!origin.current&&shouldScrub(g.dx,g.dy,current.current.duo,current.current.overflow);if(capture)drag.current=true;return capture;},
  onPanResponderGrant:()=>{drag.current=true;suppress.current=true;setDragging(true);stop();scale.setValue(current.current.reduced?1:navigationMotion.pressedScale);},
  onPanResponderMove:(_,g)=>{
   const c=current.current,o=origin.current;if(g.numberActiveTouches>1){suppress.current=true;c.settle();return;}if(!o||!c.indicator)return;
   const point={x:g.moveX-o.x,y:g.moveY-o.y},hit=tabAtPoint<AppTab>(point,c.frames);
   if(hit)setPreview(hit);
   const position=lensPosition(point,c.indicator,c.bounds);x.setValue(position.x);y.setValue(position.y);
  },
  onPanResponderRelease:(_,g)=>{
   const c=current.current,o=origin.current;
   const hit=o?tabAtPoint<AppTab>({x:g.moveX-o.x,y:g.moveY-o.y},c.frames):null;
   c.settle();if(hit)c.onSelect(hit);
  },
  onPanResponderTerminate:()=>{suppress.current=true;current.current.settle();},
  onPanResponderTerminationRequest:()=>true,
  onPanResponderReject:()=>current.current.settle(),
 })).current;
 return <NavigationGlass style={[styles.bar,duo?styles.duo:[styles.bottom,{bottom:Math.max(bottomInset,layout.navigationBottomGap)}]]} testID={duo?'DuoTrailingNavigation':'BottomNavigation'} accessibilityRole="tablist">
  <ScrollView horizontal={!duo} scrollEnabled={!dragging} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={{flexGrow:1}} style={{minWidth:0,minHeight:0}} onLayout={event=>{const {width,height}=event.nativeEvent.layout;setViewport({width,height});if(drag.current||preview!==null)settle();}}>
   <View ref={items} {...responder.panHandlers} testID="navigation-items" style={[styles.items,duo&&styles.verticalItems]}>
    {indicator&&<Animated.View pointerEvents="none" testID="navigation-selection" style={[styles.selection,indicator,{transform:[{translateX:x},{translateY:y},{scale}]}]}><NavigationGlass variant="selection" active={preview!==null} pointerEvents="none" style={[StyleSheet.absoluteFill,styles.selectionMaterial]}/></Animated.View>}
    {appTabs.map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.name} accessibilityState={{selected:item.id===tab}} aria-selected={item.id===tab} accessibilityHint={item.id==='calendar'?'다시 누르면 오늘, 길게 누르면 2주 보기':item.id==='profile'?'계정, 서비스 연결, 알림과 개인 설정':undefined} delayLongPress={500} onLongPress={item.id==='calendar'&&onCalendarLongPress?()=>{if(!drag.current&&!suppress.current){suppress.current=true;onCalendarLongPress();}}:undefined} onPressIn={()=>begin(item.id)} onPressOut={()=>{if(!drag.current)settle();}} onPress={()=>{if(!suppress.current)onSelect(item.id);}} onLayout={event=>{const next=event.nativeEvent.layout;setFrames(old=>{const prior=old[item.id];return prior&&Object.keys(next).every(key=>next[key as keyof LayoutRectangle]===prior[key as keyof LayoutRectangle])?old:{...old,[item.id]:next};});}} style={[styles.tab,duo&&styles.compact]}>
     {item.id==='duck'?<Text testID={'navigation-icon-'+item.id} style={[styles.duck,duo&&styles.duoDuck]}>🦆</Text>:<Ionicons testID={'navigation-icon-'+item.id} name={item.icon} size={duo?layout.duoNavigationIconSize:24} color={item.id===(preview??tab)?colors.blueText:palette.grey600}/>}
     {item.id==='duck'&&unread>0&&<View style={styles.badge}><Text style={styles.badgeText}>{unread>99?'99+':unread}</Text></View>}
     {!duo&&<Text numberOfLines={2} style={[styles.label,item.id===(preview??tab)&&styles.selected]}>{item.label}</Text>}
    </Pressable>)}
   </View>
  </ScrollView>
 </NavigationGlass>;
}
/** Full-scene portal preserves the physical camera column through folding/rotation. */
export function AppNavigation(props:Props){
 const {ready}=useDuoScene();
 const {tab,onSelect,onCalendarLongPress,duo,bottomInset,small,unread}=props;
 const bar=useMemo(()=><NavigationBar tab={tab} onSelect={onSelect} onCalendarLongPress={onCalendarLongPress} duo={duo} bottomInset={bottomInset} small={small} unread={unread}/>,[tab,onSelect,onCalendarLongPress,duo,bottomInset,small,unread]);
 useDuoNavigationPortal(bar,duo&&ready);
 return !ready||duo?null:bar;
}
const styles=StyleSheet.create({
 bar:{borderColor:'rgba(180,190,205,0.4)'},
 bottom:{position:'absolute',left:layout.navigationInset,right:layout.navigationInset,borderRadius:layout.navigationRadius,borderWidth:StyleSheet.hairlineWidth,padding:4},
 duo:{width:layout.duoNavigationWidth,height:layout.duoNavigationHeight,maxHeight:'100%',borderRadius:layout.duoNavigationWidth/2,borderWidth:1,padding:2},
 selection:{position:'absolute',left:0,top:0},selectionMaterial:{borderRadius:27},
 badge:{position:'absolute',right:1,top:0,backgroundColor:colors.action,borderRadius:9,minWidth:18,paddingHorizontal:3,alignItems:'center'},badgeText:{fontSize:11,lineHeight:18,color:colors.white},
 items:{flexGrow:1,flexDirection:'row'},tab:{flex:1,minWidth:44,minHeight:58,paddingHorizontal:2,paddingVertical:6,alignItems:'center',justifyContent:'center',gap:4},
 verticalItems:{flexDirection:'column',padding:3},compact:{flex:0,width:layout.duoNavigationItemSize,minWidth:layout.duoNavigationItemSize,minHeight:layout.duoNavigationItemSize,padding:0,gap:0},
 label:{fontSize:12,lineHeight:16,color:colors.muted,textAlign:'center'},selected:{color:colors.blueText,fontWeight:'600'},duck:{fontSize:24,lineHeight:28},duoDuck:{fontSize:layout.duoNavigationIconSize,lineHeight:34},
});
