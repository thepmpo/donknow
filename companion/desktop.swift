import Foundation
import AppKit
import ApplicationServices
import ScreenCaptureKit

@main struct DuckDesktop {
 static func main() async {
  do {
   let bytes=FileHandle.standardInput.readDataToEndOfFile()
   guard let input=try JSONSerialization.jsonObject(with: bytes) as? [String:Any] else { throw NSError(domain:"Input",code:1) }
   let actions=input["actions"] as? [[String:Any]] ?? []
   if !actions.isEmpty && !AXIsProcessTrustedWithOptions([kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String:true] as CFDictionary) { throw NSError(domain:"Accessibility permission required",code:1) }
   let keyCodes:[String:CGKeyCode]=["Enter":36,"Tab":48,"Escape":53,"Backspace":51,"Space":49,"ArrowLeft":123,"ArrowRight":124,"ArrowDown":125,"ArrowUp":126,"a":0,"c":8,"v":9,"x":7,"z":6,"s":1,"l":37,"r":15,"w":13,"t":17]
   for action in actions.prefix(30) {
    switch action["type"] as? String {
    case "click","double_click","move":
     let point=CGPoint(x:(action["x"] as? Double) ?? 0,y:(action["y"] as? Double) ?? 0)
     let button:CGMouseButton=action["button"] as? String == "right" ? .right : .left
     if action["type"] as? String == "move" { CGEvent(mouseEventSource:nil,mouseType:.mouseMoved,mouseCursorPosition:point,mouseButton:button)?.post(tap:.cghidEventTap) }
     else { for n in 1...(action["type"] as? String == "double_click" ? 2 : 1) { let down=CGEvent(mouseEventSource:nil,mouseType:button == .right ? .rightMouseDown : .leftMouseDown,mouseCursorPosition:point,mouseButton:button),up=CGEvent(mouseEventSource:nil,mouseType:button == .right ? .rightMouseUp : .leftMouseUp,mouseCursorPosition:point,mouseButton:button);down?.setIntegerValueField(.mouseEventClickState,value:Int64(n));up?.setIntegerValueField(.mouseEventClickState,value:Int64(n));down?.post(tap:.cghidEventTap);up?.post(tap:.cghidEventTap) } }
    case "type":
     for chunk in String((action["text"] as? String ?? "").prefix(10000)) { var text=Array(String(chunk).utf16);let down=CGEvent(keyboardEventSource:nil,virtualKey:0,keyDown:true),up=CGEvent(keyboardEventSource:nil,virtualKey:0,keyDown:false);text.withUnsafeMutableBufferPointer { buffer in down?.keyboardSetUnicodeString(stringLength:buffer.count,unicodeString:buffer.baseAddress!);up?.keyboardSetUnicodeString(stringLength:buffer.count,unicodeString:buffer.baseAddress!) };down?.post(tap:.cghidEventTap);up?.post(tap:.cghidEventTap) }
    case "keypress":
     let keys=action["keys"] as? [String] ?? [];var flags:CGEventFlags=[]
     if keys.contains("Meta")||keys.contains("Command") { flags.insert(.maskCommand) };if keys.contains("Control") { flags.insert(.maskControl) };if keys.contains("Alt")||keys.contains("Option") { flags.insert(.maskAlternate) };if keys.contains("Shift") { flags.insert(.maskShift) }
     for key in keys { if let code=keyCodes[key] ?? keyCodes[key.lowercased()] { let down=CGEvent(keyboardEventSource:nil,virtualKey:code,keyDown:true),up=CGEvent(keyboardEventSource:nil,virtualKey:code,keyDown:false);down?.flags=flags;up?.flags=flags;down?.post(tap:.cghidEventTap);up?.post(tap:.cghidEventTap) } }
    case "scroll":CGEvent(scrollWheelEvent2Source:nil,units:.pixel,wheelCount:2,wheel1:-Int32((action["scroll_y"] as? Int) ?? 0),wheel2:-Int32((action["scroll_x"] as? Int) ?? 0),wheel3:0)?.post(tap:.cghidEventTap)
    case "wait":try await Task.sleep(nanoseconds:500_000_000)
    default:throw NSError(domain:"Unsupported desktop action",code:1)
    }
   }
   guard CGPreflightScreenCaptureAccess() || CGRequestScreenCaptureAccess() else { throw NSError(domain:"Screen recording permission required",code:1) }
   let available=try await SCShareableContent.excludingDesktopWindows(false,onScreenWindowsOnly:true)
   guard let display=available.displays.first(where:{$0.displayID==CGMainDisplayID()}) else { throw NSError(domain:"Display unavailable",code:1) }
   let bounds=CGDisplayBounds(display.displayID),config=SCStreamConfiguration();config.width=Int(bounds.width);config.height=Int(bounds.height);config.showsCursor=true
   let image=try await SCScreenshotManager.captureImage(contentFilter:SCContentFilter(display:display,excludingWindows:[]),configuration:config)
   guard let jpeg=NSBitmapImageRep(cgImage:image).representation(using:.jpeg,properties:[.compressionFactor:0.7]) else { throw NSError(domain:"Screenshot unavailable",code:1) }
   let result:[String:Any]=["surface":"desktop","screenshot":"data:image/jpeg;base64,"+jpeg.base64EncodedString(),"viewport":["width":Int(bounds.width),"height":Int(bounds.height)]]
   FileHandle.standardOutput.write(try JSONSerialization.data(withJSONObject:result))
  }catch { FileHandle.standardError.write(Data("Desktop permission or action failed.\n".utf8));exit(1) }
 }
}
