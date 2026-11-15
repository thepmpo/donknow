import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {Keyboard,Platform,ScrollView,TextInput,View} from 'react-native';
import {useKeyboardUX} from './KeyboardUX';
import {revealOffset} from './scroll-reveal';
type Region=React.ComponentRef<typeof View>|React.ComponentRef<typeof TextInput>;
export const ScrollRevealContext=createContext<(region:Region|null)=>void>(()=>{});
/** An inline expansion requests scrolling in its existing parent, never a portal. */
export function ScrollRevealRegion({children,testID}:{children:React.ReactNode;testID?:string}){
 const ref=useRef<React.ComponentRef<typeof View>>(null),reveal=useContext(ScrollRevealContext);
 const show=()=>reveal(ref.current);
 useEffect(()=>{show();return()=>reveal(null);},[]);
 return React.createElement(View,{ref,collapsable:false,onLayout:show,testID},children);
}
/** Keep a modal surface fixed; reserve only its content's keyboard overlap. */
export function useKeyboardInset(ref:React.RefObject<React.ComponentRef<typeof View>|null>){
 const keyboard=useKeyboardUX(),[inset,setInset]=useState(0);
 function measure(){if(!keyboard.occluding||keyboard.screenY===null){setInset(0);return;}ref.current?.measureInWindow((x,y,w,h)=>setInset(Math.max(0,Math.min(h,y+h-keyboard.screenY!))));}
 useEffect(()=>{measure();},[keyboard.occluding,keyboard.screenY]);
 return {inset,measure};
}

/** Reveal after focus AND after the keyboard/container has finished resizing. */
export function useFocusedField(scroll:React.RefObject<React.ComponentRef<typeof ScrollView>|null>){
 const keyboard=useKeyboardUX(),focused=useRef<React.ComponentRef<typeof TextInput>|null>(null),offset=useRef(0),frame=useRef<number|undefined>(undefined);
 const region=useRef<Region|null>(null);
 function reveal(){
  if(frame.current!==undefined)cancelAnimationFrame(frame.current);
  frame.current=requestAnimationFrame(()=>{
   const input=region.current??focused.current,container=scroll.current;if(!input||!container||!region.current&&!focused.current?.isFocused())return;
   if(Platform.OS==='web'){
    const field=input as unknown as HTMLElement,view=container.getScrollableNode() as unknown as HTMLElement;
    const f=field.getBoundingClientRect(),v=view.getBoundingClientRect(),next=revealOffset(view.scrollTop,v.top,v.height,f.top,f.height);
    if(Math.abs(next-view.scrollTop)>1)container.scrollTo({y:next,animated:false});
   }else container.measureInWindow((x,y,w,h)=>input.measureInWindow((ix,iy,iw,ih)=>{
    if(h<=0)return;
    const next=revealOffset(offset.current,y,h,iy,ih);
    if(Math.abs(next-offset.current)>1)container.scrollTo({y:next,animated:false});
   }));
  });
 }
 useEffect(()=>{reveal();},[keyboard.occluding]);
 useEffect(()=>{const subscription=Keyboard.addListener('keyboardDidShow',reveal);return()=>{subscription.remove();if(frame.current!==undefined)cancelAnimationFrame(frame.current);};},[]);
 return {show:(target:Region|null)=>{region.current=target;reveal();},focus:(input:React.ComponentRef<typeof TextInput>|null)=>{region.current=null;focused.current=input;reveal();},reveal,onScroll:(event:{nativeEvent:{contentOffset:{y:number}}})=>{offset.current=event.nativeEvent.contentOffset.y;}};
}
