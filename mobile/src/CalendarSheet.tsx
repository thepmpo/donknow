import {useDesktopPresentation} from './DesktopPresentation';
import {useKeyboardInset} from './useFocusedField';
import {KeyboardDismiss,useKeyboardUX} from './KeyboardUX';
import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Animated,Easing,Platform,Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {CloseButton} from './ui';
import {CalendarSheetCard} from './CalendarSheetCard';
import {MotionView,useReducedMotion} from './motion';
import {useSheetTopBackdrop} from './SheetBackdrop';
import {colors,typography} from './theme';
/** Pane-scoped contents, with the same dimming across the app-owned header/safe area. */
export function CalendarSheet({title,onClose,busy=false,bottomInset=0,expanded=false,animateDismiss=true,headerAction,headerContent,fill=false,centered=false,stableContent=false,closeInCalendarSlot=false,showTitle=true,children}:{title:string;onClose:()=>void;busy?:boolean;bottomInset?:number;expanded?:boolean;animateDismiss?:boolean;headerAction?:React.ReactNode;headerContent?:React.ReactNode;fill?:boolean;centered?:boolean;stableContent?:boolean;closeInCalendarSlot?:boolean;showTitle?:boolean;children:React.ReactNode}){
 const keyboard=useKeyboardUX(),filled=fill,desktop=useDesktopPresentation();
 const calendarClose=closeInCalendarSlot&&!desktop;
 const root=useRef<React.ComponentRef<typeof View>>(null),close=useRef(onClose),blocked=useRef(busy),closing=useRef(false),entered=useRef(false),measured=useRef(0);
 const keyboardInset=useKeyboardInset(root);
 const reduced=useReducedMotion(),{height}=useWindowDimensions(),offset=useRef(new Animated.Value(height)).current,dim=useRef(new Animated.Value(0)).current;
 const [entering,setEntering]=useState(true);
 const frozen=useRef({title,children});
 if(frozen.current.title!==title||!entering&&!closing.current||!stableContent)frozen.current={title,children};
 close.current=onClose;blocked.current=busy;
 function open(cardHeight:number){measured.current=cardHeight;if(entered.current)return;entered.current=true;offset.setValue(centered?16:cardHeight+20);if(reduced){offset.setValue(0);dim.setValue(1);setEntering(false);return;}Animated.parallel([Animated.timing(offset,{toValue:0,duration:centered?200:320,easing:Easing.bezier(.32,0,.2,1),useNativeDriver:Platform.OS!=='web'}),Animated.timing(dim,{toValue:1,duration:220,useNativeDriver:Platform.OS!=='web'})]).start(({finished})=>{if(finished)setEntering(false);});}
 function dismiss(held=0){if(blocked.current||closing.current)return;if(!animateDismiss||reduced){close.current();return;}closing.current=true;Animated.parallel([Animated.timing(offset,{toValue:Math.max(0,(centered?12:(measured.current||height)+20)-held),duration:220,easing:Easing.in(Easing.cubic),useNativeDriver:Platform.OS!=='web'}),Animated.timing(dim,{toValue:0,duration:220,useNativeDriver:Platform.OS!=='web'})]).start(({finished})=>{if(finished)close.current();});}
 useSheetTopBackdrop(root,()=>dismiss(),busy,dim);
 useLayoutEffect(()=>{
  if(!closing.current)return;
  closing.current=false;offset.stopAnimation();dim.stopAnimation();offset.setValue(0);dim.setValue(1);setEntering(false);
 },[title,offset,dim]);
 useEffect(()=>{if(reduced){offset.stopAnimation();dim.stopAnimation();offset.setValue(0);dim.setValue(1);setEntering(false);if(closing.current)close.current();}},[reduced]);
 useEffect(()=>()=>{offset.stopAnimation();dim.stopAnimation();},[]);
 useEffect(()=>{if(Platform.OS!=='web')return;const element=root.current as unknown as HTMLElement;if(!element)return;const previous=document.activeElement as HTMLElement|null,owner=element.parentElement;const focusable=()=>Array.from(element.querySelectorAll<HTMLElement>('button,input,select,textarea,[tabindex="0"]')).filter(e=>!e.hasAttribute('disabled')&&e.offsetParent!==null&&e.getAttribute('data-testid')!=='calendar-sheet-backdrop');focusable()[0]?.focus();function key(e:KeyboardEvent){if(e.key==='Escape'){e.preventDefault();dismiss();}if(e.key==='Tab'){const items=focusable(),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}element.addEventListener('keydown',key);return()=>{element.removeEventListener('keydown',key);if(element.contains(document.activeElement)||document.activeElement===document.body||(document.activeElement as HTMLElement)?.getAttribute('data-testid')==='calendar-top-backdrop'){if(previous?.isConnected)previous.focus();else requestAnimationFrame(()=>{if(owner?.isConnected)owner.querySelector<HTMLElement>('[aria-label="년월 선택"]')?.focus();});}};},[title,reduced,animateDismiss]);
 const closeButton=<CloseButton onPress={()=>dismiss()} disabled={busy} calendarSlot={calendarClose} duoLabel={title==='Event 상세'?'Event 상세 닫기':undefined}/>;
 const headerControls=<><KeyboardDismiss/>{!calendarClose&&closeButton}{headerAction}{calendarClose&&closeButton}</>;
 return <View ref={root} collapsable={false} onLayout={keyboardInset.measure} style={[s.backdrop,centered&&{justifyContent:'center'},{bottom:filled&&keyboard.occluding?0:bottomInset}]} testID="calendar-sheet" accessibilityViewIsModal role="dialog" aria-modal aria-label={title}>
  <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:colors.scrim,opacity:dim}]}/>
  <Pressable testID="calendar-sheet-backdrop" accessibilityRole="button" accessibilityLabel="배경 눌러 닫기" disabled={busy} onPress={()=>dismiss()} style={StyleSheet.absoluteFill}/>
  <Animated.View onLayout={e=>open(e.nativeEvent.layout.height)} style={[s.wrap,centered&&s.centered,desktop&&!centered&&{width:'100%',maxWidth:640,alignSelf:'center'},expanded&&{maxHeight:'96%'},filled&&{height:'100%',maxHeight:'100%'},{transform:[{translateY:offset}]}]}><CalendarSheetCard identity={title} disabled={busy} onDismiss={dismiss} style={[s.sheet,filled&&{flex:1},centered&&{borderRadius:24},expanded&&{borderRadius:28,margin:8,backgroundColor:colors.surface}]}>
   {headerContent?<View style={[s.heading,s.centeredHeading]}>
    <View style={s.headerContent}>{headerContent}</View>
    <View style={[s.headerControls,s.trailingControls]}>{headerControls}</View>
   </View>:<View style={s.heading}>{showTitle?<Text accessibilityRole="header" style={s.title}>{title}</Text>:<View style={s.title}/>}<View style={s.headerControls}>{headerControls}</View></View>}<MotionView initial={false} transitionKey={title} distance={0} disabled style={{minHeight:0,flexShrink:1,marginBottom:filled?Math.max(0,keyboardInset.inset-8):0,...(filled?{flex:1}:{})}}>{frozen.current.children}</MotionView>
  </CalendarSheetCard></Animated.View>
 </View>;
}
const s=StyleSheet.create({backdrop:{position:'absolute',top:0,right:0,bottom:0,left:0,justifyContent:'flex-end',zIndex:15},centered:{alignSelf:'center',width:'92%',maxWidth:360},wrap:{maxHeight:'94%',flexShrink:1},sheet:{backgroundColor:colors.sheet,borderTopLeftRadius:28,borderTopRightRadius:28,padding:20,paddingTop:16,maxHeight:'100%',flexShrink:1},heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:12},centeredHeading:{minHeight:44,justifyContent:'center',paddingHorizontal:44},headerContent:{flex:1,minWidth:0},headerControls:{flexDirection:'row',alignItems:'center',gap:4},trailingControls:{position:'absolute',right:0},title:{...typography.section,color:colors.text,flex:1}});
