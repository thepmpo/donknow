import ExpoModulesCore
import UIKit

public final class DuckduckDuoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DuckduckDuo")
    View(DuckduckDuoObserver.self) {
      Events("onGeometryChange")
    }
  }
}

// A non-interactive sibling of the React content, in exactly the same coordinate space.
// No screen/model lookup, camera access, background task, persistence, or network access.
public final class DuckduckDuoObserver: ExpoView {
  let onGeometryChange = EventDispatcher()
  private var hasHinge = false
  private var previous: NSDictionary?
  private var emissionPending = false

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    isUserInteractionEnabled = false
    #if DUCKDUCK_DUO_SDK
    if #available(iOS 27.1, *) {
      addInteraction(UIHingeInteraction { [weak self] _, update in
        guard let self else { return }
        // nil means this hierarchy cannot provide hinge data. Never guess from a width or idiom.
        self.hasHinge = update.hinge != nil
        self.setNeedsUpdateConstraints()
      })
    }
    #endif
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil { hasHinge = false; previous = nil }
    setNeedsUpdateConstraints()
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    setNeedsUpdateConstraints()
  }

  public override func safeAreaInsetsDidChange() {
    super.safeAreaInsetsDidChange()
    setNeedsUpdateConstraints()
  }

  public override func updateConstraints() {
    // UIKit tracks reservedRegions read here and requests an update when the regions change.
    var regions: [[String: Any]] = []
    var apiAvailable = false
    #if DUCKDUCK_DUO_SDK
    if #available(iOS 27.1, *) {
      apiAvailable = true
      for (name, kind) in [("division", UIView.ReservedRegion.Kind.division), ("occlusion", UIView.ReservedRegion.Kind.occlusion)] {
        for region in reservedRegions(kind: kind, options: .includeInactive) {
          regions.append(["kind":name, "active":region.isActive, "frame":["x":region.frame.minX,"y":region.frame.minY,"width":region.frame.width,"height":region.frame.height]])
        }
      }
    }
    #endif
    let data: [String: Any] = [
      "apiAvailable":apiAvailable, "hasHinge":hasHinge,
      "width":bounds.width, "height":bounds.height,
      "safeArea":["top":safeAreaInsets.top,"right":safeAreaInsets.right,"bottom":safeAreaInsets.bottom,"left":safeAreaInsets.left],
      "regions":regions
    ]
    super.updateConstraints()
    guard bounds.width > 0, bounds.height > 0, window != nil else { return }
    let next = data as NSDictionary
    guard previous?.isEqual(to: data) != true else { return }
    previous = next
    // Dispatch outside UIKit's constraint pass so React layout cannot reenter it.
    guard !emissionPending else { return }
    emissionPending = true
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.emissionPending = false
      guard self.window != nil, let payload = self.previous as? [String: Any] else { return }
      self.onGeometryChange(payload)
    }
  }
}
