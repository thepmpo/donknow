const {withXcodeProject,withDangerousMod,IOSConfig}=require('@expo/config-plugins');
const fs=require('node:fs/promises'),path=require('node:path');
module.exports=config=>{
 config=withDangerousMod(config,['ios',async mod=>{const name=IOSConfig.XcodeUtils.getProjectName(mod.modRequest.projectRoot);await fs.copyFile(path.join(mod.modRequest.projectRoot,'native/DuckShortcuts.swift'),path.join(mod.modRequest.platformProjectRoot,name,'DuckShortcuts.swift'));return mod;}]);
 return withXcodeProject(config,mod=>{const name=IOSConfig.XcodeUtils.getProjectName(mod.modRequest.projectRoot),filepath=path.join(name,'DuckShortcuts.swift');if(!mod.modResults.hasFile(filepath))IOSConfig.XcodeUtils.addBuildSourceFileToGroup({filepath,groupName:name,project:mod.modResults});return mod;});
};
