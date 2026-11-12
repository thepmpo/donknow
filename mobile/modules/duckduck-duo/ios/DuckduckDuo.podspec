require 'json'
require 'rubygems'
require 'open3'
package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))
# Compile new UIKit declarations only when the selected installed SDK actually has them.
# Older Xcode builds compile the no-hinge fallback; runtime availability is checked separately.
sdk_output, sdk_status = Open3.capture2('xcrun', '--sdk', 'iphoneos', '--show-sdk-version')
sdk_version = sdk_status.success? && sdk_output.strip.match?(/\A\d+(\.\d+)*\z/) ? Gem::Version.new(sdk_output.strip) : Gem::Version.new('0')
duo_sdk = sdk_version >= Gem::Version.new('27.1')
Pod::Spec.new do |s|
  s.name = 'DuckduckDuo'
  s.version = package['version']
  s.summary = package['description']
  s.description = package['description']
  s.license = package['license']
  s.author = 'duckduck'
  s.homepage = 'https://github.com/thepmpo/donknow'
  s.platforms = { :ios => '16.4' }
  s.source = { :git => 'https://github.com/thepmpo/donknow.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => duo_sdk ? '$(inherited) DUCKDUCK_DUO_SDK' : '$(inherited)'
  }
end
