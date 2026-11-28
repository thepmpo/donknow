import React,{useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {ScrollArea} from './ScrollArea';
import {Button} from './ui';
import {docenCalendarId,groupCalendarSources} from './calendar-model';
import type {CalendarSource} from './calendar-model';
import {colors,typography} from './theme';

function checkColor(color:string){
 const hex=/^#([0-9a-f]{6})$/i.exec(color)?.[1];
 if(!hex)return '#fff';
 const channels=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
 return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722>.179?'#111':'#fff';
}
export function CalendarVisibilityList({sources,selected,showDocen,busy,ready,more,readOnly=false,viewControl,onToggle,onMore}:{
 sources:CalendarSource[];selected:ReadonlySet<string>;showDocen:boolean;busy:boolean;ready:boolean;more:boolean;readOnly?:boolean;
 viewControl?:React.ReactNode;
 onToggle:(id:string)=>void;onMore:()=>void;
}){
 const [collapsed,setCollapsed]=useState<Set<string>>(()=>new Set());
 const groups=groupCalendarSources(sources);
 return <ScrollArea testID="calendar-visibility-list" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
  {viewControl}
  {groups.map(group=>{
   const expanded=!collapsed.has(group.id);
   return <View key={group.id}>
    <Pressable accessibilityRole="button" accessibilityLabel={group.label+' 캘린더'} accessibilityState={{expanded}} aria-expanded={expanded} onPress={()=>setCollapsed(old=>{
     const next=new Set(old);if(next.has(group.id))next.delete(group.id);else next.add(group.id);return next;
    })} style={[styles.account,expanded&&styles.openAccount]}>
     <Text style={styles.accountLabel} numberOfLines={1}>{group.label}</Text>
     <Ionicons name={expanded?'chevron-up':'chevron-down'} size={16} color={colors.secondary}/>
    </Pressable>
    {expanded&&<View style={styles.group}>
     {group.items.map((source,index)=>{
      const visible=readOnly||(source.id===docenCalendarId?showDocen:selected.has(source.id));
      const color=source.color||colors.action;
      return <Pressable key={source.id} accessibilityRole="checkbox" accessibilityLabel={source.name+' 표시'}
       accessibilityState={{checked:visible,disabled:readOnly||!ready}} aria-checked={visible} disabled={readOnly||!ready} onPress={()=>onToggle(source.id)}
       style={({pressed})=>[styles.row,pressed&&styles.pressed]}>
       <View style={[styles.marker,{borderColor:color,backgroundColor:visible?color:'transparent'}]}>
        {visible&&<Ionicons name="checkmark" size={14} color={checkColor(color)}/>}
       </View>
       <View style={[styles.labelArea,index+1<group.items.length&&styles.separator]}><Text style={styles.label}>{source.name}</Text></View>
      </Pressable>;
     })}
    </View>}
   </View>;
  })}
  {!groups.length&&<Text style={styles.accountLabel}>{busy?'캘린더를 불러오고 있어요.':'표시할 캘린더가 없어요.'}</Text>}
  {more&&<Button title="캘린더 더 보기" quiet disabled={busy} onPress={onMore}/>}
 </ScrollArea>;
}

const styles=StyleSheet.create({
 content:{gap:12,paddingBottom:14},
 account:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,paddingHorizontal:12},
 openAccount:{marginBottom:2},
 accountLabel:{...typography.detail,color:colors.secondary,flexShrink:1,fontWeight:'600'},
 group:{borderRadius:16,backgroundColor:colors.grouped,overflow:'hidden'},
 row:{minHeight:52,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:13},
 pressed:{backgroundColor:colors.pale},
 marker:{width:22,height:22,borderRadius:11,borderWidth:2,alignItems:'center',justifyContent:'center'},
 labelArea:{flex:1,alignSelf:'stretch',justifyContent:'center',minHeight:52,paddingVertical:9},
 separator:{borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.line},
 label:{...typography.body,color:colors.text},
});
