import React,{useState} from 'react';
import {View,Text} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {MotionProvider} from '../../src/motion';
import {DuoLayoutFrame} from '../../src/DuoLayout';
import {AppNavigation,type AppTab} from '../../src/AppNavigation';
const {createRoot}=require('react-dom/client');
function Fixture(){
 const [tab,setTab]=useState<AppTab>('todos'),[duo,setDuo]=useState(true),[blocked,setBlocked]=useState(false),[count,setCount]=useState(0);
 (globalThis as any).navigationMotionFixture={setDuo,setBlocked};
 const geometry={apiAvailable:true,hasHinge:true,width:430,height:780,hingeStatus:'closed' as const,safeArea:{top:20,bottom:20,left:16,right:80},regions:[{kind:'occlusion' as const,active:true,frame:{x:370,y:32,width:28,height:28}}]};
 return <SafeAreaProvider><MotionProvider><DuoLayoutFrame enabled={duo} geometry={duo?geometry:null}><View style={{flex:1,padding:20,backgroundColor:'#fff'}}><Text style={{fontSize:24}}>내비게이션 모션 확인</Text><Text testID="motion-current-tab">{tab}</Text><Text testID="motion-select-count">{count}</Text></View><AppNavigation tab={tab} onSelect={next=>{setCount(value=>value+1);setTab(next);}} duo={duo} disabled={blocked}/></DuoLayoutFrame></MotionProvider></SafeAreaProvider>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
