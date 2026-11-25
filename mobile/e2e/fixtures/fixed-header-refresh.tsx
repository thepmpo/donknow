import React,{useState} from 'react';
import {RefreshControl,Text,View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {Shell} from '../../App';
import {MotionProvider} from '../../src/motion';
import {DuoLayoutFrame} from '../../src/DuoLayout';
import {Page} from '../../src/ui';
import {ScreenHeading} from '../../src/ScreenHeading';
const {createRoot}=require('react-dom/client');
function Fixture(){
 const [width,setWidth]=useState(430),[harness,setHarness]=useState(false),[refreshing,setRefreshing]=useState(false),[revision,setRevision]=useState(0);
 (globalThis as any).fixedHeaderFixture={setWidth,setHarness,refresh:()=>setRefreshing(true),finish:()=>{setRevision(v=>v+1);setRefreshing(false);}};
 const geometry={apiAvailable:true,hasHinge:true,width,height:844,hingeStatus:'closed' as const,safeArea:{top:20,bottom:20,left:16,right:80},regions:[{kind:'occlusion' as const,active:true,frame:{x:width-60,y:32,width:28,height:28}}]};
 return <SafeAreaProvider><MotionProvider><DuoLayoutFrame enabled geometry={geometry}>{harness?<Page testID="refresh-harness-scroll" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>setRefreshing(true)}/>}><ScreenHeading title="할 일" embedded/><Text testID="refresh-harness-revision">{revision?'새 서버 내용':'저장된 내용'}</Text>{Array.from({length:40},(_,i)=><Text key={i} style={{height:44}}>저장된 행 {i}</Text>)}</Page>:<Shell/>}</DuoLayoutFrame></MotionProvider></SafeAreaProvider>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
