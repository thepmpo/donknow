import React,{useState} from 'react';
import {ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {MotionPressable} from '../system/motion';
import {colors,layout,radius,spacing,typography} from '../system/theme';
import type {Section} from './product';

type Item = {id:number; title:string; done:boolean};

/** Replace the sample state and operations with the new product's repository. */
export function CoreScreen({section}:{section:Section}){
 const [items,setItems]=useState<Item[]>([]),[draft,setDraft]=useState(''),[nextId,setNextId]=useState(1);
 const visible=items.filter(item=>item.done===(section==='history'));
 function create(){
  const title=draft.trim();
  if(!title)return;
  setItems(old=>[...old,{id:nextId,title,done:false}]);
  setNextId(id=>id+1);
  setDraft('');
 }
 return <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll} contentContainerStyle={styles.content}>
  {section==='items'&&<View style={styles.form}>
   <TextInput accessibilityLabel="항목 제목" placeholder="항목 제목" placeholderTextColor={colors.muted} value={draft} onChangeText={setDraft} maxLength={120} style={styles.input}/>
   <MotionPressable accessibilityRole="button" accessibilityState={{disabled:!draft.trim()}} disabled={!draft.trim()} onPress={create} style={[styles.primary,!draft.trim()&&{opacity:.5}]}><Text style={styles.primaryText}>추가</Text></MotionPressable>
  </View>}
  {section==='settings'?<View style={styles.card}><Text style={styles.title}>화면 모드</Text><Text style={styles.muted}>기기의 밝은 화면과 어두운 화면 설정을 따라갑니다.</Text></View>
   :visible.length?visible.map(item=><MotionPressable key={item.id} accessibilityRole="checkbox" accessibilityLabel={item.title} accessibilityState={{checked:item.done}}
      onPress={()=>setItems(old=>old.map(row=>row.id===item.id?{...row,done:!row.done}:row))} style={[styles.row,item.done&&styles.done]}>
      <Text style={styles.title}>{item.title}</Text><Text aria-hidden style={styles.muted}>{item.done?'완료':'미완료'}</Text>
     </MotionPressable>)
    :<Text accessibilityLiveRegion="polite" style={styles.muted}>{section==='history'?'완료한 항목이 없어요.':'아직 항목이 없어요.'}</Text>}
 </ScrollView>;
}
const styles=StyleSheet.create({
 scroll:{flex:1,minHeight:0},
 content:{padding:layout.pageInset,gap:spacing.lg},
 form:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.sm},
 input:{flexGrow:1,flexBasis:140,minWidth:0,minHeight:44,backgroundColor:colors.grouped,borderRadius:radius.small,paddingHorizontal:spacing.md,color:colors.text,...typography.body},
 primary:{minHeight:44,minWidth:64,alignItems:'center',justifyContent:'center',borderRadius:radius.button,backgroundColor:colors.action,paddingHorizontal:spacing.lg},
 primaryText:{...typography.detail,color:colors.white,fontWeight:'700'},
 card:{padding:spacing.lg,borderRadius:radius.card,gap:spacing.sm,backgroundColor:colors.surface},
 title:{...typography.list,color:colors.text,flexShrink:1},
 muted:{...typography.detail,color:colors.muted},
 row:{minHeight:48,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:colors.line,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:spacing.md,paddingVertical:spacing.sm},
 done:{backgroundColor:colors.todoSelection},
});
