# Follow-Up Sequences

## After Sending Loom

Use `npm run prospect:message -- prospects/prospect-slug` to generate the next message. Use `npm run prospect:stage -- prospects/prospect-slug sent --channel contact-form` after the first send, swapping `contact-form` for the actual route: `dm`, `linkedin`, `x`, `phone`, `mixed`, `other`, or `email`. Use `followup-1`, `followup-2`, and `followup-3` after each follow-up so `npm run growth:today` stays accurate.

The follow-up cockpit preserves the last real channel first. If the first touch happened on LinkedIn, X, phone, or another manual route, mark the follow-up with that same route unless you intentionally switch channels.

Day 2:

"Worth sending the exact page structure I would use for this?"

Day 5:

"Quick bump. The main thing I would fix first is [specific leak]. If useful, I can send the 7-day sprint scope."

Day 10:

"Closing the loop here. I still think [specific page] is leaving clarity on the table. Happy to revisit if this becomes a priority."

## After Sales Call

Same day:

"Good talking. I put the scope, price, timeline, and next step here: [buyer room]. If you approve, I will start intake."

Day 2:

"Any blocker on the sprint? If it is timing, no issue. If it is scope, I can clarify."

Day 5:

"Should I keep this open for this week, or pause it for later?"

If the call is booked, run:

```bash
npm run prospect:call-booked-prep -- prospects/prospect-slug --time "add call time" --meeting "add meeting link"
```

Replace `add call time` before running call-booked prep. Placeholder call times are blocked.

After the call, run:

```bash
npm run prospect:close-prep -- prospects/prospect-slug --price "$1,000" --payment "add payment link"
```

If the sprint closes, run:

```bash
npm run prospect:stage -- prospects/prospect-slug won --note "Approved sprint"
npm run prospect:convert -- prospects/prospect-slug
```

## After Delivery

Day 1 after handoff:

"Any questions on the handoff Loom? The highest-leverage next move is [specific action]."

Day 5 after handoff:

"If you want me to keep this moving weekly, the Growth Desk would be the right next step."
