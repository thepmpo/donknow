import React,{useEffect,useRef} from 'react';
import {Keyboard,Platform,ScrollView,TextInput} from 'react-native';
import {useKeyboardUX} from './KeyboardUX';

/** Reveal after focus AND after the keyboard/container has finished resizing. */
export function useFocusedField(scroll:React.RefObject<React.ComponentRef<typeof ScrollView>|null>){
 const keyboard=useKeyboardUX(),focused=useRef<React.ComponentRef<typeof TextInput>|null>(null),offset=useRef(0),frame=useRef<number|undefined>(undefined);
 function reveal(){
  if(frame.current!==undefined)cancelAnimationFrame(frame.current);
  frame.current=requestAnimationFrame(()=>{
   const input=focused.current,container=scroll.current;if(!input||!container||!input.isFocused())return;
   if(Platform.OS==='web'){
    const field=input as unknown as HTMLElement,view=container.getScrollableNode() as unknown as HTMLElement;
    const f=field.getBoundingClientRect(),v=view.getBoundingClientRect(),space=Math.max(24,v.height-24);
    const delta=f.top<v.top+12?f.top-v.top-12:f.top+Math.min(f.height,space)>v.bottom-12?f.top+Math.min(f.height,space)-v.bottom+12:0;
    if(Math.abs(delta)>1)container.scrollTo({y:Math.max(0,view.scrollTop+delta),animated:false});
   }else container.measureInWindow((x,y,w,h)=>input.measureInWindow((ix,iy,iw,ih)=>{
    if(h<=0||!input.isFocused())return;
    const bottom=iy+Math.min(ih,Math.max(24,h-24)),delta=iy<y+12?iy-y-12:bottom>y+h-12?bottom-y-h+12:0;
    if(Math.abs(delta)>1)container.scrollTo({y:Math.max(0,offset.current+delta),animated:false});
   }));
  });
 }
 useEffect(()=>{reveal();},[keyboard.occluding]);
 useEffect(()=>{const subscription=Keyboard.addListener('keyboardDidShow',reveal);return()=>{subscription.remove();if(frame.current!==undefined)cancelAnimationFrame(frame.current);};},[]);
 return {focus:(input:React.ComponentRef<typeof TextInput>|null)=>{focused.current=input;reveal();},reveal,onScroll:(event:{nativeEvent:{contentOffset:{y:number}}})=>{offset.current=event.nativeEvent.contentOffset.y;}};
}
