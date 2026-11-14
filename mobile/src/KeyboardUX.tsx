import React,{createContext,useContext,useEffect,useState} from 'react';
import {Keyboard,Platform,View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {MotionPressable as Pressable} from './motion';
import {colors} from './theme';

const Context=createContext({visible:false,occluding:false,dismiss:()=>Keyboard.dismiss()});
/** One visibility source; dismissal never submits, saves or changes the draft. */
export function KeyboardUXProvider({children,occlusion}:{children:React.ReactNode;occlusion?:boolean}){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{
  const show=Keyboard.addListener('keyboardWillShow',()=>setVisible(true)),shown=Keyboard.addListener('keyboardDidShow',()=>setVisible(true)),hide=Keyboard.addListener('keyboardWillHide',()=>setVisible(false)),hidden=Keyboard.addListener('keyboardDidHide',()=>setVisible(false));
  const focus=(e:FocusEvent)=>{const el=e.target as HTMLElement;if(el?.matches('textarea,input:not([type=date]):not([type=time]):not([type=checkbox])'))setVisible(true);};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setVisible(false);};
  if(Platform.OS==='web'){document.addEventListener('focusin',focus);document.addEventListener('keydown',escape);}
  return()=>{show.remove();shown.remove();hide.remove();hidden.remove();if(Platform.OS==='web'){document.removeEventListener('focusin',focus);document.removeEventListener('keydown',escape);}};
 },[]);
 function dismiss(){if(Platform.OS==='web')(document.activeElement as HTMLElement|null)?.blur();Keyboard.dismiss();setVisible(false);}
 return <Context.Provider value={{visible:visible||occlusion===true,occluding:occlusion??(visible&&Platform.OS!=='web'),dismiss}}>{children}</Context.Provider>;
}
export const useKeyboardUX=()=>useContext(Context);
export function KeyboardDismiss({fallback=false}:{fallback?:boolean}){
 const {visible,dismiss}=useKeyboardUX();
 if(!visible)return null;
 return <View testID={fallback?'keyboard-dismiss-fallback':'keyboard-dismiss-inline'}><Pressable accessibilityRole="button" accessibilityLabel="키보드 내리기" accessibilityHint="입력한 내용을 유지하고 키보드만 닫아요." onPress={dismiss} style={{width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:22}}><MaterialCommunityIcons name="keyboard-close" size={24} color={colors.blueText}/></Pressable></View>;
}
