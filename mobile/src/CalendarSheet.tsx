import React,{useEffect,useRef} from 'react';
import {Animated,Easing,Platform,Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {CloseButton} from './ui';
import {DraggableSheet,useReducedMotion} from './motion';
import {useSheetTopBackdrop} from './SheetBackdrop';
import {colors,typography} from './theme';
/** Pane-scoped contents, with the same dimming across the app-owned header/safe area. */
export function CalendarSheet({title,onClose,busy=false,bottomInset=0,expanded=false,animateDismiss=true,children}:{title:string;onClose:()=>void;busy?:boolean;bottomInset?:number;expanded?:boolean;animateDismiss?:boolean;children:React.ReactNode}){
 const root=useRef<React.ComponentRef<typeof View>>(null),close=useRef(onClose),blocked=useRef(busy),closing=useRef(false),entered=useRef(false),measured=useRef(0);
 const reduced=useReducedMotion(),{height}=useWindowDimensions(),offset=useRef(new Animated.Value(height)).current,dim=useRef(new Animated.Value(0)).current;
 close.current=onClose;blocked.current=busy;
 function open(cardHeight:number){measured.current=cardHeight;if(entered.current)return;entered.current=true;offset.setValue(cardHeight+20);if(reduced){offset.setValue(0);dim.setValue(1);return;}Animated.parallel([Animated.timing(offset,{toValue:0,duration:360,easing:Easing.bezier(.22,1,.36,1),useNativeDriver:Platform.OS!=='web'}),Animated.timing(dim,{toValue:1,duration:220,useNativeDriver:Platform.OS!=='web'})]).start();}
 function dismiss(){if(blocked.current||closing.current)return;if(!animateDismiss||reduced){close.current();return;}closing.current=true;Animated.parallel([Animated.timing(offset,{toValue:(measured.current||height)+20,duration:260,easing:Easing.in(Easing.cubic),useNativeDriver:Platform.OS!=='web'}),Animated.timing(dim,{toValue:0,duration:220,useNativeDriver:Platform.OS!=='web'})]).start(({finished})=>{if(finished)close.current();});}
 useSheetTopBackdrop(root,dismiss,busy,dim);
 useEffect(()=>{closing.current=false;},[title]);
 useEffect(()=>{if(reduced){offset.stopAnimation();dim.stopAnimation();offset.setValue(0);dim.setValue(1);if(closing.current)close.current();}},[reduced]);
 useEffect(()=>()=>{offset.stopAnimation();dim.stopAnimation();},[]);
 useEffect(()=>{if(Platform.OS!=='web')return;const element=root.current as unknown as HTMLElement;if(!element)return;const previous=document.activeElement as HTMLElement|null,owner=element.parentElement;const focusable=()=>Array.from(element.querySelectorAll<HTMLElement>('button,input,select,textarea,[tabindex="0"]')).filter(e=>!e.hasAttribute('disabled')&&e.offsetParent!==null&&e.getAttribute('data-testid')!=='calendar-sheet-backdrop');focusable()[0]?.focus();function key(e:KeyboardEvent){if(e.key==='Escape'){e.preventDefault();dismiss();}if(e.key==='Tab'){const items=focusable(),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}element.addEventListener('keydown',key);return()=>{element.removeEventListener('keydown',key);if(element.contains(document.activeElement)||document.activeElement===document.body||(document.activeElement as HTMLElement)?.getAttribute('data-testid')==='calendar-top-backdrop'){if(previous?.isConnected)previous.focus();else requestAnimationFrame(()=>{if(owner?.isConnected)owner.querySelector<HTMLElement>('[aria-label="년월 선택"]')?.focus();});}};},[title,reduced,animateDismiss]);
 return <View ref={root} collapsable={false} style={[s.backdrop,{bottom:bottomInset}]} testID="calendar-sheet" accessibilityViewIsModal role="dialog" aria-modal aria-label={title}>
  <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#00000055',opacity:dim}]}/>
  <Pressable testID="calendar-sheet-backdrop" accessibilityRole="button" accessibilityLabel="배경 눌러 닫기" disabled={busy} onPress={dismiss} style={StyleSheet.absoluteFill}/>
  <Animated.View onLayout={e=>open(e.nativeEvent.layout.height)} style={[s.wrap,expanded&&{height:'96%',maxHeight:'96%'},{transform:[{translateY:offset}]}]}><DraggableSheet disabled={busy} onDismiss={dismiss} style={[s.sheet,expanded&&{height:'100%',borderRadius:28,margin:8,backgroundColor:colors.surface}]}>
   <View style={s.heading}><Text accessibilityRole="header" style={s.title}>{title}</Text><CloseButton onPress={dismiss} disabled={busy}/></View>{children}
  </DraggableSheet></Animated.View>
 </View>;
}
const s=StyleSheet.create({backdrop:{position:'absolute',top:0,right:0,bottom:0,left:0,justifyContent:'flex-end',zIndex:15},wrap:{maxHeight:'94%',flexShrink:1},sheet:{backgroundColor:colors.bg,borderTopLeftRadius:28,borderTopRightRadius:28,padding:20,paddingTop:16,maxHeight:'100%',flexShrink:1},heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:12},title:{...typography.section,color:colors.text,flex:1}});
