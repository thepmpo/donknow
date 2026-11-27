import EventKit
import ExpoModulesCore
import Foundation
import UIKit

public final class DuckduckCalendarChangesModule: Module {
  private var observer: NSObjectProtocol?
  private lazy var store = EKEventStore()
  private let queue = DispatchQueue(label: "today.docen.apple-calendar")

  private var lastSourceRefresh: Date?

  private func refreshSources() {
    let now = Date()
    if let lastSourceRefresh, now.timeIntervalSince(lastSourceRefresh) < 30 { return }
    lastSourceRefresh = now
    store.refreshSourcesIfNecessary()
  }

  public func definition() -> ModuleDefinition {
    Name("DuckduckCalendarChanges")
    Events("onStoreChange")
    View(DocenCalendarTouchView.self) {
      Events("onCalendarTouch")
      Prop("gestureMode") { (view: DocenCalendarTouchView, mode: String) in
        view.gestureMode = mode
      }
      Prop("gestureEnabled") { (view: DocenCalendarTouchView, enabled: Bool) in
        view.gestureEnabled = enabled
      }
    }

    AsyncFunction("calendarList") { () throws -> [[String: Any]] in
      try self.requireFullAccess()
      return self.store.calendars(for: .event).map(self.calendarSnapshot)
    }.runOnQueue(queue)

    AsyncFunction("readEvents") { (ids: [String], start: Double, end: Double) throws -> [[String: Any]] in
      try self.requireFullAccess()
      let selected = Set(ids)
      let calendars = self.store.calendars(for: .event).filter { selected.contains($0.calendarIdentifier) }
      return self.events(in: calendars, start: start, end: end)
    }.runOnQueue(queue)

    AsyncFunction("readCalendarSnapshot") { (hiddenIDs: [String], start: Double, end: Double) throws -> [String: Any] in
      try self.requireFullAccess()
      self.store.reset()
      self.refreshSources()
      let calendars = self.store.calendars(for: .event)
      let hidden = Set(hiddenIDs)
      let visible = calendars.filter { !hidden.contains($0.calendarIdentifier) }
      return [
        "calendars": calendars.map(self.calendarSnapshot),
        "events": self.events(in: visible, start: start, end: end),
      ]
    }.runOnQueue(queue)

    AsyncFunction("readEvent") { (id: String, start: Double?, calendarID: String?) throws -> [String: Any] in
      try self.requireFullAccess()
      let event = try self.occurrence(id, start: start, calendarID: calendarID)
      guard let snapshot = self.snapshot(event) else { throw EventUnavailable() }
      return snapshot
    }.runOnQueue(queue)

    AsyncFunction("readLinkedEvent") { (externalUID: String, calendarID: String) throws -> [String: Any] in
      try self.requireFullAccess()
      let matches = self.store.calendarItems(withExternalIdentifier: externalUID).compactMap { item -> EKEvent? in
        guard let event = item as? EKEvent, event.calendar.calendarIdentifier == calendarID,
          event.status != .canceled, !event.hasRecurrenceRules else { return nil }
        return event
      }
      guard matches.count <= 1 else { throw EventAmbiguous() }
      guard let event = matches.first, let value = self.snapshot(event) else { throw EventUnavailable() }
      return value
    }.runOnQueue(queue)

    AsyncFunction("createEvent") { (calendarID: String, patch: EventPatch) throws -> [String: Any] in
      try self.requireFullAccess()
      guard let calendar = self.store.calendar(withIdentifier: calendarID),
        calendar.allowsContentModifications else { throw EventUnavailable() }
      let event = EKEvent(eventStore: self.store)
      event.calendar = calendar
      try self.apply(patch, to: event)
      if let frequency = patch.repeatFrequency {
        event.recurrenceRules = [EKRecurrenceRule(recurrenceWith: frequency.value, interval: 1, end: nil)]
      }
      try self.store.save(event, span: .thisEvent)
      guard let snapshot = self.snapshot(event) else { throw EventUnavailable() }
      return snapshot
    }.runOnQueue(queue)

    AsyncFunction("updateEvent") { (id: String, start: Double?, calendarID: String?, patch: EventPatch) throws -> [String: Any] in
      try self.requireFullAccess()
      let event = try self.occurrence(id, start: start, calendarID: calendarID)
      if let expected = patch.expectedModified {
        guard let modified = event.lastModifiedDate,
          abs(modified.timeIntervalSince1970 * 1000 - expected) < 1 else { throw EventChanged() }
      }
      try self.apply(patch, to: event)
      try self.store.save(event, span: .thisEvent)
      guard let snapshot = self.snapshot(event) else { throw EventUnavailable() }
      return snapshot
    }.runOnQueue(queue)

    AsyncFunction("deleteEvent") { (id: String, start: Double?, calendarID: String?) throws in
      try self.requireFullAccess()
      let event = try self.occurrence(id, start: start, calendarID: calendarID)
      try self.store.remove(event, span: .thisEvent)
    }.runOnQueue(queue)

    OnStartObserving {
      guard self.observer == nil else { return }
      self.observer = NotificationCenter.default.addObserver(
        forName: .EKEventStoreChanged, object: nil, queue: .main
      ) { [weak self] _ in
        self?.sendEvent("onStoreChange", [:])
      }
    }

    OnStopObserving { self.stop() }
    OnDestroy { self.stop() }
  }

  private func requireFullAccess() throws {
    let status = EKEventStore.authorizationStatus(for: .event)
    if #available(iOS 17, *) {
      guard status == .fullAccess else { throw AccessRequired() }
    } else {
      guard status == .authorized else { throw AccessRequired() }
    }
  }

  private func calendarSnapshot(_ calendar: EKCalendar) -> [String: Any] {
    var value: [String: Any] = [
      "id": calendar.calendarIdentifier, "title": calendar.title,
      "writable": calendar.allowsContentModifications,
    ]
    value["account"] = calendar.source?.title
    value["accountId"] = calendar.source?.sourceIdentifier
    if let color = calendar.cgColor { value["color"] = calendarColor(color) }
    return value
  }

  private func events(in calendars: [EKCalendar], start: Double, end: Double) -> [[String: Any]] {
    guard !calendars.isEmpty, end > start else { return [] }
    let predicate = store.predicateForEvents(
      withStart: Date(timeIntervalSince1970: start / 1000),
      end: Date(timeIntervalSince1970: end / 1000), calendars: calendars
    )
    return store.events(matching: predicate).compactMap(snapshot)
  }

  private func occurrence(_ id: String, start: Double?, calendarID: String?) throws -> EKEvent {
    let base = store.calendarItem(withIdentifier: id) as? EKEvent ?? store.event(withIdentifier: id)
    guard let start else {
      if let base, calendarID == nil || base.calendar.calendarIdentifier == calendarID { return base }
      throw EventUnavailable()
    }
    let destination: EKCalendar?
    if let calendarID { destination = store.calendar(withIdentifier: calendarID) }
    else { destination = base?.calendar }
    guard let calendar = destination else { throw EventUnavailable() }
    let date = Date(timeIntervalSince1970: start / 1000)
    let predicate = store.predicateForEvents(
      withStart: date.addingTimeInterval(-1), end: date.addingTimeInterval(1), calendars: [calendar]
    )
    let matches = store.events(matching: predicate).filter { event in
      guard event.status != .canceled, let actual = event.startDate,
        abs(actual.timeIntervalSince(date)) < 0.01 else { return false }
      return event.calendarItemIdentifier == id || event.eventIdentifier == id
    }
    guard matches.count == 1, let event = matches.first else { throw EventUnavailable() }
    return event
  }

  private func apply(_ patch: EventPatch, to event: EKEvent) throws {
    if let title = patch.title { event.title = title }
    if let notes = patch.notes { event.notes = notes }
    if let location = patch.location { event.location = location }
    if let url = patch.url { event.url = url.isEmpty ? nil : URL(string: url) }
    if let allDay = patch.allDay { event.isAllDay = allDay }
    if let zone = patch.timeZone { event.timeZone = TimeZone(identifier: zone) }
    if let start = patch.startDate { event.startDate = try date(from: start) }
    if let end = patch.endDate { event.endDate = try date(from: end) }
    if let alarms = patch.alarms { event.alarms = alarms.map { EKAlarm(relativeOffset: $0.relativeOffset * 60) } }
  }

  private func date(from value: String) throws -> Date {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = formatter.date(from: value) { return date }
    formatter.formatOptions = [.withInternetDateTime]
    guard let date = formatter.date(from: value) else { throw EventUnavailable() }
    return date
  }

  private func snapshot(_ event: EKEvent) -> [String: Any]? {
    guard event.status != .canceled, let start = event.startDate, let end = event.endDate,
      let calendar = event.calendar else { return nil }
    var value: [String: Any] = [
      "id": event.calendarItemIdentifier, "calendarId": calendar.calendarIdentifier,
      "title": event.title ?? "", "notes": event.notes ?? "", "allDay": event.isAllDay,
      "startDate": start.timeIntervalSince1970 * 1000, "endDate": end.timeIntervalSince1970 * 1000,
      "recurrence": event.hasRecurrenceRules,
      "alarms": (event.alarms ?? []).map { alarm -> [String: Any] in
        if let absolute = alarm.absoluteDate { return ["absoluteDate": absolute.timeIntervalSince1970 * 1000] }
        return ["relativeOffset": alarm.relativeOffset / 60]
      }
    ]
    value["location"] = event.location
    value["url"] = event.url?.absoluteString
    value["externalUid"] = event.calendarItemExternalIdentifier
    value["timeZone"] = event.timeZone?.identifier
    value["modified"] = event.lastModifiedDate.map { $0.timeIntervalSince1970 * 1000 }
    if event.isAllDay {
      let formatter = DateFormatter()
      formatter.calendar = Calendar(identifier: .gregorian)
      formatter.locale = Locale(identifier: "en_US_POSIX")
      formatter.timeZone = .current
      formatter.dateFormat = "yyyy-MM-dd"
      value["allDayStart"] = formatter.string(from: start)
      value["allDayEnd"] = formatter.string(from: end)
    }
    return value
  }

  private func calendarColor(_ color: CGColor) -> String? {
    var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 0
    guard UIColor(cgColor: color).getRed(&red, green: &green, blue: &blue, alpha: &alpha) else { return nil }
    return String(format: "#%02x%02x%02x", Int((min(1, max(0, red)) * 255).rounded()),
      Int((min(1, max(0, green)) * 255).rounded()), Int((min(1, max(0, blue)) * 255).rounded()))
  }

  private func stop() {
    if let observer { NotificationCenter.default.removeObserver(observer) }
    observer = nil
  }
}

private struct EventPatch: Record {
  @Field var title: String?
  @Field var notes: String?
  @Field var location: String?
  @Field var url: String?
  @Field var startDate: String?
  @Field var endDate: String?
  @Field var allDay: Bool?
  @Field var timeZone: String?
  @Field var alarms: [CalendarAlarm]?
  @Field var repeatFrequency: RepeatFrequency?
  @Field var expectedModified: Double?
}

private enum RepeatFrequency: String, Enumerable {
  case daily, weekly, monthly, yearly

  var value: EKRecurrenceFrequency {
    switch self {
    case .daily: return .daily
    case .weekly: return .weekly
    case .monthly: return .monthly
    case .yearly: return .yearly
    }
  }
}

private struct CalendarAlarm: Record {
  @Field var relativeOffset: Double = 0
}

private final class EventUnavailable: Exception {
  override var reason: String { "아이폰 캘린더에서 해당 일정을 찾지 못했어요." }
}

private final class AccessRequired: Exception {
  override var reason: String { "ME에서 아이폰 캘린더 전체 접근을 허용해주세요." }
}

private final class EventChanged: Exception {
  override var reason: String { "원본 일정이 바뀌었어요. 다시 확인해주세요." }
}

private final class EventAmbiguous: Exception {
  override var reason: String { "같은 원본 식별자의 일정이 여러 개 있어요." }
}
