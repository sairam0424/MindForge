---
description: Manage the MindForge Sovereign Identity (SOUL.md).
---

<workflow name="MindForge Sovereign Identity Management">
  <metadata>
    <version>8.1.0-IDENTITY</version>
    <pillar>XIX: Sovereign Identity Synthesis</pillar>
    <objective>Manage and evolve the Behavioral Operating System of the agent instance.</objective>
  </metadata>

  <step id="1" name="Context Selection">
    <instructions>
      Ask the user to select an identity management action.
    </instructions>
    <prompt>
      "What would you like to do with the Sovereign Identity? (view/evolve/reset)"
    </prompt>
  </step>

  <step id="2" name="Execution Logic">
    <branch condition="action == 'view'">
      <instructions>
        Read SOUL.md from the root directory and present the Identity, Core Truths, and Decision Engine sections.
      </instructions>
    </branch>

    <branch condition="action == 'evolve'">
      <instructions>
        Trigger the Pillar XIX synthesis engine to analyze recent traces in celestial.db.
      </instructions>
      <command>
        node -e "require('./bin/memory/identity-synthesizer').evolve()"
      </command>
      <output>
        "Sovereign Identity evolved based on the latest execution traces. Decisions and interaction style have been mirrored to your engineering patterns."
      </output>
    </branch>

    <branch condition="action == 'reset'">
      <instructions>
        Restore the SOUL.md to the Grand Blueprint state.
      </instructions>
      <command>
        node -e "require('./bin/memory/identity-synthesizer').bootstrap({ user: 'User', goal: 'Reset Identity' })"
      </command>
    </branch>
  </step>

  <verification>
    <check>Verify existence of SOUL.md in project root.</check>
    <check>Confirm v8.1.0-IDENTITY compliance in instruction hierarchy.</check>
  </verification>
</workflow>