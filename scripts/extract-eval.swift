import Foundation
import AVFoundation
import AppKit
@main struct Extract {
 static func main() async throws {
  let args=CommandLine.arguments
  let asset=AVURLAsset(url:URL(fileURLWithPath:args[1]))
  let duration=try await asset.load(.duration).seconds
  let start=Double(args[3])!
  var length=min(Double(args[4])!,duration-start)
  if args.count>5, let cut=Int(args[5]), cut>=0 {
   let track=try await asset.loadTracks(withMediaType:.video)[0]
   // Decode to presentation timestamps: compressed packets include edit offsets and non-frame markers.
   let reader=try AVAssetReader(asset:asset), output=AVAssetReaderTrackOutput(track:track,outputSettings:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA])
   reader.add(output);reader.startReading();var times:[Double]=[]
   while let sample=output.copyNextSampleBuffer(){times.append(CMSampleBufferGetPresentationTimeStamp(sample).seconds)}
   times.sort();guard reader.status == .completed,times.allSatisfy({$0.isFinite}),cut<times.count else {throw NSError(domain:"Invalid cut frame",code:1)}
   length=min(length,floor((times[cut]-start)*60000)/60000)
   print("Exclusive cut frame \(cut), actual presentation time \(times[cut])")
  }
  let generator=AVAssetImageGenerator(asset:asset)
  generator.appliesPreferredTrackTransform=true
  generator.maximumSize=CGSize(width:384,height:216)
  generator.requestedTimeToleranceBefore = .zero
  generator.requestedTimeToleranceAfter = .zero
  let root=URL(fileURLWithPath:args[2]);try FileManager.default.createDirectory(at:root.appendingPathComponent("frames"),withIntermediateDirectories:true)
  var frames:[[String:Any]]=[]
  for offset in stride(from:0.0,to:length,by:2.0) {
   let capture=try await generator.image(at:CMTime(seconds:start+offset,preferredTimescale:60000))
   guard capture.actualTime.seconds<start+length else {continue}
   let image=capture.image
   let file=String(format:"frames/%06d.jpg",frames.count)
   let rep=NSBitmapImageRep(cgImage:image)
   try rep.representation(using:.jpeg,properties:[.compressionFactor:0.85])!.write(to:root.appendingPathComponent(file))
   frames.append(["id":frames.count,"t":offset,"file":file])
  }
  let session:[String:Any] = ["id":root.lastPathComponent,"title":"Public benchmark evaluation", "startedAt":"2026-11-02T00:00:00Z","duration":length,"frames":frames,"status":"complete"]
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
