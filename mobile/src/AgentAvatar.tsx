import React from 'react';
import {BrandMark} from './BrandMark';
type Appearance={color:string;eyes:string;glasses:boolean;accessory:string};
// Keep the persisted persona contract; all app brand avatars use the supplied logo.
export function AgentAvatar({size=28}:{appearance?:Appearance;size?:number}){return <BrandMark size={size}/>;}
