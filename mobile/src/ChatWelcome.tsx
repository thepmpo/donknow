import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {colors,typography} from './theme';
/** Center the complete welcome group inside the available conversation viewport. */
export function ChatWelcome({canChat=true}:{canChat?:boolean}){
 return <View testID="chat-welcome" style={s.fill}><View testID="chat-welcome-content" style={s.content}><Text style={s.title}>{canChat?'무엇을 도와드릴까요?':'연결한 자료를 한곳에서'}</Text><Text style={s.note}>{canChat?'떠오른 일을 편하게 적어주세요.':'새 알림과 정리된 내용을 여기서 확인하세요.'}</Text></View></View>;
}
const s=StyleSheet.create({fill:{flexGrow:1,flexShrink:0,justifyContent:'center',alignItems:'center',paddingVertical:24},content:{width:'100%',alignItems:'center',gap:12},title:{...typography.heading,color:colors.text,textAlign:'center'},note:{...typography.detail,color:colors.muted,textAlign:'center'}});
