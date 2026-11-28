import React,{useEffect,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {MotionPressable as Pressable} from './motion';
import {Button} from './ui';
import {colors,typography} from './theme';
import {appleMembership,localMembership} from './todo-membership';
import type {Destination,MembershipPage} from './todo-membership';
import type {TodoStore} from './useTodos';

export function TodoMoveMenu({store,ids,busy,onMove}:{store:TodoStore;ids:string[];busy:boolean;onMove:(destination:Destination,page:MembershipPage)=>void}){
 const [page,setPage]=useState<MembershipPage|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[request,setRequest]=useState({cursor:undefined as string|undefined,attempt:0});
 const selection=JSON.stringify(ids);
 useEffect(()=>{
  let active=true;
  const selected=JSON.parse(selection) as string[];
  const todos=store.visible.filter(item=>selected.includes(item.id));
  setError('');setLoading(true);
  async function read(){
   if(!todos.length||todos.length!==selected.length)throw Error('이동할 Ticket을 다시 선택해주세요.');
   if(todos.every(todo=>!todo.source))return localMembership(todos);
   if(todos.every(todo=>todo.source?.provider==='apple-reminders'))return appleMembership(todos);
   return await store.featureRequest('/api/todo-membership/options','POST',{ids:selected,cursor:request.cursor}) as MembershipPage;
  }
  void read().then(result=>{
   if(!active)return;
   setPage(previous=>request.cursor&&previous?{...result,items:[...previous.items,...result.items]}:result);
  }).catch(reason=>{
   if(active)setError(reason instanceof Error?reason.message:'옮길 목록을 확인하지 못했어요.');
  }).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[selection,request,store.featureRequest]);

 return <View style={styles.group}>
  {page?.items.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.current?item.title+' · 현재 소속':item.title+'로 이동'} disabled={busy||loading||item.current} onPress={()=>onMove(item,page)} style={[styles.row,item.current&&styles.current]}>
   <Ionicons name="folder-outline" size={19} color={colors.blueText}/><Text numberOfLines={2} style={styles.title}>{item.title}</Text>
   {item.current&&<Ionicons name="checkmark" size={20} color={colors.blueText}/>}
  </Pressable>)}
  {loading&&<Text accessibilityLiveRegion="polite" style={styles.hint}>목록을 확인하고 있어요.</Text>}
  {!!error&&<Text accessibilityRole="alert" style={styles.hint}>{error}</Text>}
  {!loading&&!error&&page&&!page.items.some(item=>!item.current)&&<Text style={styles.hint}>같은 출처에서 옮길 수 있는 다른 목록이 없어요.</Text>}
  {!loading&&!!error&&!!request.cursor&&<Button title="목록 다시 읽기" quiet onPress={()=>setRequest(old=>({...old,attempt:old.attempt+1}))}/>}
  {!loading&&!error&&page?.nextCursor&&<Button title="목록 더 보기" quiet onPress={()=>setRequest({cursor:page.nextCursor??undefined,attempt:0})}/>}
 </View>;
}
const styles=StyleSheet.create({
 group:{gap:4},
 row:{flexDirection:'row',gap:10,alignItems:'center',minHeight:48,paddingHorizontal:12,borderRadius:12},
 current:{backgroundColor:colors.pale},
 title:{...typography.detail,color:colors.text,flex:1,minWidth:0},
 hint:{...typography.caption,color:colors.muted,padding:10},
});
