// Operator policy: every existing and newly created account currently receives
// complimentary Pro access. This is an entitlement, never a fabricated payment
// or a funded AI allowance. External API costs still use ai-budget reservations.
export const accountAccess=()=>({plan:'pro',mode:'complimentary',chat:true,createFromSources:true,automaticBilling:false});
