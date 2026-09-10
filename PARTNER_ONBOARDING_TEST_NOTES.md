# Partner Onboarding Controlled Test Notes

- A clearly synthetic invitation and partner account were created for the UI-only verification using the `INTERNAL_PARTNER_UI_QA_89891aed0f` marker.
- A first-time partner login entered the embedded **Business setup** wizard in the existing Partner Dashboard, with all non-setup tabs disabled until completion.
- Company setup persisted, moved the status to **PARTIALLY CONFIGURED**, and advanced the wizard to Solar panels.
- The visible **Save & Continue Later** control was repaired so it persists the current step and keeps the partner on that step. A synthetic inactive panel was saved, appeared as editable, and left the workspace in **PARTIALLY CONFIGURED** state with monetary pricing inactive.
- No real partner, customer, lead, production catalog, communication credential, or communication control was modified by this visual test.
- The final exact **375×812** regression passed with no horizontal document overflow, fitting inputs and actionable controls, visible setup guidance, locked incomplete tabs, persisted Save & Continue Later behavior, and no raw internal control markup. The screenshot contains synthetic test-only catalog labels captured before cleanup; a subsequent read-only audit confirmed all synthetic partner, agency, panel, and inverter data was removed.
