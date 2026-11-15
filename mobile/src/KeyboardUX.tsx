import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {Keyboard,Platform} from 'react-native';
import {useDuoBackState} from './DuoBackNavigation';

const Context=createContext({visible:false,occluding:false,screenY:null as number|null,dismiss:()=>Keyboard.dismiss()});
/** One visibility source; dismissal never submits, saves or changes the draft. */
export function KeyboardUXProvider({children,occlusion,occlusionTop}:{children:React.ReactNode;occlusion?:boolean;occlusionTop?:number|null}){
 const [visible,setVisible]=useState(false);
 const [screenY,setScreenY]=useState<number|null>(null);
 useEffect(()=>{
  const update=(event:{endCoordinates:{screenY:number;height:number}})=>{setVisible(true);setScreenY(event.endCoordinates.screenY);};
  const clear=()=>{setVisible(false);setScreenY(null);};
  const show=Keyboard.addListener('keyboardWillShow',update),shown=Keyboard.addListener('keyboardDidShow',update),change=Keyboard.addListener('keyboardWillChangeFrame',event=>{if(event.endCoordinates.height>0)setScreenY(event.endCoordinates.screenY);}),hide=Keyboard.addListener('keyboardWillHide',clear),hidden=Keyboard.addListener('keyboardDidHide',clear);
  const focus=(e:FocusEvent)=>{const el=e.target as HTMLElement;if(el?.matches('textarea,input:not([type=date]):not([type=time]):not([type=checkbox])'))setVisible(true);};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setVisible(false);};
  if(Platform.OS==='web'){document.addEventListener('focusin',focus);document.addEventListener('keydown',escape);}
  return()=>{show.remove();shown.remove();change.remove();hide.remove();hidden.remove();if(Platform.OS==='web'){document.removeEventListener('focusin',focus);document.removeEventListener('keydown',escape);}};
 },[]);
 function dismiss(){if(Platform.OS==='web')(document.activeElement as HTMLElement|null)?.blur();Keyboard.dismiss();setVisible(false);}
 return <Context.Provider value={{visible:visible||occlusion===true,occluding:occlusion??(visible&&Platform.OS!=='web'),screenY:occlusionTop===undefined?screenY:occlusionTop,dismiss}}>{children}</Context.Provider>;
}
export const useKeyboardUX=()=>useContext(Context);
export function KeyboardDismiss({fallback=false}:{fallback?:boolean}){
 const {visible,dismiss}=useKeyboardUX();
 const {enabled,registerKeyboard}=useDuoBackState(),id=useRef(Symbol()),latest=useRef(dismiss);latest.current=dismiss;
 useEffect(()=>{if(enabled&&visible)return registerKeyboard({id:id.current,dismiss:()=>latest.current()});},[enabled,visible,registerKeyboard]);
 // The modal's own Duo surface owns its control. Ordinary iPhone uses its
 // native input accessory; neither device gets another button in the header.
 return null;
}
