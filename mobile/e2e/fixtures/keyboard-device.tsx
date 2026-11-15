import React,{useState} from 'react';
import {View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {DuoLayoutFrame} from '../../src/DuoLayout';
import type {DuoGeometry} from '../../src/duo-layout';
import {KeyboardUXProvider} from '../../src/KeyboardUX';
import {TodoEditorForm} from '../../src/ui';
import {useTodos} from '../../src/useTodos';
import {MotionProvider} from '../../src/motion';
import {Shell} from '../../App';
const {createRoot}=require('react-dom/client');
const host=globalThis as any;
function Form(){const store=useTodos();return store.loading?<View/>:<TodoEditorForm todo={store.todos[0]} dueDate={null} store={store} onClose={()=>{host.editorClosed=true;}}/>;}
function Fixture(){
 const [geometry,setGeometry]=useState<DuoGeometry|null>(null),[keyboard,setKeyboard]=useState(false),[mode,setMode]=useState('form'),[keyboardTop,setKeyboardTop]=useState<number|null>(null);
 host.keyboardDevice={geometry:setGeometry,keyboard:setKeyboard,mode:setMode,keyboardTop:setKeyboardTop};
 return <SafeAreaProvider initialMetrics={{frame:{x:0,y:0,width:960,height:740},insets:{top:0,right:0,bottom:0,left:0}}}><View style={{flex:1,minHeight:0}}><DuoLayoutFrame geometry={geometry} enabled={!!geometry}>{mode==='form'?<KeyboardUXProvider occlusion={keyboard} occlusionTop={keyboardTop}><Form/></KeyboardUXProvider>:<Shell keyboardOccluded={keyboard}/>}</DuoLayoutFrame></View></SafeAreaProvider>;
}
createRoot(document.getElementById('root')).render(<MotionProvider><Fixture/></MotionProvider>);
