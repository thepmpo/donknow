import Foundation
import EventKit
import ExpoModulesCore

public final class DuckduckReminderMoveModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DuckduckReminderMove")

    AsyncFunction("destinations") { (ids: [String]) throws -> [[String: String]] in
      let store = EKEventStore()
      let items = try ids.map { try self.reminder($0, store: store) }
      guard let first = items.first?.calendar,
            items.allSatisfy({ $0.calendar?.source.sourceIdentifier == first.source.sourceIdentifier }) else {
        throw NSError(domain: "DocenReminderMove", code: 1,
          userInfo: [NSLocalizedDescriptionKey: "같은 미리 알림 계정의 할 일을 선택해주세요."])
      }
      return store.calendars(for: .reminder).filter {
        $0.source.sourceIdentifier == first.source.sourceIdentifier && $0.allowsContentModifications
      }.map { list in
        [
          "id": list.calendarIdentifier,
          "title": list.title,
          "current": items.allSatisfy { $0.calendar?.calendarIdentifier == list.calendarIdentifier } ? "yes" : "no"
        ]
      }
    }

    AsyncFunction("move") { (id: String, destination: String) throws -> [String: String] in
      let store = EKEventStore()
      let item = try self.reminder(id, store: store)
      guard let origin = item.calendar,
            let target = store.calendar(withIdentifier: destination),
            target.allowedEntityTypes.contains(.reminder),
            target.allowsContentModifications,
            origin.source.sourceIdentifier == target.source.sourceIdentifier else {
        throw NSError(domain: "DocenReminderMove", code: 2,
          userInfo: [NSLocalizedDescriptionKey: "같은 계정에서 수정할 수 있는 미리 알림 목록을 선택해주세요."])
      }
      if origin.calendarIdentifier != destination {
        item.calendar = target
        try store.save(item, commit: true)
      }
      let modifiedAt = item.lastModifiedDate.map { ISO8601DateFormatter().string(from: $0) } ?? ""
      return ["originalId": id, "id": item.calendarItemIdentifier, "title": target.title, "modifiedAt": modifiedAt]
    }
  }

  private func reminder(_ id: String, store: EKEventStore) throws -> EKReminder {
    guard let item = store.calendarItem(withIdentifier: id) as? EKReminder,
          !item.isCompleted, item.calendar?.allowsContentModifications == true else {
      throw NSError(domain: "DocenReminderMove", code: 3,
        userInfo: [NSLocalizedDescriptionKey: "수정 가능한 미완료 미리 알림을 아이폰에서 확인해주세요."])
    }
    return item
  }
}
