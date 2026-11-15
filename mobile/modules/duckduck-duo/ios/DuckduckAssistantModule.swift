import ExpoModulesCore
import Foundation
import Security

public enum DuckShortcutBridge {
  private static let service = "com.sjfieni.duckduck.shortcut-once"
  public static func save(message: String, files: [[String: String]] = []) throws -> String {
    let nonce = UUID().uuidString
    let folder = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("DuckShortcutInbox", isDirectory: true)
    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    var staged: [[String: String]] = []
    var size = 0
    for file in files.prefix(12) {
      guard let encoded = file["data"], let bytes = Data(base64Encoded: encoded), size + bytes.count <= 12 * 1024 * 1024 else { continue }
      size += bytes.count
      let key = UUID().uuidString
      try bytes.write(to: folder.appendingPathComponent(key), options: [.atomic, .completeFileProtection])
      staged.append(["key": key, "name": file["name"] ?? "자료", "mime": file["mime"] ?? "application/octet-stream"])
    }
    let data = try JSONSerialization.data(withJSONObject: ["message": String(message.prefix(2000)), "files": staged, "expires": Date().timeIntervalSince1970 + 120])
    let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: nonce, kSecValueData as String: data, kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
    guard SecItemAdd(query as CFDictionary, nil) == errSecSuccess else { throw NSError(domain: "DuckShortcut", code: 1) }
    return nonce
  }
  public static func consume(_ nonce: String) -> [String: Any]? {
    guard UUID(uuidString: nonce) != nil else { return nil }
    let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: nonce, kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
    var result: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess, let data = result as? Data else { return nil }
    SecItemDelete(query as CFDictionary)
    guard var value = try? JSONSerialization.jsonObject(with: data) as? [String: Any], let expires = value["expires"] as? Double, expires > Date().timeIntervalSince1970 else { return nil }
    let folder = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("DuckShortcutInbox", isDirectory: true)
    var files: [[String: String]] = []
    for file in value["files"] as? [[String: String]] ?? [] {
      guard let key = file["key"], UUID(uuidString: key) != nil else { continue }
      let path = folder.appendingPathComponent(key)
      if let bytes = try? Data(contentsOf: path), bytes.count <= 12 * 1024 * 1024 { files.append(["name": file["name"] ?? "자료", "mime": file["mime"] ?? "application/octet-stream", "data": bytes.base64EncodedString()]) }
      try? FileManager.default.removeItem(at: path)
    }
    value["files"] = files
    if let paths = try? FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: [.creationDateKey]) { for path in paths { if let created = try? path.resourceValues(forKeys: [.creationDateKey]).creationDate, Date().timeIntervalSince(created) > 600 { try? FileManager.default.removeItem(at: path) } } }
    return value
  }
}
public final class DuckduckAssistantModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DuckduckAssistant")
    AsyncFunction("consumeShortcut") { (nonce: String) -> [String: Any]? in DuckShortcutBridge.consume(nonce) }
  }
}
