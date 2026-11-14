import {Platform} from 'react-native';
import {requireOptionalNativeModule} from 'expo';
type KeyboardDoneModule={setEnabled:(enabled:boolean)=>Promise<void>};
/** Ordinary iPhone: native Done above keyboard. Duo: camera-column control. */
export function configureKeyboardAccessory(duo:boolean){
 if(Platform.OS!=='ios')return()=>{};
 const module=requireOptionalNativeModule<KeyboardDoneModule>('DuckduckKeyboard');
 if(!module)return()=>{}; // Existing binaries need a native update for this module.
 void module.setEnabled(!duo).catch(()=>{});
 return()=>{void module.setEnabled(false).catch(()=>{});};
}
