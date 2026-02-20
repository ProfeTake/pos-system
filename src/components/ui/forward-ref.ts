import * as React from "react";

// Helper genérico para crear componentes con forwardRef
// Mantiene el displayName para mejorar la depuración.
export function forwardRef<RefType, Props extends object>(
  render: (
    props: Props,
    ref: React.ForwardedRef<RefType>
  ) => React.ReactElement | null,
  displayName?: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component = React.forwardRef<RefType, Props>(render as any);
  if (displayName) {
    Component.displayName = displayName;
  }
  return Component;
}

// Variante especializada para elementos HTML; permite pasar tag dinámico.
export function forwardHtmlRef<
  Element extends HTMLElement,
  Props extends object
>(
  render: (
    props: Props,
    ref: React.ForwardedRef<Element>
  ) => React.ReactElement | null,
  displayName?: string
) {
  return forwardRef<Element, Props>(render, displayName);
}
