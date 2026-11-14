import {Platform} from 'react-native';
import {requireOptionalNativeModule} from 'expo';
type KeyboardDoneModule={setEnabled:(enabled:boolean)=>Promise<void>};
/** Retire option 2. Option 1 uses app controls and never installs an OS toolbar. */
export function disableLegacyKeyboardAccessory(){
 if(Platform.OS!=='ios')return()=>{};
 const module=requireOptionalNativeModule<KeyboardDoneModule>('DuckduckKeyboard');
 if(!module)return()=>{}; // Existing binaries need a native update for this module.
 // Option 1 replaces the OS toolbar, including the prominent iOS 27 Done pill.
 void module.setEnabled(false).catch(()=>{});
 return()=>{void module.setEnabled(false).catch(()=>{});};
}
