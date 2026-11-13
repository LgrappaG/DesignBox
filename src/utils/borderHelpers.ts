import { BorderStyle, DesignElement } from '../types/schema';

export interface UniformBorderInput {
  borderWidth?: number;
  borderStyle?: BorderStyle;
  borderColor?: string;
}

/** Returns the effective uniform border thickness displayed in quick Style controls. */
export function getDisplayBorderWidth(el: DesignElement): number {
  if (el.type === 'pure_line') {
    return el.borderTopWidth ?? el.borderWidth ?? 2;
  }
  if (el.bordersLinked === false) {
    return Math.max(
      el.borderTopWidth ?? 0,
      el.borderRightWidth ?? 0,
      el.borderBottomWidth ?? 0,
      el.borderLeftWidth ?? 0,
      el.borderWidth ?? 0
    );
  }
  return el.borderWidth ?? 0;
}

/** Returns the effective border style displayed in quick Style controls. */
export function getDisplayBorderStyle(el: DesignElement): BorderStyle {
  if (el.type === 'pure_line') {
    return el.borderTopStyle || el.borderStyle || 'solid';
  }
  return el.borderStyle || el.borderTopStyle || 'solid';
}

/** Returns the effective border color displayed in quick Style controls. */
export function getDisplayBorderColor(el: DesignElement): string {
  if (el.type === 'pure_line') {
    return el.borderTopColor || el.borderColor || '#18181B';
  }
  return el.borderColor || el.borderTopColor || '#E5E5E5';
}

/**
 * Builds a consistent DesignElement patch when editing border properties from
 * the unified Style tab so both uniform and 4-side / pure_line elements update cleanly.
 */
export function buildUniformBorderPatch(
  el: DesignElement,
  input: UniformBorderInput
): Partial<DesignElement> {
  const patch: Partial<DesignElement> = {};

  if (el.type === 'pure_line') {
    patch.bordersLinked = false;
    if (input.borderWidth !== undefined) {
      const w = Math.max(1, Math.min(24, input.borderWidth));
      patch.borderTopWidth = w;
      patch.borderWidth = 0;
    }
    if (input.borderStyle !== undefined) {
      patch.borderTopStyle = input.borderStyle;
      patch.borderStyle = input.borderStyle;
    }
    if (input.borderColor !== undefined) {
      patch.borderTopColor = input.borderColor;
      patch.borderColor = input.borderColor;
    }
    return patch;
  }

  // Changing width or style from the quick uniform control syncs all 4 sides cleanly.
  if (input.borderWidth !== undefined || input.borderStyle !== undefined) {
    const nextWidth =
      input.borderWidth !== undefined
        ? Math.max(0, Math.min(24, input.borderWidth))
        : getDisplayBorderWidth(el);
    const nextStyle = input.borderStyle ?? getDisplayBorderStyle(el);
    const nextColor = input.borderColor ?? getDisplayBorderColor(el);

    patch.bordersLinked = true;
    patch.borderWidth = nextWidth;
    patch.borderStyle = nextStyle;
    patch.borderTopWidth = nextWidth;
    patch.borderRightWidth = nextWidth;
    patch.borderBottomWidth = nextWidth;
    patch.borderLeftWidth = nextWidth;
    patch.borderTopStyle = nextStyle;
    patch.borderRightStyle = nextStyle;
    patch.borderBottomStyle = nextStyle;
    patch.borderLeftStyle = nextStyle;

    // Auto-restore a visible border color if user raises width above 0 while color was transparent.
    if (input.borderWidth !== undefined && nextWidth > 0 && nextColor === 'transparent') {
      patch.borderColor = '#C86D51';
      patch.borderTopColor = '#C86D51';
      patch.borderRightColor = '#C86D51';
      patch.borderBottomColor = '#C86D51';
      patch.borderLeftColor = '#C86D51';
    } else if (input.borderColor !== undefined) {
      patch.borderColor = input.borderColor;
      patch.borderTopColor = input.borderColor;
      patch.borderRightColor = input.borderColor;
      patch.borderBottomColor = input.borderColor;
      patch.borderLeftColor = input.borderColor;
    }
    return patch;
  }

  if (input.borderColor !== undefined) {
    patch.borderColor = input.borderColor;
    if (el.bordersLinked === false) {
      // Preserve custom 4-side widths while applying the updated color to active sides.
      patch.borderTopColor = input.borderColor;
      patch.borderRightColor = input.borderColor;
      patch.borderBottomColor = input.borderColor;
      patch.borderLeftColor = input.borderColor;
    } else if (input.borderColor !== 'transparent' && (el.borderWidth ?? 0) === 0) {
      patch.borderWidth = 1;
      patch.borderTopWidth = 1;
      patch.borderRightWidth = 1;
      patch.borderBottomWidth = 1;
      patch.borderLeftWidth = 1;
    }
  }

  return patch;
}

