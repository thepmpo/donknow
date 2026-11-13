import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Animated,BackHandler,Easing,Platform,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useDuoBackAction} from './DuoBackNavigation';
import {useReducedMotion} from './motion';
import {colors,layout,typography} from './theme';
import {boundedYear,miniMonthWeeks,yearLimits,yearMonths,yearMotion,yearZoomTransform} from './calendar-year-model';
import type {YearZoomRect} from './calendar-year-model';

type Props={enabled:boolean;visible:boolean;active:boolean;blocked?:boolean;closeRequest:number;scope:string;month:string;today:string;startDay:number;bottomInset:number;onChoose:(month:string)=>void;onClose:()=>void;children:React.ReactNode};
function YearBack({onBack}:{onBack:()=>void}){useDuoBackAction(onBack);return null;}

/** All geometry is measured in this Calendar pane, never in full-device coordinates. */
export function CalendarYearNavigator(props:Props){
 const {enabled,visible,active,blocked=false,closeRequest,scope,month,today,startDay,bottomInset,onChoose,onClose,children}=props;
 const reduced=useReducedMotion(),{fontScale}=useWindowDimensions();
 const [year,setYear]=useState(boundedYear(+month.slice(0,4))),[size,setSize]=useState({width:0,height:0}),[phase,setPhase]=useState<'closed'|'opening'|'year'|'closing'>('closed');
 const root=useRef<React.ComponentRef<typeof View>>(null),list=useRef<React.ComponentRef<typeof ScrollView>>(null),tiles=useRef<Record<string,React.ComponentRef<typeof View>|null>>({});
 const layouts=useRef<Record<string,YearZoomRect>>({}),yearHeadingHeight=useRef(56),scrollY=useRef(0),parkedScroll=useRef<number|null>(null),generation=useRef(0),frame=useRef<number|undefined>(undefined);
 const scale=useRef(new Animated.Value(1)).current,x=useRef(new Animated.Value(0)).current,y=useRef(new Animated.Value(0)).current,monthOpacity=useRef(new Animated.Value(1)).current,yearOpacity=useRef(new Animated.Value(0)).current;
 const latest=useRef(props),previousVisible=useRef(false),owner=useRef(scope);latest.current=props;
 const open=enabled&&visible&&active,interactive=open&&phase==='year'&&!blocked;
 const tileHeight=58+6*Math.max(15,14*fontScale),months=useMemo(()=>yearMonths(year),[year]);
 function stop(){generation.current++;if(frame.current!==undefined)cancelAnimationFrame(frame.current);[scale,x,y,monthOpacity,yearOpacity].forEach(v=>v.stopAnimation());}
 function finish(isYear:boolean,focus=false){scale.setValue(1);x.setValue(0);y.setValue(0);monthOpacity.setValue(isYear?0:1);yearOpacity.setValue(isYear?1:0);setPhase(isYear?'year':'closed');if(isYear&&focus){const tile=tiles.current[latest.current.month];if(Platform.OS==='web')(tile as unknown as HTMLElement)?.focus({preventScroll:true});else tile?.focus();}}
 function fade(opening:boolean,token:number){
  scale.setValue(1);x.setValue(0);y.setValue(0);monthOpacity.setValue(opening?1:0);yearOpacity.setValue(opening?0:1);
  Animated.parallel([Animated.timing(monthOpacity,{toValue:opening?0:1,duration:yearMotion.fade,useNativeDriver:Platform.OS!=='web'}),Animated.timing(yearOpacity,{toValue:opening?1:0,duration:yearMotion.fade,useNativeDriver:Platform.OS!=='web'})]).start(({finished})=>{if(finished&&token===generation.current)finish(opening,opening);});
 }
 function run(opening:boolean,tile:YearZoomRect,token:number){
  if(token!==generation.current)return;
  const t=yearZoomTransform(size,tile);
  scale.setValue(opening?1:t.scale);x.setValue(opening?0:t.x);y.setValue(opening?0:t.y);monthOpacity.setValue(opening?1:0);yearOpacity.setValue(opening?0:1);
  if(reduced){fade(opening,token);return;}
  const native=Platform.OS!=='web',motion={duration:yearMotion.duration,easing:Easing.bezier(...yearMotion.easing),useNativeDriver:native};
  Animated.parallel([
   Animated.timing(scale,{toValue:opening?t.scale:1,...motion}),Animated.timing(x,{toValue:opening?t.x:0,...motion}),Animated.timing(y,{toValue:opening?t.y:0,...motion}),
   Animated.timing(monthOpacity,{toValue:opening?0:1,duration:yearMotion.duration,useNativeDriver:native}),Animated.timing(yearOpacity,{toValue:opening?1:0,duration:yearMotion.duration,useNativeDriver:native}),
  ]).start(({finished})=>{if(finished&&token===generation.current)finish(opening,opening);});
 }
 function measure(key:string,opening:boolean,token:number){
  frame.current=requestAnimationFrame(()=>{
   if(token!==generation.current)return;
   const tile=tiles.current[key];
   if(!tile||!root.current){fade(opening,token);return;}
   root.current.measureInWindow((rx,ry)=>tile.measureInWindow((tx,ty,width,height)=>{
    if(token!==generation.current)return;
    if(width<=0||height<=0||ty+height<=ry||ty>=ry+size.height-bottomInset){fade(opening,token);return;}
    run(opening,{x:tx-rx,y:ty-ry,width,height},token);
   }));
  });
 }
 function prepareOpening(token:number,attempt=0){
  frame.current=requestAnimationFrame(()=>{
   if(token!==generation.current)return;
   const key=latest.current.month,l=layouts.current[key];
   if(!l&&attempt<6){prepareOpening(token,attempt+1);return;}
   if(l){const visibleRows=Math.max(1,Math.ceil((size.height-bottomInset-yearHeadingHeight.current)/l.height));scrollY.current=Math.max(0,l.y-(visibleRows-1)*l.height);list.current?.scrollTo({y:scrollY.current,animated:false});}
   measure(key,true,token);
  });
 }
 // Resize/reduced-motion/owner changes cancel obsolete geometry and callbacks.
 useEffect(()=>{
  const entering=visible&&!previousVisible.current||owner.current!==scope;previousVisible.current=visible;owner.current=scope;
  stop();if(!enabled||!active){parkedScroll.current=scrollY.current;finish(false);return;}
  if(!visible){finish(false);return;}
  if(!entering){
   finish(true);const saved=parkedScroll.current??scrollY.current,token=generation.current;parkedScroll.current=saved;
   frame.current=requestAnimationFrame(()=>{if(token!==generation.current)return;list.current?.scrollTo({y:saved,animated:false});frame.current=requestAnimationFrame(()=>{if(token===generation.current){scrollY.current=saved;parkedScroll.current=null;}});});return stop;
  }
  parkedScroll.current=null;
  setYear(boundedYear(+latest.current.month.slice(0,4)));setPhase('opening');monthOpacity.setValue(1);yearOpacity.setValue(0);
  const token=generation.current;
  prepareOpening(token);
  return stop;
 },[enabled,visible,active,scope,reduced,size.width,size.height,bottomInset]);
 useEffect(()=>{
  if(!open||blocked)return;
  const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{back();return true;});
  return()=>subscription.remove();
 },[open,phase,blocked]);
 useEffect(()=>{
  if(Platform.OS!=='web'||!open||blocked||typeof document==='undefined')return;
  const handler=(event:KeyboardEvent)=>{if(event.key==='Escape'&&(root.current as unknown as HTMLElement)?.parentElement?.contains(event.target as Node)){event.stopPropagation();back();}};
  document.addEventListener('keydown',handler);return()=>document.removeEventListener('keydown',handler);
 },[open,phase,blocked]);
 useEffect(()=>{if(closeRequest&&interactive)back();},[closeRequest]);
 function back(){if(phase==='opening'||phase==='closing')return;choose(latest.current.month,false);}
 function choose(key:string,change=true){
  if(!interactive)return;
  stop();const token=generation.current;setPhase('closing');if(change)onChoose(key);
  measure(key,false,token);
  // Parent owns visibility; completing the scoped zoom is independent of future API data.
 }
 useEffect(()=>{if(phase==='closed'&&visible&&enabled&&active)latest.current.onClose();},[phase]);
 const showYear=enabled&&(open||phase==='closing'),hideMonth=showYear;
 return <View ref={root} testID="calendar-year-host" style={s.host} accessibilityElementsHidden={blocked} importantForAccessibility={blocked?'no-hide-descendants':'auto'} aria-hidden={blocked} pointerEvents={blocked?'none':'auto'} onLayout={e=>{const {width,height}=e.nativeEvent.layout;setSize(old=>old.width===width&&old.height===height?old:{width,height});}}>
  <Animated.View testID="calendar-month-zoom" pointerEvents={hideMonth?'none':'auto'} accessibilityElementsHidden={hideMonth} importantForAccessibility={hideMonth?'no-hide-descendants':'auto'} aria-hidden={hideMonth} style={[s.month,{opacity:monthOpacity,transform:[{translateX:x},{translateY:y},{scale}]}]}>{children}</Animated.View>
  {showYear&&<Animated.View testID="calendar-year-overview" pointerEvents={interactive?'auto':'none'} style={[StyleSheet.absoluteFill,{opacity:yearOpacity,paddingBottom:bottomInset}]}>
   {open&&!blocked&&<YearBack onBack={back}/>}
   <View style={s.yearHeading} onLayout={e=>{yearHeadingHeight.current=e.nativeEvent.layout.height;}}><Pressable accessibilityRole="button" accessibilityLabel="이전 년" disabled={!interactive||year<=yearLimits.min} onPress={()=>{scrollY.current=0;setYear(v=>boundedYear(v-1));list.current?.scrollTo({y:0,animated:false});}} style={s.control}><Ionicons name="chevron-back" size={22} color={year<=yearLimits.min?colors.muted:colors.blueText}/></Pressable><Text accessibilityRole="header" accessibilityLiveRegion="polite" style={s.year}>{year}년</Text><Pressable accessibilityRole="button" accessibilityLabel="다음 년" disabled={!interactive||year>=yearLimits.max} onPress={()=>{scrollY.current=0;setYear(v=>boundedYear(v+1));list.current?.scrollTo({y:0,animated:false});}} style={s.control}><Ionicons name="chevron-forward" size={22} color={year>=yearLimits.max?colors.muted:colors.blueText}/></Pressable></View>
   <ScrollView ref={list} testID="calendar-year-scroll" contentOffset={{x:0,y:scrollY.current}} onScroll={e=>{if(active&&parkedScroll.current===null)scrollY.current=e.nativeEvent.contentOffset.y;}} scrollEventThrottle={32} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={s.months}>
    {months.map(key=><View key={key} onLayout={e=>{layouts.current[key]=e.nativeEvent.layout;}} style={{width:'50%',minHeight:tileHeight,paddingHorizontal:12,paddingBottom:16}}><Pressable ref={el=>{tiles.current[key]=el;}} accessibilityRole="button" accessibilityLabel={key.slice(0,4)+'년 '+Number(key.slice(5))+'월로 이동'} accessibilityState={{selected:key===month}} onPress={()=>choose(key)} style={{minHeight:tileHeight-16}}><Text style={[s.monthName,key===month&&{color:colors.blueText}]}>{Number(key.slice(5))}월</Text><View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden><View style={s.week}>{Array.from({length:7},(_,i)=><Text key={i} style={[s.tiny,{color:(i+startDay)%7===0?colors.danger:(i+startDay)%7===6?colors.blueText:colors.muted}]}>{['일','월','화','수','목','금','토'][(i+startDay)%7]}</Text>)}</View>{miniMonthWeeks(key,startDay).map((week,row)=><View key={row} style={s.week}>{week.map((day,col)=><Text key={col} style={[s.tiny,{color:(col+startDay)%7===0?colors.danger:(col+startDay)%7===6?colors.blueText:colors.text},day===today&&s.today]}>{day?Number(day.slice(8)):''}</Text>)}</View>)}</View></Pressable></View>)}
   </ScrollView>
  </Animated.View>}
 </View>;
}
const s=StyleSheet.create({
 host:{flex:1,minHeight:0,overflow:'hidden'},month:{flex:1,minHeight:0},yearHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:layout.pageInset,paddingBottom:12},year:{...typography.heading,color:colors.text},control:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},months:{flexDirection:'row',flexWrap:'wrap',paddingHorizontal:12,paddingBottom:16},monthName:{...typography.body,fontWeight:'700',color:colors.text,marginBottom:6},week:{flexDirection:'row'},tiny:{width:'14.285714%',fontSize:10,lineHeight:15,textAlign:'center',color:colors.text},today:{fontWeight:'800',textDecorationLine:'underline'},
});
