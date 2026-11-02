import Foundation
import AVFoundation
import AppKit
@main struct Extract {
 static func main() async throws {
  let args=CommandLine.arguments
  let asset=AVURLAsset(url:URL(fileURLWithPath:args[1]))
  let duration=try await asset.load(.duration).seconds
  let start=Double(args[3])!, length=min(Double(args[4])!,duration-start)
  let generator=AVAssetImageGenerator(asset:asset)
  generator.appliesPreferredTrackTransform=true
  generator.maximumSize=CGSize(width:384,height:216)
  generator.requestedTimeToleranceBefore = .zero
  generator.requestedTimeToleranceAfter = .zero
  let root=URL(fileURLWithPath:args[2]);try FileManager.default.createDirectory(at:root.appendingPathComponent("frames"),withIntermediateDirectories:true)
  var frames:[[String:Any]]=[]
  for offset in stride(from:0.0,to:length,by:2.0) {
   let image=try await generator.image(at:CMTime(seconds:start+offset,preferredTimescale:60000)).image
   let file=String(format:"frames/%06d.jpg",frames.count)
   let rep=NSBitmapImageRep(cgImage:image)
   try rep.representation(using:.jpeg,properties:[.compressionFactor:0.85])!.write(to:root.appendingPathComponent(file))
   frames.append(["id":frames.count,"t":offset,"file":file])
  }
  let session:[String:Any] = ["id":root.lastPathComponent,"title":"NASA real-footage evaluation", "startedAt":"2026-11-02T00:00:00Z","duration":length,"frames":frames,"status":"complete"]
  try JSONSerialization.data(withJSONObject:session,options:[.prettyPrinted,.sortedKeys]).write(to:root.appendingPathComponent("index.json"))
  let clip=root.appendingPathComponent("clip.mp4")
  if !FileManager.default.fileExists(atPath:clip.path) {
   let exporter=AVAssetExportSession(asset:asset,presetName:AVAssetExportPreset640x480)!
   exporter.timeRange=CMTimeRange(start:CMTime(seconds:start,preferredTimescale:60000),duration:CMTime(seconds:length,preferredTimescale:60000))
   try await exporter.export(to:clip,as:.mp4)
  }
  print("\(root.lastPathComponent): source \(duration)s, excerpt \(start)..\(start+length), \(frames.count) frames")
 }
}
