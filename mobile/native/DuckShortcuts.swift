import AppIntents
import Foundation
import UniformTypeIdentifiers
import DuckduckDuo

@available(iOS 16.4, *)
struct AskDuckIntent: AppIntent {
  static var title: LocalizedStringResource = "덕에게 부탁하기"
  static var description = IntentDescription("말하거나 작성한 내용을 덕에게 전달해요. 맡긴 일은 덕의 작업에서 확인할 수 있어요.")
  static var openAppWhenRun: Bool = true
  @Parameter(title: "부탁할 내용") var message: String
  @Parameter(title: "자료") var files: [IntentFile]?
  static var parameterSummary: some ParameterSummary { Summary("덕에게 \(\.$message) 부탁하기") }
  @MainActor func perform() async throws -> some IntentResult & OpensIntent {
    var attachments: [[String: String]] = []
    for file in (files ?? []).prefix(12) {
      let data = file.data
      guard data.count <= 12 * 1024 * 1024 else { continue }
      attachments.append(["name": file.filename, "mime": file.type?.preferredMIMEType ?? "application/octet-stream", "data": data.base64EncodedString()])
    }
    let nonce = try DuckShortcutBridge.save(message: message, files: attachments)
    let url = URL(string: "duckduck://assistant?shortcut=" + nonce)!
    return .result(opensIntent: OpenURLIntent(url))
  }
}
@available(iOS 16.4, *)
struct DuckAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(intent: AskDuckIntent(), phrases: ["\(.applicationName)에게 부탁하기", "\(.applicationName)와 이야기하기"], shortTitle: "덕에게 부탁하기", systemImageName: "sparkles")
  }
}
