import {assistantUpdated} from '../assistant-updates';
import {useFocusedField,useKeyboardInset} from '../useFocusedField';
import React,{useEffect,useRef,useState} from 'react';
import {Switch,Text,TextInput,View} from 'react-native';
import {MotionModal as Modal,DraggableSheet} from '../motion';
import {ScrollArea as ScrollView} from '../ScrollArea';
import {Button,CloseButton,colors,s} from '../ui';
import {KeyboardDismiss} from '../KeyboardUX';
import type {TodoStore} from '../useTodos';
type Memory={id:string;text:string;source:string;quote?:string|null;updatedAt:number};
export function AssistantMemorySheet({store,onClose}:{store:TodoStore;onClose:()=>void}){
 const surface=useRef<React.ComponentRef<typeof View>>(null),scroll=useRef<React.ComponentRef<typeof ScrollView>>(null),input=useRef<React.ComponentRef<typeof TextInput>>(null),field=useFocusedField(scroll),inset=useKeyboardInset(surface);
 const [settings,setSettings]=useState({enabled:false,count:0,turnCount:0}),[notes,setNotes]=useState<Memory[]>([]),[text,setText]=useState(''),[editing,setEditing]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(false);
 const version=useRef(0),working=useRef(false),owner=store.user?.id+':'+(store.connection?.mode==='cloud'?store.connection.baseUrl:'');
 useEffect(()=>{const revision=++version.current;setNotes([]);setText('');setEditing(null);void load(revision);return()=>{version.current++;};},[owner]);
 async function load(revision=version.current){try{const [pref,list]=await Promise.all([store.featureRequest('/api/assistant/memory/settings'),store.featureRequest('/api/assistant/memory')]);if(revision!==version.current)return;setSettings(pref as typeof settings);setNotes((list as {memories:Memory[]}).memories);}catch(e){if(revision===version.current)setError(e instanceof Error?e.message:'기억을 불러오지 못했어요.');}}
 async function run(action:()=>Promise<unknown>,clear=false){if(working.current)return;const revision=version.current;working.current=true;setBusy(true);setError('');try{await action();if(revision===version.current){setText('');setEditing(null);setConfirm(false);await load(revision);assistantUpdated({owner:(store.connection?.mode==='cloud'?store.connection.baseUrl:'demo')+':'+store.user?.id,clear});}}catch(e){if(revision===version.current)setError(e instanceof Error?e.message:'저장하지 못했어요. 다시 확인해주세요.');}finally{working.current=false;if(revision===version.current)setBusy(false);}}
 return <Modal visible transparent animationType="slide" onRequestClose={()=>{if(!busy)onClose();}}><View ref={surface} collapsable={false} onLayout={inset.measure} style={s.modalBackdrop}><DraggableSheet style={[s.sheet,{height:'90%',maxHeight:'90%',overflow:'hidden'}]} disabled={busy} onDismiss={onClose}>
  <View style={s.sheetHeader}><Text style={[s.sectionTitle,{flex:1}]}>대화와 기억</Text><View style={{flexDirection:'row'}}><KeyboardDismiss/><CloseButton onPress={onClose} disabled={busy}/></View></View>
  <View style={{flex:1,minHeight:0,paddingBottom:Math.max(0,inset.inset-24)}}><ScrollView ref={scroll} onLayout={field.reveal} onContentSizeChange={field.reveal} onScroll={field.onScroll} automaticallyAdjustKeyboardInsets={false} contentInsetAdjustmentBehavior="never" style={{flex:1,minHeight:0}} contentContainerStyle={{gap:16,paddingBottom:24}} keyboardShouldPersistTaps="handled">
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={s.sectionTitle}>대화 저장·기억 사용</Text><Switch accessibilityLabel="대화 저장·기억 사용" value={settings.enabled} disabled={busy} onValueChange={enabled=>{void run(()=>store.featureRequest('/api/assistant/memory/settings','POST',{enabled}));}}/></View>
   <Text style={s.muted}>켜진 뒤의 대화를 계정에 보관하고 다른 기기에서도 이어가요. 직접 말한 선호나 계속 맡긴 일을 기억해 다음 대화와 브리핑에 참고해요. 언제든 끄거나 지울 수 있어요.</Text>
   <Text style={s.muted}>붙여넣은 자료 원문은 자동 저장하지 않아요. 답변에 인용된 부분과 확인한 제안은 대화에 남을 수 있어요.</Text>
   <Text style={s.label}>저장된 대화 {settings.turnCount}개 · 기억 {settings.count}개</Text>
   <Text style={s.sectionTitle}>{editing?'기억 수정':'기억할 내용'}</Text><TextInput ref={input} onFocus={()=>field.focus(input.current)} onContentSizeChange={field.reveal} accessibilityLabel="기억할 내용" placeholder="예: 답장은 간결한 한국어로 작성해줘" placeholderTextColor={colors.muted} value={text} editable={!busy} onChangeText={setText} maxLength={1000} multiline style={[s.editorInput,{minHeight:80}]}/>
   <Button title={editing?'기억 수정 저장':'기억 추가'} quiet disabled={busy||!text.trim()} onPress={()=>{void run(()=>store.featureRequest('/api/assistant/memory'+(editing?'/'+editing:''),editing?'PATCH':'POST',{text}));}}/>
   {notes.map(note=><View key={note.id} style={{padding:16,borderRadius:18,backgroundColor:colors.grouped,gap:8}}><Text selectable style={s.subtitle}>{note.text}</Text>{!!note.quote&&<Text style={s.muted}>내가 말한 근거: {note.quote}</Text>}<View style={{flexDirection:'row',gap:8}}><Button title="수정" quiet disabled={busy} accessibilityLabel={'기억 수정 '+note.text} onPress={()=>{setEditing(note.id);setText(note.text);}}/><Button title="잊기" quiet disabled={busy} accessibilityLabel={'기억 잊기 '+note.text} onPress={()=>{void run(()=>store.featureRequest('/api/assistant/memory/'+note.id,'DELETE'));}}/></View></View>)}
   {!notes.length&&<Text style={s.muted}>아직 저장한 기억이 없어요.</Text>}
   <Text style={s.muted}>‘잊기’는 기억 목록만 지워요. 예전 대화에 남은 내용까지 지우려면 대화·기억 모두 지우기를 선택하세요.</Text>
   <Button title="대화·기억 모두 지우기" quiet disabled={busy} onPress={()=>setConfirm(true)}/>
   {confirm&&<View style={{padding:16,borderRadius:18,backgroundColor:colors.grouped,gap:12}}><Text style={s.sectionTitle}>대화와 기억을 지울까요?</Text><Text style={s.muted}>개인 대화·기억과 그 내용을 쓰던 작업 기록을 지워요. 저장한 파일·Todo·log와 연결한 서비스는 유지해요.</Text><Button title="대화·기억 삭제 확인" disabled={busy} onPress={()=>{void run(()=>store.featureRequest('/api/assistant/memory','DELETE',{confirmation:'DELETE',conversations:true}),true);}}/><Button title="계속 보관" quiet disabled={busy} onPress={()=>setConfirm(false)}/></View>}
   {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </ScrollView></View>
 </DraggableSheet></View></Modal>;
}
