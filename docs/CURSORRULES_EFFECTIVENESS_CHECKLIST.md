# Cursorrules Effectiveness Checklist & Guardrails

This checklist is designed to help both developers and users create Cursorrules that are not just technically possible, but also useful, functional, and effective in practice. Use this as a guide for rule creation, review, and maintenance.

---

## 1. Clarity of Purpose
- **Is the rule's goal clearly defined?**
  - What specific risk, behavior, or outcome is it meant to address?
  - Is it a security, quality, compliance, or workflow rule?

## 2. Rule Logic Quality
- **Is the rule logic precise and unambiguous?**
  - Avoid overly broad patterns that may block legitimate actions.
  - Avoid overly narrow patterns that may miss real risks.
- **Is the rule understandable by others?**
  - Use clear naming, comments, and documentation.

## 3. Context Awareness
- **Does the rule consider relevant context?**
  - Project type, file type, user role, history, etc.
- **Can the rule be scoped or targeted?**
  - E.g., only apply to certain files, users, or actions.

## 4. Feedback and User Experience
- **Does the rule provide clear, actionable feedback?**
  - Users should know *why* something was blocked or flagged, and *how* to resolve it.
- **Is the feedback non-intrusive but visible?**
  - Use notifications, tooltips, or logs as appropriate.

## 5. Override and Escalation
- **Is there a safe override mechanism?**
  - Allow users to override with justification, and log these events for review.
- **Is there a process for escalation or review?**
  - Can users request rule changes or report false positives/negatives?

## 6. Testing and Validation
- **Has the rule been tested with real-world data?**
  - Check for both false positives and false negatives.
- **Is there a way to simulate or preview rule effects before enforcing?**

## 7. Maintenance and Evolution
- **Is the rule reviewed regularly?**
  - Remove or update stale rules.
- **Is there a feedback loop for improvement?**
  - Collect user feedback and incident reports to refine rules.

## 8. Documentation and Transparency
- **Is the rule documented for users and admins?**
  - Purpose, logic, scope, and override/escalation process.
- **Are all active rules visible to users?**
  - Transparency builds trust and helps with troubleshooting.

## 9. Ethics and Fairness
- **Does the rule avoid bias or unfair impact?**
  - Consider edge cases and diverse user needs.
- **Is there a process for appeal or review of rule decisions?**

---

## Sample User-Facing "Create a Cursorrule" Wizard/Checklist

When a user creates a custom Cursorrule, prompt them with:

1. **What is the purpose of this rule?**  
   _(e.g., block secrets, enforce naming, prevent dangerous commands)_
2. **What pattern or condition should trigger the rule?**  
   _(e.g., regex, file type, command name)_
3. **What should happen when the rule triggers?**
   - Block the action
   - Warn the user
   - Log for review
   - Other: __________
4. **What message should the user see?**  
   _(e.g., "Blocked: Potential secret detected. Please remove and try again.")_
5. **Should users be able to override this rule?**
   - Yes, with justification
   - No
6. **Who should be notified or able to review overrides?**  
   _(e.g., team lead, security officer)_
7. **How often should this rule be reviewed for effectiveness?**
   - Monthly
   - Quarterly
   - After every incident

---

## Guardrails for Cursorrule Creation

| Guardrail             | Why It Matters                              |
|----------------------|---------------------------------------------|
| Clear purpose        | Prevents confusion and scope creep          |
| Precise logic        | Reduces false positives/negatives           |
| Context awareness    | Avoids over-blocking or under-protection    |
| Actionable feedback  | Helps users resolve issues quickly          |
| Safe override        | Balances safety with productivity           |
| Regular review       | Keeps rules relevant and effective          |
| Transparency         | Builds trust and enables troubleshooting    |
| Ethical consideration| Prevents bias and unfair impact             |

---

**Use this checklist as a foundation for both internal development and user-facing rule creation tools.**
It will also inform the design of the future Create/Edit Cursorrule wizard and UI. 