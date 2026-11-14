import ExpoModulesCore
import UIKit
import ObjectiveC

// One app-wide native accessory covers current and future React Native inputs,
// including multiline, secure and numeric fields inside separate modal windows.
// No input contents, identifiers, persistence, analytics or network requests.
public final class DuckduckKeyboardModule: Module {
  private var controller: KeyboardDoneController?

  public func definition() -> ModuleDefinition {
    Name("DuckduckKeyboard")
    AsyncFunction("setEnabled") { (enabled: Bool) async in
      await MainActor.run {
        if enabled {
          if self.controller == nil { self.controller = KeyboardDoneController() }
          self.controller?.start()
        } else {
          self.controller?.stop()
          self.controller = nil
        }
      }
    }
    OnDestroy {
      let current = self.controller
      DispatchQueue.main.async { current?.stop() }
    }
  }
}

@MainActor
private final class KeyboardDoneController: NSObject {
  private final class Attachment: NSObject {
    let toolbar: UIToolbar
    var original: UIView?
    init(toolbar: UIToolbar, original: UIView?) {
      self.toolbar = toolbar
      self.original = original
    }
  }
  private let attachments = NSMapTable<UIView, Attachment>(keyOptions: .weakMemory, valueOptions: .strongMemory)
  private var started = false

  func start() {
    guard !started else { return }
    started = true
    let center = NotificationCenter.default
    center.addObserver(self, selector: #selector(editingBegan(_:)), name: UITextField.textDidBeginEditingNotification, object: nil)
    center.addObserver(self, selector: #selector(editingBegan(_:)), name: UITextView.textDidBeginEditingNotification, object: nil)
    center.addObserver(self, selector: #selector(keyboardChanged(_:)), name: UIResponder.keyboardWillShowNotification, object: nil)
    center.addObserver(self, selector: #selector(keyboardChanged(_:)), name: UIResponder.keyboardWillChangeFrameNotification, object: nil)
    if let input = focusedInput() { attach(to: input) }
  }

  func stop() {
    guard started else { return }
    started = false
    NotificationCenter.default.removeObserver(self)
    for input in attachments.keyEnumerator().allObjects.compactMap({ $0 as? UIView }) {
      guard let state = attachments.object(forKey: input), accessory(of: input) === state.toolbar else { continue }
      setAccessory(state.original, on: input)
      if input.isFirstResponder { input.reloadInputViews() }
    }
    attachments.removeAllObjects()
  }

  // Match the installed RN native classes through their superclass chain.
  // Safari/OAuth/WKWebView and system-owned editors are deliberately untouched.
  private func isAppInput(_ view: UIView) -> Bool {
    guard view is UITextField || view is UITextView else { return false }
    var current: AnyClass? = type(of: view)
    while let type = current {
      if ["RCTUITextField", "RCTUITextView"].contains(NSStringFromClass(type)) { return true }
      current = class_getSuperclass(type)
    }
    return false
  }

  private func findFocused(in view: UIView) -> UIView? {
    if view.isFirstResponder && isAppInput(view) { return view }
    for child in view.subviews {
      if let input = findFocused(in: child) { return input }
    }
    return nil
  }

  private func focusedInput() -> UIView? {
    for scene in UIApplication.shared.connectedScenes {
      guard let scene = scene as? UIWindowScene,
        scene.activationState == .foregroundActive || scene.activationState == .foregroundInactive else { continue }
      for window in scene.windows where !window.isHidden {
        if let input = findFocused(in: window) { return input }
      }
    }
    return nil
  }

  @objc private func editingBegan(_ notification: Notification) {
    guard started, let input = notification.object as? UIView, input.isFirstResponder else { return }
    attach(to: input)
  }

  @objc private func keyboardChanged(_ notification: Notification) {
    guard started, let input = focusedInput() else { return }
    attach(to: input)
  }

  private func accessory(of input: UIView) -> UIView? {
    if let input = input as? UITextField { return input.inputAccessoryView }
    return (input as? UITextView)?.inputAccessoryView
  }

  private func setAccessory(_ accessory: UIView?, on input: UIView) {
    if let input = input as? UITextField { input.inputAccessoryView = accessory }
    else if let input = input as? UITextView { input.inputAccessoryView = accessory }
  }

  private func attach(to input: UIView) {
    guard isAppInput(input), input.window != nil else { return }
    if let existing = attachments.object(forKey: input), accessory(of: input) === existing.toolbar { return }
    let toolbar = UIToolbar(frame: CGRect(x: 0, y: 0, width: input.window?.bounds.width ?? 0, height: 44))
    toolbar.autoresizingMask = [.flexibleWidth]
    toolbar.tintColor = .systemBlue
    let appearance = UIToolbarAppearance()
    appearance.configureWithDefaultBackground()
    toolbar.standardAppearance = appearance
    toolbar.scrollEdgeAppearance = appearance
    toolbar.compactAppearance = appearance
    let done = UIBarButtonItem(title: "완료", style: .done, target: self, action: #selector(dismissKeyboard))
    done.accessibilityLabel = "완료, 키보드 내리기"
    done.accessibilityHint = "입력한 내용은 그대로 유지돼요."
    toolbar.items = [UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil), done]
    toolbar.sizeToFit()
    toolbar.frame.size.height = max(44, toolbar.frame.height)
    let original = attachments.object(forKey: input)?.original ?? accessory(of: input)
    attachments.setObject(Attachment(toolbar: toolbar, original: original), forKey: input)
    setAccessory(toolbar, on: input)
    if input.isFirstResponder { input.reloadInputViews() }
  }

  @objc private func dismissKeyboard() {
    // Resigning commits normal IME editing; it never invokes Return/submit,
    // alters text/selection, saves a record or changes application navigation.
    focusedInput()?.resignFirstResponder()
  }
}
