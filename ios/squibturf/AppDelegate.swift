import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import AppTrackingTransparency

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "squibturf",
      in: window,
      launchOptions: launchOptions
    )

    // Request App Tracking Transparency permission
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
      if #available(iOS 14.5, *) {
        ATTrackingManager.requestTrackingAuthorization { status in
          switch status {
          case .authorized:
            print("App Tracking Transparency: Authorized")
          case .denied:
            print("App Tracking Transparency: Denied")
          case .notDetermined:
            print("App Tracking Transparency: Not Determined")
          case .restricted:
            print("App Tracking Transparency: Restricted")
          @unknown default:
            print("App Tracking Transparency: Unknown")
          }
        }
      }
    }

    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
