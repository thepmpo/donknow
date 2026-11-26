import EventKit
import ExpoModulesCore
import Foundation

public final class DuckduckCalendarChangesModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("DuckduckCalendarChanges")
    Events("onStoreChange")

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

  private func stop() {
    if let observer { NotificationCenter.default.removeObserver(observer) }
    observer = nil
  }
}
