import React, {useLayoutEffect,useRef,useState} from 'react';
import {Platform,StyleSheet,Text,TextInput,View} from 'react-native';
import {colors,typography} from './theme';
import {formatNoteEdit,MAX_NOTES_LENGTH} from './notes';
export function NotesField({value,onChange,disabled=false,label='메모'}:{value:string;onChange:(text:string)=>void;disabled?:boolean;label?:string}) {
  const inputRef=useRef<React.ComponentRef<typeof TextInput>>(null);
  const [width,setWidth]=useState(0);
  const [height,setHeight]=useState(120);
  const [selection,setSelection]=useState<{start:number;end:number}|undefined>();
  useLayoutEffect(()=>{
    if(Platform.OS!=='web'||!inputRef.current)return;
    const node=inputRef.current as unknown as HTMLTextAreaElement;
    const previous=node.style.height;node.style.height='0px';const measured=node.scrollHeight;node.style.height=previous;
    setHeight(Math.max(120,measured));
  },[value,width]);
  return <View style={styles.field}><Text style={styles.label}>메모</Text><TextInput ref={inputRef} onLayout={event=>setWidth(event.nativeEvent.layout.width)} accessibilityLabel={label} value={value} editable={!disabled} multiline scrollEnabled={false} onContentSizeChange={Platform.OS==='web'?undefined:event=>setHeight(Math.max(120,event.nativeEvent.contentSize.height))} maxLength={MAX_NOTES_LENGTH} textAlignVertical="top" placeholder="생각이나 필요한 내용을 적어두세요" placeholderTextColor={colors.muted} style={[styles.input,{height}]} selection={selection}
    onSelectionChange={event=>setSelection(event.nativeEvent.selection)}
    onChangeText={input=>{const next=formatNoteEdit(value,input);onChange(next.text);if(next.caret!==undefined)setSelection({start:next.caret,end:next.caret});else setSelection(undefined);}}/>
    <Text style={styles.hint}>줄 앞에 - 와 공백을 입력하면 글머리표가 돼요.</Text></View>;
}
const styles=StyleSheet.create({field:{marginVertical:12},label:{...typography.caption,color:colors.muted,marginBottom:8},input:{...typography.list,color:colors.text,minHeight:120,overflow:'hidden',padding:16,backgroundColor:colors.surface,borderRadius:16},hint:{...typography.caption,color:colors.muted,marginTop:8}});
