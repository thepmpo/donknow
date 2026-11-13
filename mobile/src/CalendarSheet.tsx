import React,{useEffect,useRef} from 'react';
import {Platform,StyleSheet,Text,View} from 'react-native';
import {CloseButton} from './ui';
import {DraggableSheet,MotionView} from './motion';
import {colors,typography} from './theme';
/** Inline, pane-scoped sheet: a fixed Duo Calendar never takes over the other pane. */
export function CalendarSheet({title,onClose,busy=false,bottomInset=0,expanded=false,children}:{title:string;onClose:()=>void;busy?:boolean;bottomInset?:number;expanded?:boolean;children:React.ReactNode}){
 const root=useRef<React.ComponentRef<typeof View>>(null),close=useRef(onClose),blocked=useRef(busy);close.current=onClose;blocked.current=busy;
 useEffect(()=>{if(Platform.OS!=='web')return;const element=root.current as unknown as HTMLElement;if(!element)return;const previous=document.activeElement as HTMLElement|null;const focusable=()=>Array.from(element.querySelectorAll<HTMLElement>('button,input,select,textarea,[tabindex="0"]')).filter(e=>!e.hasAttribute('disabled')&&e.offsetParent!==null);focusable()[0]?.focus();function key(e:KeyboardEvent){if(e.key==='Escape'){e.preventDefault();if(!blocked.current)close.current();}if(e.key==='Tab'){const items=focusable(),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}element.addEventListener('keydown',key);return()=>{element.removeEventListener('keydown',key);if(element.contains(document.activeElement)||document.activeElement===document.body)previous?.isConnected&&previous.focus();};},[]);
 return <View ref={root} style={[s.backdrop,{bottom:bottomInset}]} testID="calendar-sheet" accessibilityViewIsModal role="dialog" aria-modal aria-label={title}>
  <MotionView style={[s.wrap,expanded&&{height:'96%',maxHeight:'96%'}]} transitionKey={title} distance={8}><DraggableSheet disabled={busy} onDismiss={onClose} style={[s.sheet,expanded&&{height:'100%',borderRadius:28,margin:8,backgroundColor:colors.surface}]}>
   <View style={s.heading}><Text accessibilityRole="header" style={s.title}>{title}</Text><CloseButton onPress={onClose} disabled={busy}/></View>{children}
  </DraggableSheet></MotionView>
 </View>;
}
const s=StyleSheet.create({backdrop:{position:'absolute',top:0,right:0,bottom:0,left:0,backgroundColor:'#00000055',justifyContent:'flex-end',zIndex:15},wrap:{maxHeight:'94%',flexShrink:1},sheet:{backgroundColor:colors.bg,borderTopLeftRadius:28,borderTopRightRadius:28,padding:20,paddingTop:16,maxHeight:'100%',flexShrink:1},heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:12},title:{...typography.section,color:colors.text,flex:1}});
