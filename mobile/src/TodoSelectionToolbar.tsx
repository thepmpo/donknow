import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {useDesktopPresentation} from './DesktopPresentation';
import {useDuoTrailingNavigation} from './DuoLayout';
import {MotionPressable as Pressable} from './motion';
import {colors,layout,typography} from './theme';

type Action={icon:React.ComponentProps<typeof Ionicons>['name'];label:string;description:string;onPress:()=>void;destructive?:boolean};
export function useTodoSelectionInset(){
 const duo=useDuoTrailingNavigation(),desktop=useDesktopPresentation(),insets=useSafeAreaInsets();
 return duo||desktop?0:layout.navigationHeight+insets.bottom;
}

export function TodoSelectionToolbar({count,inset,actions,busy,testID}:{count:number;inset:number;actions:Action[];busy:boolean;testID:string}){
 return <View testID={testID} style={[styles.toolbar,{bottom:inset+12}]}>
  <Text accessibilityLiveRegion="polite" style={styles.count}>{count}개 선택</Text>
  <View style={styles.actions}>{actions.map(action=>{
   const color=action.destructive?colors.danger:colors.blueText;
   return <Pressable key={action.description} accessibilityRole="button" accessibilityLabel={action.description} disabled={busy} onPress={action.onPress} style={[styles.action,busy&&{opacity:.4}]}>
    <Ionicons name={action.icon} size={18} color={color}/><Text style={[styles.label,{color}]}>{action.label}</Text>
   </Pressable>;
  })}</View>
 </View>;
}
const styles=StyleSheet.create({
 toolbar:{position:'absolute',alignSelf:'center',maxWidth:'94%',zIndex:10,backgroundColor:colors.surface,borderRadius:22,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,paddingHorizontal:10,paddingTop:6,alignItems:'center',gap:2},
 actions:{flexDirection:'row',gap:4,flexWrap:'wrap',justifyContent:'center'},
 action:{minHeight:44,paddingHorizontal:8,flexDirection:'row',alignItems:'center',gap:5},
 count:{...typography.caption,color:colors.muted},
 label:{...typography.detail,fontWeight:'600'},
});
