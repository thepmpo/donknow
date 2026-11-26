import ExpoModulesCore
import UIKit

public final class DocenCalendarTouchView: ExpoView, UIGestureRecognizerDelegate {
  let onCalendarTouch = EventDispatcher()
  var gestureMode = "" { didSet { updateRecognizers() } }
  var gestureEnabled = false { didSet { updateRecognizers() } }
  private weak var liftOwner: DocenCalendarTouchView?
  private weak var activeLift: DocenCalendarTouchView?

  private lazy var pagePan: UIPanGestureRecognizer = {
    let recognizer = UIPanGestureRecognizer(target: self, action: #selector(trackPage(_:)))
    recognizer.maximumNumberOfTouches = 1
    recognizer.delegate = self
    return recognizer
  }()

  private lazy var itemLift: UILongPressGestureRecognizer = {
    let recognizer = UILongPressGestureRecognizer(target: self, action: #selector(trackItem(_:)))
    recognizer.minimumPressDuration = 0.32
    recognizer.allowableMovement = 11
    recognizer.delegate = self
    return recognizer
  }()

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    addGestureRecognizer(pagePan)
    addGestureRecognizer(itemLift)
    updateRecognizers()
  }

  private func updateRecognizers() {
    pagePan.isEnabled = gestureEnabled && gestureMode == "period"
    itemLift.isEnabled = gestureEnabled && gestureMode == "item"
  }

  private var enclosingPage: DocenCalendarTouchView? {
    var ancestor = superview
    while let view = ancestor {
      if let calendar = view as? DocenCalendarTouchView, calendar.gestureMode == "period" {
        return calendar
      }
      ancestor = view.superview
    }
    return nil
  }

  public override func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
    if gestureRecognizer === pagePan {
      let movement = pagePan.velocity(in: self)
      return activeLift == nil && abs(movement.x) > 1.2 * abs(movement.y)
    }
    return enclosingPage?.pagePan.state != .began && enclosingPage?.pagePan.state != .changed
  }

  public func gestureRecognizer(
    _ gestureRecognizer: UIGestureRecognizer,
    shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer
  ) -> Bool {
    guard gestureRecognizer === pagePan, let scroll = other.view as? UIScrollView else { return false }
    return other === scroll.panGestureRecognizer
  }

  @objc private func trackPage(_ recognizer: UIPanGestureRecognizer) {
    emit(recognizer, distance: recognizer.translation(in: window).x)
  }

  @objc private func trackItem(_ recognizer: UILongPressGestureRecognizer) {
    if recognizer.state == .began {
      liftOwner = enclosingPage
      liftOwner?.activeLift = self
    }
    emit(recognizer, distance: 0)
    if recognizer.state == .ended || recognizer.state == .cancelled || recognizer.state == .failed {
      if liftOwner?.activeLift === self { liftOwner?.activeLift = nil }
      liftOwner = nil
    }
  }

  private func emit(_ recognizer: UIGestureRecognizer, distance: CGFloat) {
    let phase: String
    switch recognizer.state {
    case .began: phase = "start"
    case .changed: phase = "move"
    case .ended: phase = "end"
    case .cancelled, .failed: phase = "cancel"
    default: return
    }
    let point = recognizer.location(in: window)
    onCalendarTouch(["phase": phase, "dx": Double(distance), "x": Double(point.x), "y": Double(point.y)])
  }
}
