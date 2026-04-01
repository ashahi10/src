/** RFC §6.3: high-confidence memory requires valid evidence links. */
export const HIGH_CONFIDENCE_MIN = 0.7
/** Stored confidence is capped below HIGH_CONFIDENCE_MIN when there is no evidence. */
export const MAX_CONFIDENCE_WITHOUT_EVIDENCE = 0.69
