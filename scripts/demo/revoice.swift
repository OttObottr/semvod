// Native macOS video processing of our own approved media; no screen or microphone access.
import Foundation
import AVFoundation
import AppKit
import QuartzCore

struct Segment:Decodable{let id:String;let file:String;let text:String}
@main struct Revoice{
 static func main() async throws{
  let root=URL(fileURLWithPath:FileManager.default.currentDirectoryPath)
  let segments=try JSONDecoder().decode([Segment].self,from:Data(contentsOf:root.appendingPathComponent(".semvod/demo/voice-openai/manifest.json")))
  let oldLengths:[Double]=[10.409524,16.164717,20.299909,14.232653,19.819456,22.073832,25.570204,12.136054]
  let original=AVURLAsset(url:root.appendingPathComponent(".semvod/demo/semvod-demo.mp4"))
  let source=try await original.loadTracks(withMediaType:.video)[0]
  let composition=AVMutableComposition()
  let video=composition.addMutableTrack(withMediaType:.video,preferredTrackID:kCMPersistentTrackID_Invalid)!
  let audio=composition.addMutableTrack(withMediaType:.audio,preferredTrackID:kCMPersistentTrackID_Invalid)!
  var previous=CMTime.zero,cursor=CMTime.zero,codexStart=0.0,codexEnd=0.0
  var timings:[[String:Any]]=[]
  for (index,segment) in segments.enumerated(){
   let voice=AVURLAsset(url:root.appendingPathComponent(segment.file))
   let voiceDuration=try await voice.load(.duration)
   let length=CMTimeAdd(voiceDuration,CMTime(seconds:0.5,preferredTimescale:60000))
   let oldLength=CMTime(seconds:oldLengths[index],preferredTimescale:60000)
   try video.insertTimeRange(CMTimeRange(start:previous,duration:oldLength),of:source,at:cursor)
   video.scaleTimeRange(CMTimeRange(start:cursor,duration:oldLength),toDuration:length)
   let voiceTrack=try await voice.loadTracks(withMediaType:.audio)[0]
   try audio.insertTimeRange(CMTimeRange(start:.zero,duration:voiceDuration),of:voiceTrack,at:cursor)
   timings.append(["id":segment.id,"start":cursor.seconds,"voiceDuration":voiceDuration.seconds,"duration":length.seconds])
   if segment.id=="codex"{codexStart=cursor.seconds;codexEnd=CMTimeAdd(cursor,length).seconds}
   cursor=CMTimeAdd(cursor,length);previous=CMTimeAdd(previous,oldLength)
  }
  guard cursor.seconds<179 else{throw NSError(domain:"Demo exceeds three minutes",code:1)}
  let videoComposition=AVMutableVideoComposition()
  videoComposition.renderSize=CGSize(width:1920,height:1080);videoComposition.frameDuration=CMTime(value:1,timescale:30)
  let instruction=AVMutableVideoCompositionInstruction();instruction.timeRange=CMTimeRange(start:.zero,duration:cursor)
  instruction.layerInstructions=[AVMutableVideoCompositionLayerInstruction(assetTrack:video)];videoComposition.instructions=[instruction]
  let parent=CALayer();parent.frame=CGRect(x:0,y:0,width:1920,height:1080);parent.contents=NSImage(contentsOf:root.appendingPathComponent(".semvod/demo/cards/intro.png"))!.cgImage(forProposedRect:nil,context:nil,hints:nil)
  let footage=CALayer();footage.frame=parent.bounds;parent.addSublayer(footage)
  let card=CALayer();card.frame=parent.bounds;card.opacity=0
  card.contents=NSImage(contentsOf:root.appendingPathComponent(".semvod/demo/cards/codex.png"))!.cgImage(forProposedRect:nil,context:nil,hints:nil)
  let appear=CAKeyframeAnimation(keyPath:"opacity");appear.values=[0,1,0,0];appear.keyTimes=[0,NSNumber(value:codexStart/cursor.seconds),NSNumber(value:codexEnd/cursor.seconds),1]
  appear.calculationMode = .discrete;appear.duration=cursor.seconds;appear.beginTime=AVCoreAnimationBeginTimeAtZero;appear.isRemovedOnCompletion=false;appear.fillMode = .both
  card.add(appear,forKey:"updated-test-count");parent.addSublayer(card)
  let disclosure=CALayer();disclosure.frame=parent.bounds;disclosure.contents=NSImage(contentsOf:root.appendingPathComponent(".semvod/demo/cards/disclosure.png"))!.cgImage(forProposedRect:nil,context:nil,hints:nil);parent.addSublayer(disclosure)
  videoComposition.animationTool=AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer:footage,in:parent)
  let output=root.appendingPathComponent(".semvod/demo/semvod-demo-v2.mp4")
  if FileManager.default.fileExists(atPath:output.path){try FileManager.default.removeItem(at:output)}
  let exporter=AVAssetExportSession(asset:composition,presetName:AVAssetExportPreset1920x1080)!
  exporter.videoComposition=videoComposition;exporter.shouldOptimizeForNetworkUse=true
  try await exporter.export(to:output,as:.mp4)
  try JSONSerialization.data(withJSONObject:timings,options:.prettyPrinted).write(to:root.appendingPathComponent(".semvod/demo/voice-openai/timings.json"))
  print("Exported replacement demo: \(cursor.seconds) seconds. No system voice or microphone audio used.")
 }
}
