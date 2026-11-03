from pathlib import Path
import os,subprocess,sys,json,tempfile,secrets,hashlib,xml.etree.ElementTree as ET
repo=Path('/home/pawe/Pulpit/Projekty It/ProgressKit Mail');out=Path(__file__).resolve().parent
base=Path(json.loads((out/'fresh-tests.json').read_text())['stage'])/'repo/tests'

def run_vstest(suite,assembly,category,env):
 dest=out/'native-tests'/suite;dest.mkdir(parents=True,exist_ok=True)
 command=['dotnet','vstest',str(assembly),'--TestCaseFilter:'+category,'--ResultsDirectory:'+str(dest),'--Logger:trx;LogFileName='+suite+'.trx']
 result=subprocess.run(command,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=120)
 (dest/'runner.log').write_text(result.stdout)
 return result.returncode

if len(sys.argv)>1 and sys.argv[1]=='--keyring':
 stage=Path(os.environ['PKMAIL_PREFLIGHT_NATIVE_STAGE']);env=dict(os.environ)
 private=stage/'work/keyring';private.mkdir(parents=True,exist_ok=True);env['PKMAIL_TEST_SECRET_SERVICE_DIRECTORY']=str(private)
 unavailable=dict(env,PKMAIL_TEST_SECRET_SERVICE_MODE='unavailable',DBUS_SESSION_BUS_ADDRESS='unix:path='+str(stage/'nonexistent-private-bus'))
 codes=[run_vstest('keyring-unavailable',base/'linux-security/ProgressKit.Mail.Linux.Security.Tests.dll','Category=SecretServiceIntegration',unavailable)]
 (stage/'control').mkdir()
 with (stage/'daemon-output.private').open('w') as log:
  daemon=subprocess.run(['gnome-keyring-daemon','--unlock','--components=secrets','--control-directory',str(stage/'control')],input=secrets.token_hex(32),env=env,stdout=log,stderr=log,text=True,timeout=15)
 if daemon.returncode:raise RuntimeError('Private temporary keyring daemon failed; no personal keyring used')
 for mode in ['unlocked','restart']:
  codes.append(run_vstest('keyring-'+mode,base/'linux-security/ProgressKit.Mail.Linux.Security.Tests.dll','Category=SecretServiceIntegration',dict(env,PKMAIL_TEST_SECRET_SERVICE_MODE=mode)))
 locked=subprocess.run(['gdbus','call','--session','--dest','org.freedesktop.secrets','--object-path','/org/freedesktop/secrets','--method','org.freedesktop.Secret.Service.Lock',"['/org/freedesktop/secrets/collection/login']"],env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=10)
 if locked.returncode:raise RuntimeError('Could not lock the owned synthetic keyring')
 codes.append(run_vstest('keyring-locked',base/'linux-security/ProgressKit.Mail.Linux.Security.Tests.dll','Category=SecretServiceIntegration',dict(env,PKMAIL_TEST_SECRET_SERVICE_MODE='locked')))
 (out/'native-keyring-codes.json').write_text(json.dumps(codes));raise SystemExit(0 if all(c==0 for c in codes) else 1)

stage=Path(tempfile.mkdtemp(prefix='pkmail-native-preflight-',dir='/tmp'));env=dict(os.environ)
for key in list(env):
 if key.lower().startswith(('progresskit_','pkmail_','connectionstrings','google_','firebase','azure_')):env.pop(key,None)
for key,directory in [('TMPDIR','work'),('XDG_DATA_HOME','data'),('XDG_CONFIG_HOME','config'),('XDG_CACHE_HOME','cache'),('XDG_RUNTIME_DIR','runtime'),('DOTNET_CLI_HOME','cli')]:
 p=stage/directory;p.mkdir(mode=0o700);env[key]=str(p)
env.update({'PKMAIL_PREFLIGHT_NATIVE_STAGE':str(stage),'DBUS_SESSION_BUS_ADDRESS':'unix:path='+str(stage/'no-personal-bus'),'DOTNET_CLI_TELEMETRY_OPTOUT':'1','DOTNET_NOLOGO':'1','DOTNET_SKIP_FIRST_TIME_EXPERIENCE':'1','AVALONIA_TELEMETRY_OPTOUT':'1','HTTP_PROXY':'','HTTPS_PROXY':'','ALL_PROXY':'','NO_PROXY':'127.0.0.1,localhost,::1'})
# Reuse original ephemeral CA/CRL fixture verbatim, replacing only project build/test
# invocation with the identical existing prebuilt Core assembly. No TLS policy changes.
original=repo/'windows/linux/local-transport-runner.py';source=original.read_text()
start=source.index('            result = subprocess.run(["dotnet", "test",')
end=source.index('\n            (results / "fixture-summary.json")',start)
replacement='            result = subprocess.run(["dotnet", "vstest", '+repr(str(base/'core/ProgressKit.Mail.Core.Tests.dll'))+', "--TestCaseFilter:FullyQualifiedName~LocalProtocolIntegrationTests", "--Logger:trx;LogFileName=trusted-loopback.trx", "--ResultsDirectory:"+str(results)], env=environment)'
runner=stage/'loopback-existing-assembly.py';runner.write_text(source[:start]+replacement+source[end:])
loopback=out/'native-tests/trusted-loopback';loopback.mkdir(parents=True,exist_ok=True)
r=subprocess.run(['python3',str(runner),str(repo),str(loopback)],env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=150);(loopback/'runner.log').write_text(r.stdout)
print('trusted-loopback exit',r.returncode,flush=True)
keyring=subprocess.run(['dbus-run-session','--','python3',str(Path(__file__).resolve()),'--keyring'],env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=150);(out/'native-keyring-runner.log').write_text(keyring.stdout)
print('isolated-keyring exit',keyring.returncode,flush=True)
# No activation directories: notification tests cannot start the user's daemon.
bus=stage/'notifications.conf';bus.write_text('''<!DOCTYPE busconfig PUBLIC "-//freedesktop//DTD D-Bus Bus Configuration 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/busconfig.dtd"><busconfig><type>session</type><listen>unix:tmpdir=/tmp</listen><auth>EXTERNAL</auth><policy context="default"><allow send_destination="*" eavesdrop="true"/><allow eavesdrop="true"/><allow own="*"/></policy></busconfig>''')
notification_dir=out/'native-tests/notifications';notification_dir.mkdir(parents=True,exist_ok=True)
notify_env=dict(env,PKMAIL_TEST_PRIVATE_NOTIFICATION_BUS='1')
command=['dbus-run-session','--config-file',str(bus),'--','dotnet','vstest',str(base/'linux/ProgressKit.Mail.Linux.Tests.dll'),'--TestCaseFilter:Category=DesktopNotificationIntegration','--ResultsDirectory:'+str(notification_dir),'--Logger:trx;LogFileName=notifications.trx']
n=subprocess.run(command,env=notify_env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=120);(notification_dir/'runner.log').write_text(n.stdout)
print('isolated-notifications exit',n.returncode,flush=True)
results=[]
for p in sorted((out/'native-tests').glob('*/*.trx')):
 root=ET.parse(p).getroot();c=root.find('.//{http://microsoft.com/schemas/VisualStudio/TeamTest/2010}Counters').attrib
 results.append({'path':str(p.relative_to(out)),'passed':int(c['passed']),'failed':int(c['failed']),'notExecuted':int(c['total'])-int(c['executed'])})
(out/'fresh-native-tests.json').write_text(json.dumps({'newRun':True,'stage':str(stage),'fixtureSourceSHA256':hashlib.sha256(original.read_bytes()).hexdigest(),'fixtureAdaptation':'Only test invocation changed to prebuilt Core DLL; original ephemeral CA/CRL generation and TLS verification unchanged. No private profiles or global trust used.','loopbackExitCode':r.returncode,'keyringExitCode':keyring.returncode,'notificationExitCode':n.returncode,'results':results},indent=2));print(results)
