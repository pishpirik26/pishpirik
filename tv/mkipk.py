import io, json, os, tarfile, time, sys
# Builds the .ipk the same way LG's ares-package does: an ar archive with
# debian-binary, control.tar.gz (control) and data.tar.gz (usr/palm/applications/<id>, usr/palm/packages/<id>).
APP = sys.argv[1] if len(sys.argv) > 1 else 'app'
OUT = sys.argv[2] if len(sys.argv) > 2 else None
info = json.load(open(os.path.join(APP, 'appinfo.json')))
aid, ver = info['id'], info['version']
now = int(time.time())

def add_dir(tar, name):
    ti = tarfile.TarInfo(name); ti.type = tarfile.DIRTYPE; ti.mode = 0o755; ti.mtime = now
    ti.uid = ti.gid = 0; ti.uname = ti.gname = ''; tar.addfile(ti)

def add_bytes(tar, name, data, mode=0o644):
    ti = tarfile.TarInfo(name); ti.size = len(data); ti.mode = mode; ti.mtime = now
    ti.uid = ti.gid = 0; ti.uname = ti.gname = ''; tar.addfile(ti, io.BytesIO(data))

files = sorted(f for f in os.listdir(APP) if os.path.isfile(os.path.join(APP, f)))
pkginfo = (json.dumps({"id": aid, "version": ver, "app": aid}, indent=2) + "\n").encode()

data_buf = io.BytesIO(); size = 0
with tarfile.open(fileobj=data_buf, mode='w:gz', format=tarfile.USTAR_FORMAT) as t:
    for d in ['usr', 'usr/palm', 'usr/palm/applications', f'usr/palm/applications/{aid}']:
        add_dir(t, d)
    for f in files:
        b = open(os.path.join(APP, f), 'rb').read(); size += len(b)
        add_bytes(t, f'usr/palm/applications/{aid}/{f}', b)
    for d in ['usr/palm/packages', f'usr/palm/packages/{aid}']:
        add_dir(t, d)
    add_bytes(t, f'usr/palm/packages/{aid}/packageinfo.json', pkginfo); size += len(pkginfo)
data_tgz = data_buf.getvalue()

control = "\n".join([
    f"Package: {aid}", f"Version: {ver}", "Section: misc", "Priority: optional", "Architecture: all",
    f"Installed-Size: {size}", "Maintainer: N/A <nobody@example.com>", "Description: This is a webOS application.",
    "webOS-Package-Format-Version: 2", "webOS-Packager-Version: x.y.x"]) + "\n"
ctl_buf = io.BytesIO()
with tarfile.open(fileobj=ctl_buf, mode='w:gz', format=tarfile.USTAR_FORMAT) as t:
    add_bytes(t, 'control', control.encode())
ctl_tgz = ctl_buf.getvalue()

def ar_member(name, data):
    hdr = (name.ljust(16) + str(now).ljust(12) + "0".ljust(6) + "0".ljust(6) + "100644".ljust(8) + str(len(data)).ljust(10) + "`\n").encode()
    assert len(hdr) == 60
    return hdr + data + (b"\n" if len(data) % 2 else b"")

out = OUT or f"{aid}_{ver}_all.ipk"
with open(out, 'wb') as f:
    f.write(b"!<arch>\n")
    f.write(ar_member("debian-binary", b"2.0\n"))
    f.write(ar_member("control.tar.gz", ctl_tgz))
    f.write(ar_member("data.tar.gz", data_tgz))
print(out, os.path.getsize(out), 'bytes; files:', files)
