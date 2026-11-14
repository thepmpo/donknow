import {Platform} from 'react-native';
import {requireOptionalNativeModule} from 'expo';
type KeyboardDoneModule={setEnabled:(enabled:boolean)=>Promise<void>};
/** UIKit owns the real keyboard and its accessory; no fake keyboard is drawn. */
export function enableKeyboardDone(){
 if(Platform.OS!=='ios')return()=>{};
 const module=requireOptionalNativeModule<KeyboardDoneModule>('DuckduckKeyboard');
 if(!module)return()=>{}; // Existing binaries need a native update for this module.
 void module.setEnabled(true).catch(()=>{});
 return()=>{void module.setEnabled(false).catch(()=>{});};
}
