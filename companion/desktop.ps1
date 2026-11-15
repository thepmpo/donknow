$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Runtime.InteropServices;
public class DuckInput {
 [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
 [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")] public static extern void mouse_event(uint flags,uint x,uint y,int data,UIntPtr extra);
 [DllImport("user32.dll")] public static extern void keybd_event(byte key,byte scan,uint flags,UIntPtr extra);
}
'@
[DuckInput]::SetProcessDPIAware() | Out-Null
$inputData=[Console]::In.ReadToEnd() | ConvertFrom-Json
foreach($a in $inputData.actions) {
 switch($a.type) {
  'move' { [DuckInput]::SetCursorPos([int]$a.x,[int]$a.y) | Out-Null }
  'click' { [DuckInput]::SetCursorPos([int]$a.x,[int]$a.y) | Out-Null;$down=2;$up=4;if($a.button -eq 'right'){$down=8;$up=16};[DuckInput]::mouse_event($down,0,0,0,[UIntPtr]::Zero);[DuckInput]::mouse_event($up,0,0,0,[UIntPtr]::Zero) }
  'double_click' { [DuckInput]::SetCursorPos([int]$a.x,[int]$a.y) | Out-Null;1..2 | ForEach-Object {[DuckInput]::mouse_event(2,0,0,0,[UIntPtr]::Zero);[DuckInput]::mouse_event(4,0,0,0,[UIntPtr]::Zero);Start-Sleep -Milliseconds 100} }
  'type' { $escaped='';foreach($c in $a.text.ToCharArray()) { if('+^%~()[]{}'.Contains([string]$c)){$escaped+='{'+$c+'}'}else{$escaped+=$c} };[System.Windows.Forms.SendKeys]::SendWait($escaped) }
  'keypress' { $codes=@{Enter=13;Tab=9;Escape=27;Backspace=8;Control=17;Shift=16;Alt=18;Meta=91;ArrowLeft=37;ArrowRight=39;ArrowUp=38;ArrowDown=40};$pressed=@();foreach($key in $a.keys){$code=$codes[$key];if(!$code -and $key.Length -eq 1){$code=[int][char]$key.ToUpperInvariant()};if($code){[DuckInput]::keybd_event([byte]$code,0,0,[UIntPtr]::Zero);$pressed+=,$code}};[array]::Reverse($pressed);foreach($code in $pressed){[DuckInput]::keybd_event([byte]$code,0,2,[UIntPtr]::Zero)} }
  'scroll' { [DuckInput]::mouse_event(2048,0,0,-[int]$a.scroll_y,[UIntPtr]::Zero) }
  'wait' { Start-Sleep -Milliseconds 500 }
  default { throw 'Unsupported desktop action' }
 }
}
$bounds=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap=New-Object System.Drawing.Bitmap($bounds.Width,$bounds.Height)
$graphics=[System.Drawing.Graphics]::FromImage($bitmap)
$stream=New-Object System.IO.MemoryStream
try { $graphics.CopyFromScreen($bounds.Location,[System.Drawing.Point]::Empty,$bounds.Size);$bitmap.Save($stream,[System.Drawing.Imaging.ImageFormat]::Jpeg);@{surface='desktop';screenshot='data:image/jpeg;base64,'+[Convert]::ToBase64String($stream.ToArray());viewport=@{width=$bounds.Width;height=$bounds.Height}} | ConvertTo-Json -Compress }
finally { $stream.Dispose();$graphics.Dispose();$bitmap.Dispose() }
