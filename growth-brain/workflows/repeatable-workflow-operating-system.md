# Retired: Repeatable Workflow Operating System

> **Status: Retired historical reference.** This former multi-service operating model is not an active TinyStudio offer or client lifecycle. Use `human-review-service-engine.md` for the bounded sprint.

## Goal

Turn every TinyStudio service line into a repeatable improvement loop before it becomes a package, dashboard, agent, or retainer promise.

This is the default method for SEO, paid ads, email/SMS, CRO, content, social, analytics, reputation, automation, and any new marketing requirement a client brings in.

## Rule

Start with the real bottleneck, not the tool. Build the smallest useful system, test it against real output, feed the result back, and only scale what proved useful.

## Canonical 10-Step Loop

| # | What To Do | How To Think About It | Starting From Scratch | Scaling With Existing Data |
|---:|---|---|---|---|
| 1 | Find the real bottleneck | Start with friction, not tools. The real problem is usually one level deeper. | Write every task in the process. Find the one that takes the most time, breaks most often, or produces inconsistent results. Start there. | Look where the process slows down, handoffs break, quality drops, or manual intervention is needed every time. |
| 2 | Study the gap | The gap is not "nothing exists." It is "what exists does not work for this use case." | Pick 3-5 solutions. Write exactly where each one fails for this use case. The failure pattern is the entry point. | Map where tools already tried broke in the real workflow, not in theory. That failure pattern is the gap. |
| 3 | Draw inspiration from four places | Do not copy AI tools. Combine domain expertise, the market, other builders' logic, and first-party data. | Start with what is already deeply known. Then borrow logic, not products, from other builders. | Own content, campaigns, and results are the best source. Start there before looking outside. |
| 4 | Extract the principle | Strip the build. Keep the rule. | Write: "The core insight is ___." Test whether it actually applies. Adapt, do not copy. | Look at what is working in the data and ask why. Name the principle, then build around it. |
| 5 | Design the flow | Think in sequence, not tools. Logic first. | Write: trigger -> step 1 -> step 2 -> output. Mark human decisions clearly. Keep it simple. | Map the current process. Identify what is consistent enough for AI and what still needs human judgment. |
| 6 | Build the system | Prove the logic with the smallest version. | Build one piece: one skill, one agent, one module, or one checklist. Test before connecting anything. | Start with the most repeatable part of the existing process. Build that first, then expand. |
| 7 | Delegate execution deliberately | Decide before building what AI does, how it does it, and where check-ins or stops are needed. | Define what stays manual, what needs check-in, what runs automatically, and how work can split into parallel chunks. | Turn the process into execution chunks. Use AI as the project manager only where the existing process is clear enough. |
| 8 | Test | Do not ask "did it run?" Ask "would I use this?" | Define what good looks like. Test with real data. Identify whether failure came from input, logic, or execution. | Compare output to the best past work. The gap shows exactly what to fix. |
| 9 | Feed results back | What works becomes the new baseline. | Save best outputs as references. Build a review loop early. | Feed performance data back. Replace old patterns. Update the system continuously. |
| 10 | Iterate | Find the winners. | Take the best output and ask what made it work. Make that the new standard. Adjust one variable at a time toward more of what worked. | Check for patterns in what wins. Double down on the highest-performing version and replace underperforming variants with what the data already proved. |

## TinyStudio Application

Every client workflow must produce these artifacts in its own folder:

- Bottleneck: the specific friction being solved this week.
- Gap: why the existing site, channel, tool, agency, or process is not enough.
- Principle: the reusable rule we are applying.
- Flow: trigger, steps, human approval points, output, and next measurement.
- System: the smallest workflow, checklist, script, dashboard, or deliverable needed.
- Test: what "good" means, using real client or owned-product data.
- Feedback: saved learning in the client brain.
- Iteration: one next variable to improve.

## Client Folder Rule

Each client stays isolated:

- `clients/client-slug/brain/` holds source context and saved learnings.
- `clients/client-slug/research/` holds gap research, competitor notes, and channel evidence.
- `clients/client-slug/quality/` holds proof, channel readiness, conversion, and acceptance gates.
- `clients/client-slug/deliverables/` holds shipped work and handoffs.
- `clients/client-slug/reports/` holds weekly/monthly value proof.
- `clients/client-slug/ops/weekly-runs/` holds each autonomous weekly run.

Do not copy proof, claims, metrics, dashboards, or conclusions between client folders.

## Weekly Use

For every onboarded client, the weekly loop is:

1. Find this week's bottleneck from the report, dashboard, analytics, client pulse, or manual delivery friction.
2. Study the gap against the client's current workflow and 3-5 relevant alternatives.
3. Extract the principle behind the strongest fix.
4. Design the smallest useful flow for the week.
5. Build or hand off one improvement.
6. Test it against the value proof gates.
7. Feed the result back into the client brain.
8. Pick one next iteration.

This is how we provide outsized value without pretending a dashboard is the value. The value is the measured improvement loop.

## Automation Boundary

Automation may draft, score, summarize, compare, prepare, and refresh dashboards. It must not:

- send client messages automatically
- approve proof claims automatically
- publish client assets automatically
- change ad budgets automatically
- claim revenue, rankings, ROAS, or retention outcomes without proof
- mix one client's proof or data into another client's folder

## Done State

A workflow is repeatable only when it has:

- clear input
- clear bottleneck
- documented gap
- named principle
- ordered flow
- smallest working system
- human approval gate
- real test with real data
- saved learning
- next iteration

If any item is missing, keep it in setup mode and do not sell it as an autonomous service line yet.
