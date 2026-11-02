"""Fetch preregistered benchmark members with stdlib HTTP ranges; never execute dataset code."""
import hashlib, io, json, pathlib, re, urllib.request, zipfile, zlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / '.semvod/perception-v1'
OUT.mkdir(parents=True, exist_ok=True)
PROTOCOL = json.loads((ROOT/'docs/verification/perception-v1/protocol.json').read_text())
BASE = 'https://storage.googleapis.com/dm-perception-test/'
def get(url):
    with urllib.request.urlopen(url, timeout=60) as r: return r.read()
class RemoteZip(io.RawIOBase):
    def __init__(self, url):
        self.url, self.pos, self.bytes = url, 0, 0
        with urllib.request.urlopen(urllib.request.Request(url, method='HEAD'), timeout=60) as r:
            self.size, self.etag = int(r.headers['Content-Length']), r.headers['ETag']
    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos
    def seek(self, offset, whence=0):
        self.pos = offset if whence==0 else self.pos+offset if whence==1 else self.size+offset
        if self.pos < 0: raise ValueError('Negative seek')
        return self.pos
    def read(self, n=-1):
        n = min(self.size-self.pos, n if n>=0 else self.size-self.pos)
        if n<=0: return b''
        if n>256_000_000: raise ValueError('Unexpected archive read size')
        req = urllib.request.Request(self.url, headers={'Range':f'bytes={self.pos}-{self.pos+n-1}', 'If-Match':self.etag})
        with urllib.request.urlopen(req, timeout=90) as r:
            if r.status!=206: raise ValueError('Server did not honor byte range')
            b=r.read(n+1)
        if len(b)!=n: raise ValueError('Incomplete/oversized range')
        self.pos+=n; self.bytes+=n
        return b
# Download public annotations as inert data; do not display question/answer content.
for name, rel in [('annotations.zip','zip_data/mc_question_valid_annotations.zip'),('cuts.json','misc/cut_frame_mapping_valid.json')]:
    p=OUT/name
    if not p.exists(): p.write_bytes(get(BASE+rel))
with zipfile.ZipFile(OUT/'annotations.zip') as z:
    entries=[n for n in z.namelist() if n.endswith('.json')]
    print('Annotation JSON members:', entries)
    if len(entries)!=1: raise ValueError('Unexpected annotations archive')
    (OUT/'annotations.json').write_bytes(z.read(entries[0]))
remote=RemoteZip(BASE+'zip_data/valid_videos.zip')
receipt={'url':remote.url,'etag':remote.etag,'archiveBytes':remote.size,'files':[]}
with zipfile.ZipFile(remote) as z:
    lookup={pathlib.PurePosixPath(i.filename).stem:i for i in z.infolist() if i.filename.endswith('.mp4')}
    for name in PROTOCOL['selection']['ids']:
        if not re.fullmatch(r'video_\d+',name): raise ValueError('Unsafe video ID')
        entry=lookup[name]; p=OUT/(name+'.mp4')
        if entry.file_size>256_000_000: raise ValueError('Selected video exceeds fixed download envelope; do not replace it')
        if not p.exists(): p.write_bytes(z.read(entry))  # zipfile verifies the member CRC.
        b=p.read_bytes()
        if len(b)!=entry.file_size or zlib.crc32(b)!=entry.CRC: raise ValueError('Saved video size mismatch')
        receipt['files'].append({'id':name,'member':entry.filename,'bytes':len(b),'crc32':entry.CRC,'sha256':hashlib.sha256(b).hexdigest()})
        print('Fetched',name,len(b),'bytes',flush=True)
receipt['networkBytesThisRun']=remote.bytes
(OUT/'source-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print('Network bytes:',remote.bytes)
