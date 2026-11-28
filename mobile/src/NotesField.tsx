import React, {useLayoutEffect,useRef,useState} from 'react';
import {Platform,StyleSheet,Text,TextInput,View} from 'react-native';
import {colors,typography} from './theme';
import {formatNoteEdit,MAX_NOTES_LENGTH} from './notes';
export function NotesField({value,onChange,disabled=false,label='메모',onFocus,onResize,compact=false,minimumHeight}:{value:string;onChange:(text:string)=>void;disabled?:boolean;label?:string;onFocus?:(input:React.ComponentRef<typeof TextInput>|null)=>void;onResize?:()=>void;compact?:boolean;minimumHeight?:number}) {
  const minimum=minimumHeight??(compact?72:220);
  const caretFrame=useRef<number|undefined>(undefined);
  const inputRef=useRef<React.ComponentRef<typeof TextInput>>(null);
  const [width,setWidth]=useState(0);
  const [height,setHeight]=useState(minimum);
  const [selection,setSelection]=useState<{start:number;end:number}|undefined>();
  useLayoutEffect(()=>{
    if(Platform.OS!=='web'||!inputRef.current)return;
    const node=inputRef.current as unknown as HTMLTextAreaElement;
    const previous=node.style.height;node.style.height='0px';const measured=node.scrollHeight;node.style.height=previous;
    setHeight(Math.max(minimum,measured));
  },[value,width,minimum]);
  return <View style={[styles.field,compact&&{marginVertical:0}]}>{!compact&&<Text style={styles.label}>메모</Text>}<TextInput ref={inputRef} onFocus={()=>onFocus?.(inputRef.current)} onLayout={event=>{setWidth(event.nativeEvent.layout.width);onResize?.();}} accessibilityLabel={label} value={value} editable={!disabled} multiline scrollEnabled={compact} onContentSizeChange={Platform.OS==='web'?undefined:event=>{setHeight(Math.max(minimum,event.nativeEvent.contentSize.height));onResize?.();}} maxLength={MAX_NOTES_LENGTH} textAlignVertical="top" placeholder={compact?'메모':'생각이나 필요한 내용을 적어두세요'} placeholderTextColor={colors.muted} style={[styles.input,{height:compact?Math.min(height,160):height,minHeight:minimum},compact&&{paddingHorizontal:0,paddingVertical:8,backgroundColor:'transparent'}]} selection={selection}
    onChangeText={input=>{if(caretFrame.current!==undefined)cancelAnimationFrame(caretFrame.current);const next=formatNoteEdit(value,input);onChange(next.text);if(next.caret!==undefined){const caret=next.caret;setSelection({start:caret,end:caret});caretFrame.current=requestAnimationFrame(()=>{if(Platform.OS==='web')(inputRef.current as unknown as HTMLTextAreaElement)?.setSelectionRange(caret,caret);else inputRef.current?.setNativeProps({selection:{start:caret,end:caret}});});}else setSelection(undefined);}}/>
    {!compact&&<Text style={styles.hint}>줄 앞에 - 와 공백을 입력하면 글머리표가 돼요.</Text>}</View>;
}
const styles=StyleSheet.create({field:{marginVertical:12},label:{...typography.caption,color:colors.muted,marginBottom:8},input:{...typography.list,color:colors.text,minHeight:220,overflow:'hidden',padding:16,backgroundColor:colors.surface,borderRadius:16},hint:{...typography.caption,color:colors.muted,marginTop:8}});
