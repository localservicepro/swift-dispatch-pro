

## Remove Magic Link Login from Customer Portal

### Change

In `src/pages/PortalLogin.tsx`, remove the `Tabs` wrapper and the Magic Link tab content entirely. Keep only the PIN Code login form as the sole authentication method.

### What will be removed
- The `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` wrapper structure
- The Magic Link form, `emailSent` state, `handleSendMagicLink` function
- The `email` state and related imports (`Mail`, `Send`, `CheckCircle`)
- The card description referencing magic links

### What stays
- PIN Code login form (rendered directly without tabs)
- All PIN verification logic unchanged
- The help/support section at the bottom

### File
- `src/pages/PortalLogin.tsx`

