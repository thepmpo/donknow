import SwiftUI
import WidgetKit

struct DuckWidgetEntry: TimelineEntry { let date: Date }
struct DuckWidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> DuckWidgetEntry { DuckWidgetEntry(date: Date()) }
  func getSnapshot(in context: Context, completion: @escaping (DuckWidgetEntry) -> Void) { completion(DuckWidgetEntry(date: Date())) }
  func getTimeline(in context: Context, completion: @escaping (Timeline<DuckWidgetEntry>) -> Void) { completion(Timeline(entries: [DuckWidgetEntry(date: Date())], policy: .never)) }
}
struct DuckWidgetView: View {
  var entry: DuckWidgetEntry
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack { Image("DocenLogo").resizable().scaledToFit().frame(width: 36, height: 36); Text("docen").font(.headline) }
      Link(destination: URL(string: "duckduck://assistant")!) { Label("docen에게 부탁하기", systemImage: "sparkles") }.font(.headline)
      Link(destination: URL(string: "duckduck://assistant?message=" + "오늘 남은 일을 정리해줘".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)!) { Text("오늘 확인할 일").font(.caption) }
    }.padding().containerBackground(.background, for: .widget)
  }
}
// Compile in an explicitly registered WidgetKit extension, never the main app target.
@main struct DuckWidget: Widget {
  let kind = "DuckAssistant"
  var body: some WidgetConfiguration { StaticConfiguration(kind: kind, provider: DuckWidgetProvider()) { DuckWidgetView(entry: $0) }.configurationDisplayName("docen").description("개인 자료를 노출하지 않고 docen에게 바로 부탁해요.").supportedFamilies([.systemSmall, .systemMedium]) }
}
