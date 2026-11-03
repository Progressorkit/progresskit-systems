from pathlib import Path
import subprocess,os,json,hashlib,tempfile,shutil,datetime,xml.etree.ElementTree as ET
repo=Path('/home/pawe/Pulpit/Projekty It/ProgressKit Mail')
out=Path(__file__).resolve().parent
stage=Path(tempfile.mkdtemp(prefix='pkmail-commercial-20261102-',dir='/tmp'))
isolated=stage/'repo';isolated.mkdir();(isolated/'.git').symlink_to(repo/'.git',target_is_directory=True)
(isolated/'server').mkdir();(isolated/'server/src').symlink_to(repo/'server/src',target_is_directory=True)
(isolated/'android').symlink_to(repo/'android',target_is_directory=True)
for name in ['work','xdg-data','xdg-config','xdg-cache','xdg-runtime','dotnet-home']:(stage/name).mkdir(mode=0o700)
env=dict(os.environ)
for key in list(env):
 low=key.lower()
 if low.startswith(('progresskit_','pkmail_','connectionstrings','google_','firebase','azure_')):env.pop(key,None)
env.update({'TMPDIR':str(stage/'work'),'XDG_DATA_HOME':str(stage/'xdg-data'),'XDG_CONFIG_HOME':str(stage/'xdg-config'),'XDG_CACHE_HOME':str(stage/'xdg-cache'),'XDG_RUNTIME_DIR':str(stage/'xdg-runtime'),'DBUS_SESSION_BUS_ADDRESS':f'unix:path={stage}/no-personal-bus','DOTNET_CLI_HOME':str(stage/'dotnet-home'),'DOTNET_NOLOGO':'1','DOTNET_SKIP_FIRST_TIME_EXPERIENCE':'1','DOTNET_CLI_TELEMETRY_OPTOUT':'1','AVALONIA_TELEMETRY_OPTOUT':'1','ASPNETCORE_ENVIRONMENT':'Testing','HTTP_PROXY':'','HTTPS_PROXY':'','ALL_PROXY':'','NO_PROXY':'localhost,127.0.0.1,::1','PYTHONDONTWRITEBYTECODE':'1'})
suites=[('core','windows/tests/ProgressKit.Mail.Core.Tests/bin/Release/net10.0','ProgressKit.Mail.Core.Tests.dll'),('linux','windows/tests/ProgressKit.Mail.Linux.Tests/bin/Release/net10.0','ProgressKit.Mail.Linux.Tests.dll'),('linux-security','windows/tests/ProgressKit.Mail.Linux.Security.Tests/bin/Release/net10.0','ProgressKit.Mail.Linux.Security.Tests.dll'),('server-no-db','server/tests/ProgressKit.Mail.UnitTests/bin/Release/net10.0','ProgressKit.Mail.UnitTests.dll')]
state=lambda:hashlib.sha256(subprocess.check_output(['git','-C',str(repo),'status','--porcelain','-uall'])).hexdigest()
before=state();results=[]
report={'started':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceHEAD':subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip(),'stage':str(stage),'isolation':'Copies of already built Release assemblies; source checks read original source via symlinks. Private XDG/TMP/DOTNET_CLI_HOME; no personal D-Bus; production credential/config environment removed. HOME unchanged. No build, restore, installation, account, external mail, DB or migrations.','suites':results}
for name,relative,assembly in suites:
 src=repo/relative;dest=isolated/'tests'/name
 shutil.copytree(src,dest)
 assembly_file=dest/assembly;identity=hashlib.sha256(assembly_file.read_bytes()).hexdigest()
 result_dir=out/'tests'/name;result_dir.mkdir(parents=True,exist_ok=True)
 cmd=['dotnet','vstest',str(assembly_file),f'--ResultsDirectory:{result_dir}',f'--Logger:trx;LogFileName={name}.trx']
 started=datetime.datetime.now(datetime.timezone.utc).isoformat()
 try:
  proc=subprocess.run(cmd,cwd=isolated,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=150)
  log=proc.stdout;code=proc.returncode
 except subprocess.TimeoutExpired as error:
  log=(error.stdout or b'').decode() if isinstance(error.stdout,bytes) else error.stdout or '';code=124
 (result_dir/'runner.log').write_text(log)
 entry={'suite':name,'started':started,'assemblySource':relative+'/'+assembly,'assemblySHA256':identity,'command':cmd,'exitCode':code,'newRun':True}
 trx=result_dir/(name+'.trx')
 if trx.is_file():
  root=ET.parse(trx).getroot();ns={'t':'http://microsoft.com/schemas/VisualStudio/TeamTest/2010'};c=root.find('.//t:Counters',ns).attrib
  entry.update(total=int(c['total']),executed=int(c['executed']),passed=int(c['passed']),failed=int(c['failed']),notExecuted=int(c['total'])-int(c['executed']),status='BLOCKED' if int(c['executed'])==0 and ('Permission denied' in log or 'SocketException' in log) else 'PASS' if code==0 and int(c['failed'])==0 else 'FAIL')
 else:entry.update(status='BLOCKED' if 'Permission denied' in log or 'SocketException' in log else 'FAIL',reason='See private runner log; no TRX means no test PASS claim')
 results.append(entry);(out/'fresh-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(name,entry['status'],entry.get('passed'),entry.get('failed'),entry.get('notExecuted'),flush=True)
 if entry['status']=='BLOCKED':break
report.update(finished=datetime.datetime.now(datetime.timezone.utc).isoformat(),siblingGitStatusUnchanged=before==state())
(out/'fresh-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
