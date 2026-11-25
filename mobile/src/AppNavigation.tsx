import {BrandMark} from './BrandMark';
import React,{type ComponentRef,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Animated,AppState,Easing,PanResponder,Platform,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {LayoutRectangle} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {useReducedMotion} from './motion';
import {colors,palette,layout,navigationMotion} from './theme';
import {useDuoNavigationPortal,useDuoScene} from './DuoChrome';
import {useSurfaceBlocked} from './SurfaceInteraction';
import {NavigationGlass} from './NavigationGlass';
import {lensPosition,shouldScrub,tabAtPoint} from './navigation-geometry';
export const appTabs=[
 {id:'calendar',name:'캘린더',label:'캘린더',icon:'calendar-outline'},
 {id:'todos',name:'Todo 리스트',label:'할 일',icon:'checkmark-circle-outline'},
 {id:'duck',name:'docen',label:'docen',icon:'chatbubble-outline'},
 {id:'log',name:'log',label:'log',icon:'time-outline'},
 {id:'profile',name:'ME',label:'ME',icon:'person-outline'},
] as const;
export type AppTab=typeof appTabs[number]['id'];
type Props={tab:AppTab;onSelect:(tab:AppTab)=>void;onCalendarLongPress?:()=>void;onCalendarDoublePress?:()=>void;duo:boolean;bottomInset?:number;small?:boolean;unread?:number;disabled?:boolean};
const native=Platform.OS!=='web';
function NavigationVisual({active,children,testID,duo}:{active:boolean;children:React.ReactNode;testID:string;duo:boolean}){
 const reduced=useReducedMotion(),scale=useRef(new Animated.Value(1)).current;
 useEffect(()=>{scale.stopAnimation();if(reduced){scale.setValue(1);return;}
  const animation=Animated.spring(scale,{toValue:active?navigationMotion.iconScale:1,stiffness:500,damping:34,mass:.65,overshootClamping:true,useNativeDriver:native});animation.start();return()=>animation.stop();
 },[active,reduced,scale]);
 return <Animated.View testID={testID} pointerEvents="none" style={{alignItems:'center',justifyContent:'center',gap:duo?0:4,transform:[{scale}]}}>{children}</Animated.View>;
}
function NavigationBar({tab,onSelect,onCalendarLongPress,onCalendarDoublePress,duo,bottomInset=0,unread=0,disabled=false}:Props){
 const {calendarDay}=useDuoScene();
 const date=calendarDay?new Date(calendarDay+'T12:00:00'):new Date();
 const surfaceBlocked=useSurfaceBlocked(),blocked=surfaceBlocked||disabled,reduced=useReducedMotion(),[frames,setFrames]=useState<Partial<Record<AppTab,LayoutRectangle>>>({});
 const [preview,setPreview]=useState<AppTab|null>(null),[dragging,setDragging]=useState(false),[viewport,setViewport]=useState({width:0,height:0});
 const items=useRef<ComponentRef<typeof View>>(null),origin=useRef<{x:number;y:number}|null>(null),drag=useRef(false),suppress=useRef(false),generation=useRef(0);
 const x=useRef(new Animated.Value(0)).current,y=useRef(new Animated.Value(0)).current,scale=useRef(new Animated.Value(1)).current;
 // RN Web can omit the synthetic click after a responder-managed drag.
 // Commit short web touches once; native, keyboard and accessibility use Pressable.
 const touchTap=useRef<{id:AppTab;x:number;y:number}|null>(null);
 const touchCommit=useRef<{id:AppTab;until:number}|null>(null);
 const lastCalendarTap=useRef<number|null>(null);
 const releaseTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const initialized=useRef(false),direction=useRef(duo),frame=frames[preview??tab];
 const bounds=Object.values(frames).reduce((b,f)=>({width:Math.max(b.width,f.x+f.width),height:Math.max(b.height,f.y+f.height)}),{width:0,height:0});
 const overflow=duo?bounds.height>viewport.height+1:bounds.width>viewport.width+1;
 const indicator=frame?{width:duo?layout.duoNavigationItemSize:Math.min(64,frame.width-4),height:duo?layout.duoNavigationItemSize:Math.min(54,frame.height-4)}:null;
 const targetX=frame&&indicator?frame.x+(frame.width-indicator.width)/2:0,targetY=frame&&indicator?frame.y+(frame.height-indicator.height)/2:0;
 const stop=()=>{x.stopAnimation();y.stopAnimation();scale.stopAnimation();};
 const settle=()=>{if(releaseTimer.current)clearTimeout(releaseTimer.current);generation.current++;drag.current=false;origin.current=null;setDragging(false);setPreview(null);};
 function activate(id:AppTab){
  if(id==='calendar'&&!duo&&onCalendarDoublePress){const now=Date.now(),last=lastCalendarTap.current;if(last!==null&&now-last>=0&&now-last<=320){lastCalendarTap.current=null;onCalendarDoublePress();return;}lastCalendarTap.current=now;}else lastCalendarTap.current=null;
  onSelect(id);
 }
 const current=useRef({frames,bounds,indicator,reduced,duo,overflow,blocked,onSelect,onTap:activate,settle});
 current.current={frames,bounds,indicator,reduced,duo,overflow,blocked,onSelect,onTap:activate,settle};
 useLayoutEffect(()=>{
  if(direction.current!==duo){lastCalendarTap.current=null;drag.current=false;origin.current=null;setDragging(false);setPreview(null);}
  if(drag.current)return;
  if(!frame){stop();return;}
  if(reduced||!initialized.current||direction.current!==duo){stop();x.setValue(targetX);y.setValue(targetY);scale.setValue(1);}
  else Animated.parallel([
   Animated.spring(x,{toValue:targetX,stiffness:navigationMotion.stiffness,damping:navigationMotion.damping,mass:navigationMotion.mass,overshootClamping:true,useNativeDriver:native}),
   Animated.spring(y,{toValue:targetY,stiffness:navigationMotion.stiffness,damping:navigationMotion.damping,mass:navigationMotion.mass,overshootClamping:true,useNativeDriver:native}),
   Animated.timing(scale,{toValue:preview?navigationMotion.pressedScale:1,duration:preview?navigationMotion.press:navigationMotion.release,easing:Easing.out(Easing.cubic),useNativeDriver:native}),
  ]).start();
  initialized.current=true;direction.current=duo;
  // Let a new spring inherit the current position and velocity on rapid retargets.
 },[targetX,targetY,!!frame,reduced,duo,preview,dragging,x,y,scale]);
 useLayoutEffect(()=>()=>{if(releaseTimer.current)clearTimeout(releaseTimer.current);stop();origin.current=null;drag.current=false;},[]);
 useEffect(()=>{if(blocked){lastCalendarTap.current=null;suppress.current=true;settle();}},[blocked]);
 function begin(id:AppTab){
  if(releaseTimer.current)clearTimeout(releaseTimer.current);touchCommit.current=null;suppress.current=false;setPreview(id);const token=++generation.current;
  items.current?.measureInWindow((left,top)=>{if(token===generation.current)origin.current={x:left,y:top};});
 }
 useEffect(()=>{const subscription=AppState.addEventListener('change',state=>{if(state!=='active'){lastCalendarTap.current=null;suppress.current=true;current.current.settle();}});return()=>subscription.remove();},[]);
 const responder=useRef(PanResponder.create({
  onMoveShouldSetPanResponderCapture:(_,g)=>{const capture=!current.current.blocked&&g.numberActiveTouches===1&&!!origin.current&&shouldScrub(g.dx,g.dy,current.current.duo,current.current.overflow);if(capture)drag.current=true;return capture;},
  onPanResponderGrant:()=>{lastCalendarTap.current=null;if(releaseTimer.current)clearTimeout(releaseTimer.current);drag.current=true;suppress.current=true;setDragging(true);stop();scale.setValue(current.current.reduced?1:navigationMotion.pressedScale);},
  onPanResponderMove:(_,g)=>{
   const c=current.current,o=origin.current;if(g.numberActiveTouches>1){suppress.current=true;c.settle();return;}if(!o||!c.indicator)return;
   const point={x:g.moveX-o.x,y:g.moveY-o.y},hit=tabAtPoint<AppTab>(point,c.frames);
   if(hit)setPreview(hit);
   const position=lensPosition(point,c.indicator,c.bounds);x.setValue(position.x);y.setValue(position.y);
  },
  onPanResponderRelease:(_,g)=>{
   const c=current.current,o=origin.current;
   const hit=o?tabAtPoint<AppTab>({x:g.moveX-o.x,y:g.moveY-o.y},c.frames):null;
   c.settle();if(hit&&!c.blocked)c.onSelect(hit);
  },
  onPanResponderTerminate:()=>{suppress.current=true;current.current.settle();},
  onPanResponderTerminationRequest:()=>true,
  onPanResponderReject:()=>{current.current.settle();},
 })).current;
 return <NavigationGlass pointerEvents={blocked?'none':'auto'} aria-hidden={surfaceBlocked} accessibilityElementsHidden={surfaceBlocked} importantForAccessibility={surfaceBlocked?'no-hide-descendants':'auto'} style={[styles.bar,disabled&&{opacity:.55},duo?styles.duo:[styles.bottom,{bottom:Math.max(bottomInset,layout.navigationBottomGap)}]]} testID={duo?'DuoTrailingNavigation':'BottomNavigation'} accessibilityRole="tablist">
  <ScrollView disableScrollViewPanResponder={!overflow} horizontal={!duo} scrollEnabled={overflow&&!dragging&&!blocked} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={{flexGrow:1}} style={{minWidth:0,minHeight:0}} onLayout={event=>{const {width,height}=event.nativeEvent.layout;setViewport({width,height});if(drag.current||preview!==null)settle();}}>
   <View ref={items} {...responder.panHandlers} testID="navigation-items" style={[styles.items,duo&&styles.verticalItems]}>
    {indicator&&<Animated.View pointerEvents="none" testID="navigation-selection" style={[styles.selection,indicator,{transform:[{translateX:x},{translateY:y},{scale}]}]}><NavigationGlass variant="selection" active={preview!==null} pointerEvents="none" style={[StyleSheet.absoluteFill,styles.selectionMaterial]}/></Animated.View>}
    {appTabs.map(item=><Pressable {...(native?{unstable_pressDelay:0}:{delayPressIn:0,delayPressOut:0})} key={item.id} accessibilityRole="tab" accessibilityLabel={item.name} disabled={blocked} accessibilityState={{selected:item.id===tab,disabled:blocked}} aria-selected={item.id===tab} accessibilityHint={item.id==='calendar'?(onCalendarDoublePress&&!duo?'한 번 누르면 오늘, 두 번 빠르게 누르면 주간·일간 보기 전환':onCalendarLongPress?'다시 누르면 오늘, 길게 누르면 주간·일간 보기 전환':'누르면 오늘로 돌아가기'):item.id==='profile'?'계정, 서비스 연결, 알림과 개인 설정':undefined} accessibilityActions={item.id==='calendar'&&!duo&&(onCalendarDoublePress||onCalendarLongPress)?[{name:'longpress',label:'주간·일간 보기 전환'}]:undefined} onAccessibilityAction={event=>{if(item.id==='calendar'&&event.nativeEvent.actionName==='longpress'&&!duo){lastCalendarTap.current=null;(onCalendarDoublePress??onCalendarLongPress)?.();}}} delayLongPress={500} onLongPress={item.id==='calendar'&&onCalendarLongPress?()=>{if(!drag.current&&!suppress.current){lastCalendarTap.current=null;suppress.current=true;onCalendarLongPress();}}:undefined} onTouchStart={event=>{if(native||blocked)return;if(event.nativeEvent.touches.length!==1){touchTap.current=null;suppress.current=true;settle();return;}begin(item.id);const touch=event.nativeEvent.touches[0];touchTap.current={id:item.id,x:touch.pageX,y:touch.pageY};}} onTouchEnd={event=>{const c=current.current,start=touchTap.current,touch=event.nativeEvent.changedTouches[0];touchTap.current=null;if(native||c.blocked||drag.current||suppress.current||event.nativeEvent.touches.length||!start||!touch||start.id!==item.id||Math.hypot(touch.pageX-start.x,touch.pageY-start.y)>8)return;touchCommit.current={id:item.id,until:Date.now()+300};c.onTap(item.id);settle();}} onTouchCancel={()=>{if(native)return;touchTap.current=null;suppress.current=true;settle();}} onPressIn={()=>begin(item.id)} onPressOut={()=>{if(!drag.current)releaseTimer.current=setTimeout(()=>{current.current.settle();},100);}} onPress={()=>{const committed=touchCommit.current;if(committed?.id===item.id&&Date.now()<committed.until){touchCommit.current=null;return;}if(!suppress.current){if(releaseTimer.current)clearTimeout(releaseTimer.current);activate(item.id);settle();}}} onLayout={event=>{const next=event.nativeEvent.layout;setFrames(old=>{const prior=old[item.id];return prior&&Object.keys(next).every(key=>next[key as keyof LayoutRectangle]===prior[key as keyof LayoutRectangle])?old:{...old,[item.id]:next};});}} style={[styles.tab,duo&&styles.compact]}>
     <NavigationVisual testID={'navigation-visual-'+item.id} active={preview===item.id} duo={duo}>
     {item.id==='duck'?<BrandMark testID={'navigation-icon-'+item.id} size={duo?Math.max(36,layout.duoNavigationIconSize+8):32} cutout decorative/>:item.id==='calendar'?<View testID="navigation-calendar-date" style={{alignItems:'center',justifyContent:'center',height:duo?layout.duoNavigationIconSize+8:28}}><Text selectable={false} style={{fontSize:9,lineHeight:11,color:item.id===(preview??tab)?colors.blueText:colors.secondary}}>{new Intl.DateTimeFormat('ko-KR',{weekday:'short'}).format(date)}</Text><Text selectable={false} style={{fontSize:duo?24:19,lineHeight:duo?27:21,fontWeight:'600',color:item.id===(preview??tab)?colors.blueText:colors.secondary}}>{date.getDate()}</Text></View>:<Ionicons style={{userSelect:'none'}} testID={'navigation-icon-'+item.id} name={item.icon} size={duo?layout.duoNavigationIconSize:24} color={item.id===(preview??tab)?colors.blueText:palette.grey600}/>}
     {!duo&&item.id!=='duck'&&<Text selectable={false} numberOfLines={2} style={[styles.label,item.id===(preview??tab)&&styles.selected]}>{item.label}</Text>}
     </NavigationVisual>
     {item.id==='duck'&&unread>0&&<View style={styles.badge}><Text selectable={false} style={styles.badgeText}>{unread>99?'99+':unread}</Text></View>}
    </Pressable>)}
   </View>
  </ScrollView>{blocked&&<View testID="BackgroundNavigationDim" pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:colors.scrim,borderRadius:duo?layout.duoNavigationWidth/2:layout.navigationRadius}]}/>}
 </NavigationGlass>;
}
/** Full-scene portal preserves the physical camera column through folding/rotation. */
export function AppNavigation(props:Props){
 const {ready}=useDuoScene();
 const {tab,onSelect,onCalendarLongPress,onCalendarDoublePress,duo,bottomInset,small,unread,disabled}=props;
 const bar=useMemo(()=><NavigationBar tab={tab} onSelect={onSelect} onCalendarLongPress={onCalendarLongPress} onCalendarDoublePress={onCalendarDoublePress} duo={duo} bottomInset={bottomInset} small={small} unread={unread} disabled={disabled}/>,[tab,onSelect,onCalendarLongPress,onCalendarDoublePress,duo,bottomInset,small,unread,disabled]);
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
 verticalItems:{flexDirection:'column',alignItems:'center',padding:3},compact:{flex:0,width:layout.duoNavigationItemSize,minWidth:layout.duoNavigationItemSize,minHeight:layout.duoNavigationItemSize,padding:0,gap:0},
 label:{userSelect:'none',fontSize:12,lineHeight:16,color:colors.muted,textAlign:'center'},selected:{color:colors.blueText,fontWeight:'600'},duck:{fontSize:24,lineHeight:28},duoDuck:{fontSize:layout.duoNavigationIconSize,lineHeight:34},
});
